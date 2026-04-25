---
slug: onboarding/pick-industry
lang: nl
title: Kies je sector
summary: Hoe de sectorinstelling (filantropie / vastgoed / hospitality) het dashboard hervormt en welke contact- / dealtypes beschikbaar zijn.
tags: [onboarding, settings, industry]
related: [onboarding/welcome, onboarding/first-contact, onboarding/first-deal]
updated: 2026-04-25
---

# Kies je sector

Philly is één CRM met drie sector-"skins". Dezelfde database
ondersteunt allemaal; wat verandert is welke secties in de sidebar
verschijnen, welke contact- + deal-types worden aangeboden in de
formulierkiezers, en een handvol verticaal-specifieke KPI's.

## De drie sectoren

- **Filantropie** — de standaard. Geoptimaliseerd voor non-
  profitoperaties: partners, donateurs, begunstigden, stakeholders;
  projecten met SDG-doelen, impactmetrics, subsidies.
- **Vastgoed** — kopers, verkopers, beleggers, huurders,
  verhuurders; panden, listings, bezichtigingen, biedingen,
  transacties, commissies, CMA-rapporten.
- **Hospitality** — gasten, leveranciers, partners, personeel;
  reserveringen, kamers, housekeeping, open houses, dripcampagnes.

Je kunt op elk moment wisselen via `/settings` → industry. Je
bestaande data is onaangetast — alleen de UI herschikt.

## Wat er daadwerkelijk verandert

| Instelling | Filantropie | Vastgoed | Hospitality |
| --- | --- | --- | --- |
| Standaard contact-types | partner / donateur / stakeholder / begunstigde | koper / verkoper / huurder / verhuurder / belegger | gast / leverancier / partner / personeel |
| Standaard pipeline | Prospect → Engaged → Cultivated → Solicited → Stewarded | Lead → Showing → Offer → Under contract → Closed | Inquiry → Hold → Confirmed → Checked-in → Checked-out |
| KPI-cards op `/projects` | Active / Total Budget / Budget Used | Active Listings / Portfolio Value / Avg Price | Available / Avg Nightly Rate / Occupancy |
| Sidebar-toevoegingen | Impact, Donateurs, Subsidies | Properties, Showings, Offers, Open Houses, Commissions, Transactions, CMA | Rooms, Open Houses, Drip Campaigns |
| `/projects` wordt | Projecten | Properties | Venues |

Het gedeelde datamodel is sector-agnostisch. Een `Contact` is een
`Contact` ongeacht de sector; de type-kiezer is een display-laag
zorg.

## De juiste kiezen

Als je een non-profit, charity, foundation of een andere
mission-driven organisatie bent: **Filantropie**.

Als je vastgoed verkoopt of verhuurt: **Vastgoed**.

Als je een hotel, B&B, eventlocatie of short-stay verhuur runt:
**Hospitality**.

Als je geen van die bent, kies dan standaard **Filantropie** — de
type-labels zijn het meest generiek en je kunt ze later hernoemen
of uitbreiden indien nodig.

## Later wisselen

Wisselen van sector:

1. **Verwijdert geen data.** Elk bestaand contact, deal, project
   blijft in de database.
2. **Hernoemt geen bestaande rijen.** Een contact dat je opsloeg
   als `donateur` heeft nog steeds `type: "donor"` na switch naar
   vastgoed — het verschijnt alleen niet in de nieuwe type-filter
   pillen. Bewerk het type vanuit de contact-detailpagina als je
   wilt dat het opnieuw verschijnt onder de labels van de nieuwe
   sector.
3. **Herschikt KPI's.** Dashboard-cards renderen opnieuw tegen de
   metrics van de nieuwe verticaal bij de volgende load.

## Multi-sector organisaties

Vandaag heeft een organisatie precies één sector tegelijk. Als je
echt twee verticalen runt (bv. een foundation die ook een
hospitality-locatie exploiteert), is de schoonste setup twee
organisaties — één per sector — onder dezelfde admin. Cross-org
rapportage is een aparte feature op de roadmap.

## Waar verder

- **[Voeg je eerste contact toe](onboarding/first-contact)** — zie
  de type-kiezer in actie.
- **[Voeg je eerste deal toe](onboarding/first-deal)** — zie de
  standaard pipeline voor je sector.
- **[Settings overview](features/settings)** — volledige referentie
  voor de settings-tree.
