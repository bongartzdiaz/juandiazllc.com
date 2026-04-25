---
slug: onboarding/create-organization
lang: nl
title: Maak je organisatie aan
summary: Hoe een gloednieuwe login een nieuwe tenant opstart op /onboarding en als eerste admin landt.
tags: [onboarding, organization, admin, tenancy]
related: [onboarding/welcome, onboarding/invite-team, concepts/tenancy, concepts/roles]
updated: 2026-04-25
---

# Maak je organisatie aan

De eerste keer dat je inlogt bij Philly met een nieuw e-mailadres,
stuurt de CRM je naar `/onboarding`. Daar maak je je eigen organisatie
aan — en word je de admin ervan.

## Waarom dit bestaat

Elke organisatie in Philly is een tenant. Elk record — contacten,
deals, projecten, auditlogs — is gescoped op één organisatie en lekt
nooit naar een andere. De bootstrap-stap voorkomt dat twee niet-
gerelateerde bedrijven zich aanmelden en per ongeluk data delen.

Voordat deze flow bestond, voegde de CRM elke nieuwe gebruiker
automatisch toe aan één gedeelde standaardorganisatie. Dat was een
multi-tenancy bug; de onboarding-stap is de fix.

## De flow

1. Log in op de brand-site met een door Supabase beheerd e-mailaccount.
2. De dashboard-layout roept `GET /api/onboarding/status` aan. Als je
   nog geen Philly-gebruikersrij hebt, word je doorgestuurd naar
   `/onboarding`.
3. Vul op `/onboarding` in:
   - **Organisatienaam** — verplicht; 2–120 tekens. Dit is de
     publiek-achtige naam in de topbar.
   - **Weergavenaam** — optioneel; hoe teamgenoten en rapporten naar
     jou verwijzen. Standaard het deel van je e-mail vóór de `@`.
4. Verstuur. De server maakt een `Organization`-rij + een `User`-rij
   (jij, met `role: admin`) in één database-transactie. Als één
   faalt, commit geen van beide — je eindigt nooit half-aangemaakt.
5. Je wordt doorgestuurd naar het dashboard. Je tenant is live.

## Wat er automatisch gebeurt

- Een unieke slug wordt afgeleid van de organisatienaam. Als je
  `Acme Inc.` typt, wordt de slug `acme-inc`. Als die slug bezet
  is, voegt het systeem `-2`, `-3`, enz. toe tot een vrije slug
  is gevonden.
- Je eerste user-rij wordt aangemaakt met `role: admin` en volledige
  dashboard-toegang (`dashboardSections: null`, betekent elke sectie).
- Een audit log entry wordt geschreven — `entity: organization`,
  `action: create` — met jou als actor. Dit is de genesisrij in de
  hash-chained auditlog van je tenant.

## Wat als ik ververs / dubbel verstuur?

Idempotent. Als de server ziet dat je e-mail al een Philly-gebruikersrij
heeft, retourneert hij `409 ALREADY_ONBOARDED` en weigert een tweede
tenant aan te maken. Je kunt jezelf niet per ongeluk dupliceren.

## Wat als mijn organisatie al in Philly zit?

Als een admin in een bestaande organisatie jou uitnodigt (via
`/settings/users` → New user), pre-creëert die je Philly-gebruikersrij.
Wanneer je vervolgens inlogt, vindt het systeem je rij en land je in
diens organisatie — je slaat `/onboarding` volledig over.

Dus als je een uitnodiging verwachtte maar op `/onboarding` belandde,
heeft de admin je waarschijnlijk nog niet uitgenodigd. Log uit en
vraag of die je uitnodigt, log dan weer in.

## Rechten als bootstrap-admin

- Alle dashboard-secties
- Gebruikers in je org uitnodigen / bewerken / verwijderen
- Betrokkenenverzoeken (export, verwijdering) verwerken voor contacten
- Integraties, automatiseringen, webhooks, API-keys configureren
- Auditlog bekijken en verifiëren

Je kunt de admin-rol later overdragen — zie
[Rollen & rechten](concepts/roles) — maar het systeem blokkeert
verwijdering van de *laatste* admin in de org. Promoot eerst een
opvolger.

## Waar verder

- **[Nodig je team uit](onboarding/invite-team)** — krijg teamgenoten
  in je org met de juiste rollen.
- **[Rollen & rechten](concepts/roles)** — wat admin / manager
  / viewer elk kunnen.
- **[Kies je sector](onboarding/pick-industry)** — kies filantropie
  / vastgoed / hospitality zodat het dashboard zich aanpast.
