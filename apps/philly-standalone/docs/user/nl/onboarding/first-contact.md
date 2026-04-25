---
slug: onboarding/first-contact
lang: nl
title: Voeg je eerste contact toe
summary: Hoe je een contact aanmaakt, wat er op de achtergrond automatisch wordt verrijkt, en hoe de per-sector types verschillen.
tags: [onboarding, contacts, getting-started]
related: [features/contacts, onboarding/welcome, features/ai-attributes]
updated: 2026-04-25
---

# Voeg je eerste contact toe

Een "contact" in Philly is iedere persoon of organisatie waarmee
je zaken doet. Het formulier is hetzelfde over sectoren heen; de
**type**-kiezer verandert op basis van welke sector jouw org
runt.

## Waar je dit doet

`/contacts` → klik **+ New contact** in de topbar.

## Velden

Het formulier vraagt:

- **Naam** (verplicht)
- **E-mail** (optioneel maar aanbevolen — de meeste automatiseringen werken op e-mail)
- **Telefoon** (optioneel)
- **Bedrijf** (optioneel)
- **Type** — afhankelijk van je sector:
  - Filantropie: `partner` / `donor` / `stakeholder` / `beneficiary`
  - Vastgoed: `buyer` / `seller` / `tenant` / `landlord` / `investor`
  - Hospitality: `guest` / `vendor` / `partner` / `staff`
- **Notities** — vrije tekst. Wat je dan ook over hen wilt onthouden.

Verstuur en het contact verschijnt in de grid.

## Wat er op de achtergrond gebeurt

Wanneer je een contact aanmaakt, starten een paar dingen automatisch:

1. **AI-autoverrijking** — als `ANTHROPIC_API_KEY` is ingesteld,
   roept de server Claude op de achtergrond aan (via Vercel
   `after()`) om in te vullen:
   - **Industry** — beste-gok op basis van bedrijfsnaam +
     e-maildomein
   - **ICP fit-score** — schatting 0–100 hoe goed ze passen bij
     je typische klant
   - **Summary** — beschrijving van één regel
   De `aiAttributesStatus` van het contact verandert van `pending`
   naar `complete` zodra de LLM-aanroep terugkomt. De UI toont een
   kleine spinner op de contactkaart terwijl er gewerkt wordt.
2. **Real-time broadcast** — elke andere geopende dashboard-tab in
   je org krijgt een `contact:created`-event en ververst de
   contactlijst.
3. **Auditlog-entry** — `entity: contact, action: create` met jou
   als actor.

## Veel contacten tegelijk importeren

Gebruik het **bulk-import** formulier op de contacts-pagina (CSV-
upload). Het CSV-bestand moet kolommen hebben die overeenkomen
met de formuliervelden. Bulk-import draait dezelfde
auto-verrijking op elke rij, gethrottled door de AI-rate limit
(~10 per seconde).

## Een contact bewerken

Klik op een contact in de grid om de detailpagina te openen. Klik
**Edit** in de topbar om naar inline-edit modus te schakelen. De
pagina haalt activity, notities, projecten en deals op die met dit
contact verbonden zijn.

De save-knop toont een spinner tijdens de PATCH en is uitgeschakeld
om dubbel-versturen te voorkomen.

## Wat doorzoekbaar en filterbaar is

De toolbar boven de grid heeft:

- **Vrije tekst zoeken** over naam, e-mail en bedrijf
- **Type-filter** — pillen rechtsboven in de toolbar
- URL-state — filterselecties worden gereflecteerd in de URL zodat
  je een gefilterde view kunt delen

## Privacyhouding

Contactdata is PII. Het is:

- Gescoped op je organisatie (andere orgs kunnen het nooit zien)
- Auto-gewist 3 jaar na aanmaak als de rij sindsdien niet is
  aangeraakt (configureerbaar in `lib/gdpr/pii-registry.ts`)
- Onderhevig aan admin-led data subject erasure als het contact
  daarom vraagt — zie [AVG selfservice](concepts/gdpr).

## Waar verder

- **[Contacts page reference](features/contacts)** — de volledige
  feature-uitsplitsing.
- **[AI contact attributes](features/ai-attributes)** — wat de
  auto-verrijking doet en hoe je die per-org uitschakelt.
- **[Voeg je eerste deal toe](onboarding/first-deal)** — het
  volgende dat de meeste nieuwe orgs doen.
