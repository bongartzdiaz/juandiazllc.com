---
slug: features/deals
lang: nl
title: Deals
summary: De deals-pagina — kanban-board + lijstweergave, drag-and-drop stage-moves, filters, totaalwaardes, en hoe deals koppelen aan contacten en projecten.
tags: [features, deals, pipeline, kanban]
related: [onboarding/first-deal, features/kanban, features/automations, features/settings-pipelines]
updated: 2026-04-25
---

# Deals

Een **deal** is een opportuniteit in beweging.
Vastgoedtransacties, filantropie-giften in onderhandeling,
hospitality-boekingen die worden gecontracteerd — ze delen
allemaal hetzelfde model. Elke deal leeft in precies één
**pipeline** op één **stage** tegelijk.

## Twee weergaven

`/deals` toggle tussen twee layouts via een knop in de toolbar
(blijft in URL):

- **Kanban** — drag-and-drop board; één kolom per pipeline-stage.
  Kaartstapel-hoogte = stage-aantal. Het beste om deals in één
  oogopslag vooruit te bewegen.
- **Lijst** — tabelweergave met sorteerbare kolommen (titel,
  stage, waarde, eigenaar, contact, bijgewerkt). Het beste voor
  bulk-operaties, exports en filteren.

## Toolbar

- **Pipeline-kiezer** — wissel tussen pipelines als je org er
  meer dan één heeft. Elke pipeline heeft een eigen stage-set.
- **Status-filter** — open / won / lost / all
- **Zoeken** — matcht deal-titels
- **+ New deal** — opent het create-modal (admins + managers)

De deals-pagina toont ook drie KPI's: totale open waarde,
gewogen forecast, gemiddelde dagen-in-stage.

## Een deal aanmaken

Verplicht: titel, pipeline, stage. Optioneel: waarde, eigenaar,
contact, project. Submit creëert de deal in de gekozen stage;
de kanban-kaart verschijnt direct.

Als de pipeline die je kiest geen stages heeft (zeldzaam, verse
org), blokkeert het formulier submit met "no stages — voeg
stages toe in `/settings/pipelines` eerst".

## Een deal tussen stages verplaatsen

**In kanban-weergave**: sleep de kaart naar een nieuwe kolom.

- Optimistische update: kaart beweegt direct.
- PATCH gebeurt op de achtergrond.
- Bij fout springt de kaart terug en toont een toast de fout.
- Een `Deal verplaatst` toast bevestigt succes; een
  auditlog-entry registreert voor/na stagewaarden.

**In lijstweergave of detailpagina**: wijzig de stage in de
dropdown, save. Niet-optimistisch; knop toont een spinner tot
hij terugkomt.

Elke stage-wijziging schrijft audit + kan automatiseringen
triggeren (zie [automatiseringen](features/automations)).

## De deal-detailpagina

`/deals/[id]` toont:

- **Header-kaart** — titel (inline-bewerkbaar), stage-kiezer,
  status, waarde, eigenaar-avatar
- **Inline-bewerkbare velden** — titel, waarde, verwachte
  closingdatum, deal-type — klik om te bewerken, Tab/Esc om op
  te slaan/annuleren
- **Sidebar** — gekoppeld contact, gekoppeld project, tags
- **Activity-feed** — elk event op deze deal: stage-wijzigingen,
  notities, e-mails, calls
- **Files-tab** — documenten gekoppeld aan de deal
- **E-signatures-tab** — handtekeningverzoeken + hun statussen

## Een deal aan een contact koppelen

Twee manieren:

1. Bij creatie — kies een contact in het modal.
2. Na creatie — open de deal → Sidebar → "Link contact" → kies
   uit je contactlijst.

Eenmaal gekoppeld:

- De "Deals"-tab van het contact bevat deze deal
- Activity stroomt in beide richtingen — een notitie op het
  contact verschijnt in de deal-feed
- E-mails naar/van het e-mailadres van het contact worden
  automatisch aan de deal gekoppeld

## Status: open / won / lost

Status is **gescheiden** van stage. Stage is de positie in de
pipeline; status is de dispositie.

- **Open** — deal is actief, in een of andere stage. Default
  voor nieuwe deals.
- **Won** — deal positief afgesloten. Vaak gekoppeld aan de
  laatste pipeline-stage.
- **Lost** — deal negatief afgesloten. Optioneel inclusief een
  "lost reason" in de notities voor analytics.

Filteren op status zit in de toolbar; de kanban toont open
deals standaard en dimt won/lost.

## Een deal verwijderen

`/deals/[id]` → menu → Delete. Bevestigingsprompt; alleen admin
of manager.

Hard-delete; er is geen soft-delete kolom op `Deal`. Auditlog
behoudt de entry (FK-constraint is `RESTRICT`, dus de auditrij
houdt het deal-id maar de deal zelf is weg). Gebruik dit
spaarzaam — voor testen of hard-corrigeren van data; voor "we
hebben de deal niet gekregen" gebruik status = lost.

## Waar verder

- **[Kanban-board](features/kanban)** — drag-drop UX details
- **[Pipelines](features/settings-pipelines)** —
  admin-configuratie van stages
- **[Automatiseringen](features/automations)** — automatiseer
  op basis van stage-wijzigingen
- **[Contacten](features/contacts)** — koppel deals aan mensen
