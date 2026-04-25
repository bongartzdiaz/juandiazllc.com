---
slug: concepts/tenancy
lang: nl
title: Tenancy & data-isolatie
summary: Hoe Philly elk record op één organisatie scoped en compile-time bewijst dat geen API-route over tenants kan lekken.
tags: [concepts, tenancy, security, multi-tenant, organization]
related: [onboarding/create-organization, concepts/roles, concepts/gdpr, features/audit]
updated: 2026-04-25
---

# Tenancy & data-isolatie

Philly is multi-tenant by design. Elke organisatie is één tenant;
elk record draagt het organisatie-id; elke API-route filtert
erop. Twee niet-gerelateerde bedrijven die zich aanmelden voor
Philly zien elkaars data nooit.

Deze pagina legt de mechanica uit — nuttig als je admin, DPO of
security reviewer bent.

## De datalaag

De meeste tabellen in de database hebben een `organizationId`-
kolom. Sommige die dat niet hebben (`Reservation`,
`OpenHouseVisit`, `Message`, `ESignature`) worden gescoped via
een ouder-tabel die het wel heeft — bijvoorbeeld een
`Reservation` is gekoppeld aan een `Room`, en de `Room` draagt
de `organizationId`.

Hoe dan ook, elke query die de applicatie maakt voor org-gescoped
data bevat een `organizationId`-filter. Er zijn geen "vind dit
contact alleen op id"-queries — het is altijd "vind dit contact
op id EN in deze organisatie".

## De auth-laag

Elke API-route start met één van drie guards:

```ts
const scope = await requireScope()       // elke geauthenticeerde gebruiker
const scope = await requireRole(['admin']) // alleen admin
const scope = await requireSection('deals', ['admin', 'manager'])
```

Elk geeft een `AuthScope`-object terug met — onder andere — de
`organizationId` van de aanroeper. Routes gebruiken die waarde
dan in hun Prisma-queries:

```ts
const contacts = await prisma.contact.findMany({
  where: { organizationId: scope.organizationId, ... }
})
```

Als een route vergeet te scopen, zou die data van een andere
tenant exposen. Die klasse van bug is waarom we...

## De auditlaag

`scripts/audit-tenant-isolation.ts` doorloopt elk
`app/api/**/route.ts`-bestand en flagt elke route die:

- Geen `requireScope` / `requireRole` / `requireSection` aanroept
- Of Prisma queryt maar nooit `organizationId` refereert

Het script wordt gedraaid via `npm run audit:tenant`. Het exit 0
als elke route gescoped is, en niet-nul met een lijst overtreders
zo niet. De huidige status is **schoon** — elke route is óf
gescoped, óf staat in de expliciete `EXEMPT_PATHS`-lijst met een
één-regel rechtvaardiging (bv. `/api/log-error` is een publieke
fout-sink, `/api/cron/*` gebruikt Bearer-token auth).

De audit draait op elke CI-build via
`.github/workflows/security.yml`. Een nieuwe route die vergeet te
scopen, faalt de build.

## Wat als een gebruiker bij meerdere organisaties hoort?

Vandaag, niet. `User.organizationId` is 1:1 — een gebruiker hoort
bij precies één organisatie. Het datamodel verwacht dit; de
auth-flow handhaaft het.

Als je legitiem cross-org toegang nodig hebt (bv. een consultant
die met meerdere klanten werkt), is de workaround voor nu
afzonderlijke gebruikersaccounts met verschillende e-mails — één
per organisatie.

Een toekomstige "Membership"-tabel die één gebruiker bij
meerdere orgs laat horen staat op de roadmap; vraag als je het
eerder nodig hebt.

## En admin-led betrokkenenverzoeken?

AVG art. 15 (inzage) en art. 17 (verwijdering) staan een admin
toe een verzoek voor een derde (een contact, een vrijwilliger,
een gast) namens hun organisatie te verwerken. De endpoints
`/api/admin/gdpr/data-subject-export` en
`/api/admin/gdpr/data-subject-erasure` vinden rijen op e-mail
**gescoped op de `organizationId` van de verzoekende admin**. Ze
kunnen de data van een andere tenant niet bereiken, zelfs niet
met admin-rol.

Zie [AVG selfservice](concepts/gdpr) voor de volledige flow.

## Tests die de garantie vastpinnen

`lib/onboarding/create-org.test.ts` bevat een test genaamd
"two unrelated signups land in two separate organizations". Hij
maakt twee nieuwe gebruikers met verschillende e-mails, doorloopt
elk via de create-org flow, en bevestigt dat de twee organisaties
verschillend zijn en de twee user-rijen tot de juiste behoren.

Het verwijderen of verzwakken van die test zou een security-team
review moeten vereisen. Het is de load-bearing assertion voor
onze multi-tenancy-claim.

## Waar verder

- **[Rollen & rechten](concepts/roles)** — wat elke rol kan
  *binnen* hun organisatie.
- **[AVG selfservice](concepts/gdpr)** — Artikel 15/17 flows
  voor operators en contacten.
- **[Auditlog](features/audit)** — het manipulatiebestendige
  record van elke mutatie in je tenant.
