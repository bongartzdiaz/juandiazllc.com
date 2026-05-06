---
name: competitor-watch
description: Monitor concurrent moves — Zonneplan / 1KOMMA5° / Sessy / Sigenergy — content publicatie, ranking shifts, ads, productlanceringen, prijsacties. Gebruik wekelijks of wanneer rankings inzakken zonder eigen oorzaak.
trigger: /competitor-watch
---

# /competitor-watch

Concurrent intelligence voor HMB / thuisbatterijmarkt.

## Usage

```
/competitor-watch                       # alle concurrenten, 7d
/competitor-watch --competitor zonneplan
/competitor-watch --since 30d
/competitor-watch --focus content|ads|product|pricing
```

## Concurrenten (hoofdlijst)
- Zonneplan (zonneplan.nl + Nexus product)
- 1KOMMA5° (1komma5.nl + Heartbeat)
- Sessy (sessy.com + sessy.nl)
- Sigenergy (sigenergy.com — meer B2B)
- Powerwall (Tesla)
- Fenecon
- Solarwatt
- HomeWizard (smart home + battery)

## Checks (8)

### 1. Content publicatie
Per concurrent:
- Nieuwe blog posts laatste periode (via /crawl + RSS indien)
- Topics behandeld
- Word count + diepte
- Nieuwe pillar pages

### 2. Ranking shifts
Via Ahrefs:
- Keywords waar concurrent +5 positions gewonnen
- Keywords waar concurrent uit top 10 viel
- Nieuwe keywords waar ze ranken

### 3. SERP overlap met HMB
- Welke gedeelde keywords?
- Wie wint per keyword?
- Trend (winnen of verliezen we t.o.v. hen?)

### 4. Backlink profiel
- Nieuwe referring domains laatste periode
- Authority shifts
- Notable links (.gov, branche, news)

### 5. Ads activity
- Meta Ads Library check per concurrent
- Welke creatives draaien?
- Welke audiences (geo, demographics indicators)?
- Estimated spend trend

### 6. Productlanceringen
- Nieuwe modellen / capaciteiten
- Nieuwe features (bv VPP, virtuele saldering)
- Software updates / app changes

### 7. Pricing / promo
- Promo periodes
- Bundles (panelen + batterij + installatie)
- Financiering opties (we noteren observaties — wij noemen geen prijzen!)

### 8. Social moves
- LinkedIn announcements
- Press releases
- Hire patterns (groei/krimp signalen)

## Output

```
COMPETITOR WATCH — 2026-04-26 tot 2026-05-02

═══ CONTENT MOVES ═══
Zonneplan: N nieuwe posts (top: "...")
1KOMMA5°: N (...)
Sessy: N (...)
HMB antwoord nodig: <topics>

═══ RANKING DELTAS ═══
Zonneplan +5 op: ...
Sessy uit top 10 op: <kwetsbaarheid voor ons>
Onze positie t.o.v.: ...

═══ ADS ═══
Zonneplan creatives: N actief
Trends: video focus, hook = ...
Onze counter idee: ...

═══ PRODUCT ═══
Sigenergy lanceerde: ...
Implicaties voor ons content: ...

═══ ACTIES ═══
1. Schrijf antwoord-content op X (binnen 7d)
2. Update pillar Y met nieuwe info
3. Test andere ad-hook (geinspireerd door X — niet kopiëren)
4. Monitor verder: ...

═══ MEMORY UPDATE ═══
project_competitor_watch_<datum>.md
```

## Hard rules
- NOOIT concurrent-content kopiëren (auteursrecht + Google duplicate)
- NOOIT negatief over concurrent in eigen content (CLAUDE.md §2)
- WEL leren van structuur, hooks, angle
- WEL beter doen op data, diepgang, lokale relevantie
- Memory: cumulatief bouwen aan competitor-profielen
