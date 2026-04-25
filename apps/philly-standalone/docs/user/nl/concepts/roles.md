---
slug: concepts/roles
lang: nl
title: Rollen & rechten
summary: Wat admin, manager en viewer elk kunnen, plus hoe de per-sectie allow-list de toegang verder versmalt.
tags: [concepts, roles, permissions, security, admin]
related: [onboarding/invite-team, concepts/tenancy, features/settings-users]
updated: 2026-04-25
---

# Rollen & rechten

Philly heeft drie rollen. Binnen elke rol versmalt een optionele
**per-sectie allow-list** de toegang verder. De twee lagen
componeren: een gebruiker kan iets alleen doen als hun rol het
toestaat EN de sectie in hun allow-list staat.

## De drie rollen

### Admin

Kan alles in hun organisatie:

- Gebruikers uitnodigen, bewerken, verwijderen
- Andermans rol wijzigen (behalve dat ze de laatste admin niet
  kunnen demoten)
- Integraties, automatiseringen, webhooks en API-keys configureren
- Betrokkenenverzoeken (export, verwijdering) verwerken voor contacten
- De auditlog bekijken en verifiëren
- De sectormodus voor de org instellen
- Toegang tot elke dashboard-sectie ongeacht de allow-list

Admins bestaan om te administreren. De meeste operators hoeven er
geen te zijn.

### Manager

Kan de dagelijkse data van hun organisatie muteren maar de
organisatie zelf niet:

- Contacten, deals, projecten, panden, reserveringen, agenda-events
  aanmaken, bewerken, verwijderen
- E-mails en SMS versturen
- AI-tools draaien (command-bar, scoring, contact attributes)
- Kan geen gebruikers uitnodigen, geen rollen wijzigen, geen toegang
  tot settings-pagina's, geen integraties of automatiseringen
  configureren

De meeste CRM-gebruikers zijn managers.

### Viewer

Alleen-lezen over de secties die hun allow-list bevat:

- Door contacten, deals, projecten enz. bladeren
- Dashboards en rapporten bekijken
- Kan niets aanmaken, bewerken of verwijderen
- Kan niets versturen (geen e-mail, geen SMS, geen AI-mutaties)

Gebruik dit voor bestuursleden, auditors of read-only
exec-dashboards.

## De per-sectie allow-list

Elke gebruiker heeft een `dashboardSections`-veld. Het kan zijn:

- **`null`** — volledige toegang. De gebruiker ziet elke sectie
  die hun rol toestaat. Nieuwe gebruikers staan standaard hier.
- **Een lijst van section slugs** — strikte allow-list. De
  gebruiker ziet alleen de secties in de lijst. Sidebar-items
  buiten de lijst zijn verborgen, en elke API-route eronder
  retourneert 403.

Voorbeeld: een viewer met
`dashboardSections: ["dashboard", "contacts", "reports"]` ziet alleen
die drie secties — geen deals, geen kanban, geen settings.

**Admins zijn vrijgesteld.** Een admin met een beperkte allow-list
krijgt nog steeds elke sectie. Dit voorkomt dat een admin zichzelf
per ongeluk uitsluit van admin-functies.

Slugs zijn gedefinieerd in `lib/philly/sections.ts`. Veelvoorkomende:
`dashboard`, `contacts`, `deals`, `projects`, `kanban`, `calendar`,
`timeline`, `email`, `sms`, `ai`, `settings`, `audit`, `notifications`.

## Waar rolchecks gebeuren

Elke API-route onder `/api/` roept een van drie guards aan
bovenaan:

- `requireScope()` — moet ingelogd zijn en een Philly-gebruiker
  hebben. Retourneert de auth scope (userId, organizationId, role,
  allow-list).
- `requireRole(['admin', 'manager'])` — vereist daarbovenop dat de
  rol in de toegestane lijst staat. Retourneert anders 403.
- `requireSection('contacts', ['admin', 'manager'])` — guards op
  zowel section slug als (optioneel) rol. De default voor de
  meeste CRM mutation routes.

Als je nieuwe API-routes bouwt, gebruik er een van. Het
[tenant-isolation audit script](features/audit-tenancy) verifieert
bij elke commit dat geen route doorglipt zonder guard.

## Veelvoorkomende rolwijzigingen

### Een manager promoten tot admin

`/settings/users` → klik op de gebruiker → wijzig rol → save.
Audit-logged.

### Een manager beperken tot specifieke secties

`/settings/users` → klik op de gebruiker → klap "Dashboard sections"
uit → vink de secties uit die ze niet zouden moeten zien → save.
Hun bestaande sessies zijn onaangetast; bij hun volgende verzoek
pakt de API de nieuwe lijst op.

### Een admin demoten

Toegestaan tenzij ze de laatste admin zijn. Het systeem blokkeert
de wijziging met een 400 fout als je het probeert; promoot eerst
een andere gebruiker.

## Audit-spoor

Elke rol- en section-list-wijziging schrijft een entry naar de
[auditlog](features/audit) met de voor/na waarden. Je kunt de
auditpagina filteren op `entity: user` om alle rolwijzigingen in
je org te zien.

## Waar verder

- **[Tenancy & data-isolatie](concepts/tenancy)** — hoe de
  org-scope werkt op de databaselaag.
- **[Settings → Users-pagina](features/settings-users)** —
  UI-referentie voor het beheren van het team.
- **[Auditlog-pagina](features/audit)** — beoordeel elke mutatie
  in je org, inclusief rolwijzigingen.
