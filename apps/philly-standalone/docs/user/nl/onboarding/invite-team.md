---
slug: onboarding/invite-team
lang: nl
title: Nodig je team uit
summary: Hoe een admin teamgenoten pre-creëert in /settings/users zodat ze bij hun eerste login in de juiste org belanden.
tags: [onboarding, team, users, invitations, admin]
related: [onboarding/welcome, onboarding/create-organization, concepts/roles, features/settings-users]
updated: 2026-04-25
---

# Nodig je team uit

Zodra je organisatie bestaat, is de volgende stap je teamgenoten
binnenkrijgen. De CRM gebruikt een **admin-led invite**-model:
admins pre-creëren teamaccounts, daarna logt de uitgenodigde in
met eigen credentials en landt direct in jouw org.

## Waar je dit doet

`/settings/users` — de teammanagement-pagina, alleen voor admins.
Niet-admins kunnen de teamlijst zien maar niets wijzigen.

## De flow

1. Klik **+ New user** bovenaan `/settings/users`.
2. Vul in:
   - **E-mail** — het adres waarmee de uitgenodigde inlogt. Moet
     uniek zijn over heel Philly; een persoon kan slechts tot
     één organisatie behoren.
   - **Weergavenaam** — optioneel; standaard het deel van het
     e-mailadres vóór de @.
   - **Rol** — `admin`, `manager` of `viewer`. Zie
     [Rollen & rechten](concepts/roles).
   - **Dashboard-secties** — laat standaard staan (volledige
     toegang) voor de meeste teamgenoten, of selecteer specifieke
     secties om tot te beperken.
3. Versturen. Twee dingen gebeuren:
   - Een rij wordt aangemaakt in `User` met de e-mail, rol,
     secties en jouw `organizationId` — dus de uitgenodigde
     hoort vanaf het moment van aanmaken bij jouw org.
   - Een Supabase-uitnodigingsmail gaat uit van het auth-systeem.
4. De uitgenodigde klikt op de e-maillink, stelt een wachtwoord
   in (en 2FA als jij dat verplicht stelt), en logt in. Het
   systeem vindt hun pre-aangemaakte Philly-rij op e-mail en
   landt ze op het dashboard binnen jouw org.

De pre-aangemaakte rij is de truc: zonder die rij gaat een nieuwe
login naar `/onboarding` en maakt een nieuwe tenant aan.

## Wat als de uitgenodigde al een account heeft?

Als ze al een User-rij hebben in *welke* organisatie dan ook (jouw
of een andere), retourneert het uitnodigformulier
`409 — A user with that email already exists` en weigert ze
stilletjes te verplaatsen. Dit beschermt tegen onbedoelde
cross-org overdrachten.

Om iemand te verplaatsen moet de ontvangende admin het nieuwe
e-mailadres uitnodigen en de oorspronkelijke admin de oude rij
verwijderen. Er is geen auto-merge; data-helderheid wint van gemak.

## Wat als ik de rol verkeerd doe?

Je kunt op elk moment de rol van een teamgenoot wijzigen vanaf
dezelfde pagina. Wijzigingen worden audit-logged. De enige guardrail:
het systeem weigert demotie van de **laatste** admin in je org —
promoot eerst een opvolger, anders sluit je jezelf buiten van
admin-functies.

## Wat als de uitnodigingsmail niet aankomt?

De Supabase-uitnodiging is best-effort. Als die faalt of in spam
belandt, is de User-rij toch aangemaakt — de uitgenodigde kan:

1. Naar de brand-loginpagina gaan en een magic link voor hetzelfde
   e-mailadres aanvragen.
2. Eenmaal ingelogd vindt het systeem hun rij en landen ze in
   jouw org.

Stuur de Supabase-uitnodiging opnieuw via hetzelfde
`/settings/users`-formulier door dezelfde e-mail uit te nodigen —
de bestaande rij retourneert de conflict-fout, maar je kunt ook
hun Supabase-wachtwoord resetten vanuit het auth-dashboard.

## Per-sectie toegang (geavanceerd)

De standaard `dashboardSections: null` betekent volledige toegang.
Voor fijnere controle stel het veld in op een specifieke lijst van
section-slugs — bv. `["dashboard", "contacts", "deals"]` — en de
sidebar toont alleen die, *en* elke API-route onder de niet-
opgenomen secties geeft `403`.

Slugs komen overeen met `lib/philly/sections.ts`. Admins krijgen
altijd elke sectie ongeacht deze lijst (ze kunnen zichzelf niet per
ongeluk uitsluiten).

## Toegang verwijderen

Op dit moment verwijdert "remove user" de User-rij. Dat cascadeert:
auditlog-rijen die de gebruiker schreef blijven behouden (ze
verwijzen naar het user-id; de FK is restrict-on-delete in de
AuditLog-tabel om forensische geschiedenis te bewaren), maar de
gebruiker kan niet meer inloggen.

Gebruik dit voor harde offboarding. Voor "ze zijn met verlof maar
komen terug": zet hun rol op `viewer` en wis `dashboardSections`
naar geen — ze houden de seat maar kunnen niets doen.

## Waar verder

- **[Rollen & rechten](concepts/roles)** — de volledige uitsplitsing
  van wat elke rol kan.
- **[Settings → Users-pagina](features/settings-users)** —
  UI-referentie voor de pagina zelf.
