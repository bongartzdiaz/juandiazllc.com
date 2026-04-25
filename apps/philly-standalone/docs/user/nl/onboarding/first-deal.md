---
slug: onboarding/first-deal
lang: nl
title: Voeg je eerste deal toe
summary: Hoe je een deal aanmaakt, koppelt aan een contact, en door pipeline stages laat lopen op de kanban of lijstweergave.
tags: [onboarding, deals, pipeline, kanban, getting-started]
related: [features/deals, features/kanban, onboarding/first-contact, features/automations]
updated: 2026-04-25
---

# Voeg je eerste deal toe

Een **deal** is een opportuniteit in beweging — een vastgoed-
transactie, een donatie in onderhandeling, een eventboeking.
Deals horen bij een **pipeline** en doorlopen pipeline-**stages**.

## Waar je dit doet

`/deals` → klik **+ New deal** in de topbar.

## Velden

- **Titel** (verplicht) — hoe je het in een gesprek zou noemen.
  Bv. "Acme partnership Q3" of "1234 Elm St — verkoop".
- **Pipeline** (verplicht) — kies in welke pipeline deze deal
  leeft. Nieuwe orgs krijgen één standaard pipeline; admins
  kunnen er meer maken in `/settings/pipelines`.
- **Stage** (verplicht) — de huidige positie. Stages zijn
  pipeline-specifiek. De standaard nieuwe-deal-stage is de
  meest linkse ("Lead", "Inquiry", enz.).
- **Waarde** (optioneel) — geldwaarde in centen. Gebruikt voor
  pipeline-KPI's.
- **Eigenaar** (optioneel) — welke gebruiker is de
  deal-eigenaar. Standaard jij.
- **Contact** (optioneel) — koppel de deal aan een bestaand
  contact. Aanbevolen; veel automatiseringen hebben deze link
  nodig.
- **Project** (optioneel) — koppel aan een project indien
  relevant.

Verstuur en de deal landt op het kanban-board op de gekozen
stage.

## Twee weergaven: kanban en lijst

De deals-pagina toggle tussen:

- **Kanban** — drag-and-drop board, één kolom per pipeline-stage.
  Het beste voor het vooruit duwen van deals.
- **Lijst** — tabelweergave met volledig filterbare kolommen.
  Het beste voor bulk-operaties, exports of sorteren op waarde.

De toggle blijft in de URL.

## Een deal tussen stages verplaatsen

In kanban-weergave: sleep de kaart naar een nieuwe kolom. De
PATCH gebeurt optimistisch — de kaart beweegt direct, en
springt terug met een toast als de API faalt.

In lijst- of detailweergave: open de deal, wijzig de stage in
de dropdown, save. De patch is niet-optimistisch; de knop toont
een spinner tot hij terugkomt.

Elke stage-wijziging schrijft een auditlog-entry met de
voor/na-stagewaarden en triggert eventuele matchende
automatiseringsregels (zie [Automatiseringen](features/automations)).

## Een deal aan een contact koppelen

Als je het contact-veld bij creatie hebt overgeslagen, kun je
later koppelen vanaf de deal-detailpagina → "Related"-sidebar →
"Link contact".

Eenmaal gekoppeld:

- De "Deals"-tab van het contact toont deze deal
- Notities die je op het contact schrijft verschijnen in de
  activity-feed van de deal
- E-mailcorrespondentie met het e-mailadres van het contact
  wordt automatisch aan beide records gekoppeld

## Veelvoorkomende automatiseringen om in te stellen

`/automations` (alleen admin) laat je `trigger → action` regels
definiëren. Veelvoorkomend voor deals:

- **Stage = closed-won → maak een follow-up taak in 30 dagen** —
  drijft renewal-gesprekken
- **Stage = stale (geen update in 14 dagen) → e-mail de
  eigenaar** — voorkomt deal-rot
- **Waarde > €X → notify Slack** — houdt leiderschap op de
  hoogte

Zie [Automatiseringen](features/automations) voor de volledige
builder.

## En de pipelines?

Een pipeline is een opeenvolging van stages — de funnel waardoor
je deals duwt. Standaard pipeline voor een nieuwe org heeft een
generieke 5-stage vorm; admins passen per sector aan in
`/settings/pipelines`:

- **Vastgoed**: Lead → Showing → Offer → Under contract → Closed
- **Filantropie**: Prospect → Engaged → Cultivated → Solicited → Stewarded
- **Hospitality**: Inquiry → Hold → Confirmed → Checked-in → Checked-out

Je kunt meerdere pipelines naast elkaar draaien. Elke deal leeft
in precies één pipeline tegelijk, maar admins kunnen een deal
tussen pipelines verplaatsen als de omstandigheden veranderen.

## Waar verder

- **[Deals page reference](features/deals)** — de volledige
  feature-uitsplitsing inclusief filters, exports en
  bulk-operaties.
- **[Kanban-board](features/kanban)** — drag-and-drop UX
  patronen.
- **[Pipelines & stages](features/settings-pipelines)** —
  admin-configuratie.
- **[Automatiseringen](features/automations)** — automatiseer
  op basis van deal-events.
