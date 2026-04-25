---
slug: concepts/tenancy
lang: de
title: Tenancy & Datenisolation
summary: Wie Philly jeden Datensatz auf eine Organisation scoped und zur Compile-Zeit beweist, dass keine API-Route über Tenants leaken kann.
tags: [concepts, tenancy, security, multi-tenant, organization]
related: [onboarding/create-organization, concepts/roles, concepts/gdpr, features/audit]
updated: 2026-04-25
---

# Tenancy & Datenisolation

Philly ist multi-tenant by design. Jede Organisation ist ein
Tenant; jeder Datensatz trägt die Organisations-ID; jede
API-Route filtert danach. Zwei nicht verwandte Unternehmen, die
sich für Philly anmelden, sehen niemals die Daten des anderen.

Diese Seite erklärt die Mechanik — nützlich, wenn du Admin, DPO
oder Security-Reviewer bist.

## Die Datenebene

Die meisten Tabellen in der Datenbank haben eine `organizationId`-
Spalte. Einige, die das nicht haben (`Reservation`,
`OpenHouseVisit`, `Message`, `ESignature`) werden über eine
Eltern-Tabelle gescoped, die sie hat — z.B. ist eine
`Reservation` an einen `Room` angehängt, und der `Room` trägt
die `organizationId`.

So oder so enthält jede Query, die die Anwendung für
org-gescopete Daten macht, einen `organizationId`-Filter. Es gibt
keine "finde diesen Kontakt nur per ID"-Queries — sie sind immer
"finde diesen Kontakt per ID UND in dieser Organisation".

## Die Auth-Ebene

Jede API-Route beginnt mit einem von drei Guards:

```ts
const scope = await requireScope()       // jeder authentifizierte Benutzer
const scope = await requireRole(['admin']) // nur Admin
const scope = await requireSection('deals', ['admin', 'manager'])
```

Jeder gibt ein `AuthScope`-Objekt zurück, das unter anderem die
`organizationId` des Aufrufers enthält. Routen verwenden diesen
Wert dann in ihren Prisma-Queries:

```ts
const contacts = await prisma.contact.findMany({
  where: { organizationId: scope.organizationId, ... }
})
```

Wenn eine Route das Scoping vergisst, würde sie die Daten eines
anderen Tenants offenlegen. Diese Klasse von Bug ist der Grund,
warum wir...

## Die Audit-Ebene

`scripts/audit-tenant-isolation.ts` durchläuft jede
`app/api/**/route.ts`-Datei und flaggt jede Route, die:

- Kein `requireScope` / `requireRole` / `requireSection` aufruft
- Oder Prisma queryt, aber niemals `organizationId` referenziert

Das Skript wird über `npm run audit:tenant` ausgeführt. Es exits
0, wenn jede Route gescoped ist, und nicht-null mit einer Liste
von Übertretern, wenn nicht. Der aktuelle Stand ist **sauber** —
jede Route ist entweder gescoped oder steht in der expliziten
`EXEMPT_PATHS`-Liste mit einer einzeiligen Begründung (z.B.
`/api/log-error` ist eine öffentliche Fehler-Senke, `/api/cron/*`
verwendet Bearer-Token-Auth).

Die Audit läuft bei jedem CI-Build über
`.github/workflows/security.yml`. Eine neue Route, die das
Scoping vergisst, lässt den Build fehlschlagen.

## Was, wenn ein Benutzer zu mehreren Organisationen gehört?

Heute, nein. `User.organizationId` ist 1:1 — ein Benutzer gehört
zu genau einer Organisation. Das Datenmodell erwartet dies; der
Auth-Flow erzwingt es.

Wenn du legitim Cross-Org-Zugriff brauchst (z.B. ein Berater, der
mit mehreren Kunden arbeitet), ist der Workaround für jetzt
separate Benutzerkonten mit unterschiedlichen E-Mails zu
erstellen — eines pro Organisation.

Eine zukünftige "Membership"-Tabelle, die einen Benutzer zu
mehreren Orgs gehören lässt, ist auf der Roadmap; frag nach,
wenn du es früher brauchst.

## Was ist mit Admin-led Betroffenenanfragen?

DSGVO Art. 15 (Auskunft) und Art. 17 (Löschung) erlauben einem
Admin, eine Anfrage für eine dritte Partei (einen Kontakt, einen
Freiwilligen, einen Gast) im Auftrag seiner Organisation zu
bearbeiten. Die Endpoints
`/api/admin/gdpr/data-subject-export` und
`/api/admin/gdpr/data-subject-erasure` finden Zeilen per E-Mail
**gescoped auf die `organizationId` des anfragenden Admins**.
Sie können die Daten eines anderen Tenants nicht erreichen,
selbst mit Admin-Rolle.

Siehe [DSGVO-Selfservice](concepts/gdpr) für den vollen Flow.

## Tests, die die Garantie festschreiben

`lib/onboarding/create-org.test.ts` enthält einen Test namens
"two unrelated signups land in two separate organizations". Er
erstellt zwei neue Benutzer mit unterschiedlichen E-Mails,
schickt jeden durch den Create-Org-Flow und bestätigt, dass die
beiden Organisationen verschieden sind und die beiden
User-Zeilen zu den richtigen gehören.

Das Entfernen oder Schwächen dieses Tests sollte eine
Security-Team-Review erfordern. Es ist die tragende Behauptung
für unseren Multi-Tenancy-Anspruch.

## Wo es weitergeht

- **[Rollen & Rechte](concepts/roles)** — was jede Rolle
  *innerhalb* ihrer Organisation tun kann.
- **[DSGVO-Selfservice](concepts/gdpr)** — Artikel 15/17-Flows
  für Operatoren und Kontakte.
- **[Audit-Log](features/audit)** — der manipulationssichere
  Datensatz jeder Mutation in deinem Tenant.
