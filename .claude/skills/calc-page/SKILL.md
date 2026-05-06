---
name: calc-page
description: Calculator-pagina template voor energie-producten — TCO, terugverdientijd, besparing, batterijgrootte advies. Volgt NEXUS BOS calc-page spec (1.000-1.500w, geen prijsgaranties, schema HowTo). Gebruik voor /thuisbatterij-calculator, /zonnepanelen-rendement, etc.
trigger: /calc-page
---

# /calc-page

Calculator-pagina builder voor helpmijbesparen.nl en voltafy.nl.

## Usage

```
/calc-page <product>
# vb: /calc-page thuisbatterij-terugverdientijd
# vb: /calc-page zonnepanelen-rendement
# vb: /calc-page besparing-saldering-2027
```

## Spec (CLAUDE.md §3)

| | Calc page |
|---|---|
| Lengte | 1.000–1.500 woorden |
| Frequentie | 1 per 2 weken |
| Owner | Schrijver + Technicus |

Plus alle on-page SEO verplichtingen (CLAUDE.md §3): meta, H1, 5+ interne links, 2-3 externe authority links, 3+ CTA's, schema (HowTo + FAQ), canonical.

## Standaard structuur

### 1. H1 + intro (150 wrd)
- Probleem-stelling die calc oplost
- "Met deze rekentool bereken je ..."
- 1 cijfer uit /research om geloofwaardigheid te zetten

### 2. De calculator zelf (UI element)
Inputs (met defaults):
- Verbruik kWh/jaar (default 4.000)
- Aantal zonnepanelen / opbrengst kWh (optional)
- Salderingsstatus (ja/nee/per wanneer afgeschaft)
- Energiecontract (vast/variabel/dynamisch)
- Postcode (voor regionale tarieven)

Outputs:
- Geschatte besparing/jaar (range, GEEN exacte garantie)
- Terugverdientijd (range)
- Aanbevolen capaciteit (kWh)
- Aanbevolen volgende stap (CTA)

Implementatie: HTML form + vanilla JS, geen externe deps. Berekening via formule die documenteerbaar is in body.

### 3. Hoe werkt de berekening (HowTo schema)
Stap-voor-stap uitleg formule:
- Wat wordt berekend
- Welke aannames (terugleverkosten X, energieprijs Y range)
- Bronnen voor aannames (.nl overheid)

Markeer expliciet: "indicatief, geen offerte".

### 4. Variabelen uitgelegd (300 wrd)
Per input:
- Wat is het
- Hoe vind ik mijn waarde
- Realistische range NL

### 5. Beperkingen (200 wrd)
Honesty section:
- Calc houdt geen rekening met: <list>
- Voor exacte berekening: telefoongesprek (CTA)
- Wettelijke disclaimers

### 6. FAQ sectie (5-8 vragen, FAQ schema)
- "Klopt deze berekening?"
- "Wat als ik geen zonnepanelen heb?"
- "Wat verandert na 2027?"
- "Is dit een offerte?"
- ... uit /research output

### 7. Volgende stap (CTA)
WhatsApp / contactformulier — leidt naar 3-stappen funnel (CLAUDE.md §5).
NIET direct buitendienst.

## Berekening templates

### Terugverdientijd thuisbatterij
```
investering = batterijprijs (range, gebruik geen vast bedrag)
besparing_jaar = (
  zelfverbruik_kWh × (consumentenprijs - terugleververgoeding)
  + peakshaving_besparing
)
TVT = investering / besparing_jaar
```
Output range, niet exact.

### Besparing post-saldering
```
voor_2027 = panelen_kWh × consumentenprijs (saldering)
na_2027 = panelen_kWh × terugleververgoeding
verschil = voor_2027 - na_2027
batterij_compensatie = zelfverbruik_door_batterij × consumentenprijs
```

## Flow

### 1. Spec
- Welk product / welke vraag beantwoordt deze calc?
- Welke inputs? Welke outputs?
- Welke bronnen voor aannames? (call /research)

### 2. Schrijf body conform structuur
- Use /research output voor cijfers + bronnen
- B1, geen jargon zonder uitleg
- Geen exacte prijzen — alleen ranges

### 3. Bouw calculator
- HTML form
- Vanilla JS (geen React voor dit type pagina, simpeler beheerbaar)
- Output direct onder form
- Mobile-first

### 4. Schema
Call `/schema-gen all` voor:
- Article
- HowTo (de berekening)
- FAQ
- BreadcrumbList

### 5. Interne links
Min 5 links naar:
- Pillar (thuisbatterij of saldering)
- Cluster artikelen
- Andere calc indien aanwezig

### 6. Externe authority links (2-3)
- rijksoverheid.nl
- rvo.nl
- consumentenbond.nl voor methodologie disclaimer

### 7. CTA's (min 3)
- Bovenaan: "Bel mij terug" (WhatsApp link)
- Halverwege: "Ontvang persoonlijk advies"
- Onderaan: "Plan kort telefoontje"

NOOIT direct "vraag offerte aan" zonder call eerst.

### 8. Compliance review
- Geen exacte prijzen
- Geen "garantie X jaar terug"
- Geen concurrent-naam in body (Voltafy mag op voltafy.nl)
- Disclaimer aanwezig

### 9. Push naar Supabase
Status: pending_review (NOOIT direct published).

## Output format

```
═══ CALC PAGE — <product> ═══

SPEC
- URL: <pad>
- Inputs: ...
- Outputs: ...
- Bronnen: <lijst /research findings>

CONTENT (1.000-1.500 wrd)
[volledig artikel]

CALCULATOR HTML/JS
[code blok met form + script]

SCHEMA
[Article + HowTo + FAQ JSON-LD]

INTERNE LINKS (5+)
1. ...

EXTERNE AUTHORITY LINKS (2-3)
1. rijksoverheid.nl/...

CTA'S (3+)
1. ...

COMPLIANCE
[ ] Geen prijsgaranties
[ ] Geen concurrent-bashing
[ ] Disclaimer aanwezig
[ ] Range gebruikt, geen exact bedrag

NEXT
- /seo-publish om te pushen naar Supabase pending_review
```

## Hard rules
- ALTIJD ranges, NOOIT exacte besparing claims
- ALTIJD disclaimer "indicatief, geen offerte"
- CTA leidt naar telefoongesprek, niet buitendienst
- pending_review status bij insert
- Calc moet werken zonder externe API (offline-resistant)

## Memory check
Lees: project_calc_*, feedback_content_rules, project_content_audit_*
