---
name: news-scan
description: Scan energie-, salderings-, thuisbatterij-nieuws voor content opportunities. Filter relevant + relevantie-score + draft-suggestie. Gebruik dagelijks voor news-jacking, of vóór redactievergadering.
trigger: /news-scan
---

# /news-scan

Energie/saldering/thuisbatterij nieuwsscan voor HMB content.

## Usage

```
/news-scan                       # standaard bronnen, laatste 24u
/news-scan --since 7d
/news-scan --topic saldering
/news-scan --draft               # auto-draft top 3 nieuws-items
```

## Bronnen
- nu.nl/economie
- fd.nl
- ed.nl/energie
- nrc.nl/energie
- volkskrant.nl/economie
- rijksoverheid.nl/onderwerpen/energie-thuis
- consumentenbond.nl/zonnepanelen
- milieucentraal.nl
- TNO publications
- ECN/TNO Energie nieuws
- Branchevereniging Holland Solar
- Salderingsregeling overheid updates
- Concurrent blogs (Zonneplan, 1KOMMA5°, Sessy, Sigenergy) — voor competitive intel

## Topics filter (relevantie)

HOOG relevant:
- Salderingsregeling 2027 (kern)
- Terugleverkosten / -vergoedingen
- Thuisbatterij regelgeving / SDE++ / subsidies
- ISDE / energiebespaarpremies
- Negatieve stroomprijzen
- Smart meter / virtuele saldering
- BTW thuisbatterij/zonnepanelen
- Capaciteitstarief NL (relevantie groeit)

MIDDEN:
- EV laden thuis
- Warmtepomp + batterij combo
- Energiecoöperaties
- Net-congestie

LAAG (skip):
- Algemene macro-economie
- Buitenlandse beleidskwesties zonder NL-link

## Output

```
NEWS SCAN — 2026-05-02 (24u)

═══ HOOG RELEVANT (top 5) ═══
1. [Bron] "Titel" — datum
   Score: 9/10
   Hook: <waarom relevant>
   Content angle: <onze invalshoek>
   Suggested type: nieuws (600-900w) | cluster | pillar update
   Cluster: <welke pillar updaten>

2. ...

═══ MIDDEN RELEVANT ═══
- [Bron] "Titel" — score 6
- ...

═══ COMPETITOR MOVES ═══
- Zonneplan publiceerde: <topic> — antwoord nodig?
- 1KOMMA5° campagne: <topic>

═══ DRAFT SUGGESTIES (--draft) ═══
[indien --draft flag]
1. Title tag concept: ...
   H1: ...
   Outline: ...
   Roept op /seo-publish met --draft

═══ ACTIES ═══
1. Schrijf nieuwsitem #1 (vandaag, 60 min)
2. Update pillar X met punt uit nieuws #2
3. Monitor concurrent move
```

## Hard rules
- NOOIT direct concurrent-content overschrijven (auteursrecht)
- ALTIJD bronvermelding in nieuwsartikel
- NEXUS BOS regels: geen prijzen, geen negatief over concurrenten
- Bij hot topic met deadline: escalate naar Juan voor approval snelle publish
- Memory: log naar `project_news_scan_<jaarmaand>.md`

## Memory check
Lees: project_news_banner_workflow, recent project_audit_content
