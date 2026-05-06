---
name: research
description: Web research voor een topic met bronnen, datum, auteurschap, E-E-A-T markers — output klaar voor /seo-publish. Gebruik wanneer een artikel feitelijke backing nodig heeft (saldering, subsidies, prijzen-orde-grootte, technische specs).
trigger: /research
---

# /research

Gestructureerd web onderzoek met bronnen-trail.

## Usage

```
/research <topic>
# vb: /research salderingsregeling 2027 nieuwe wet
# vb: /research thuisbatterij subsidie 2026 SDE++
# vb: /research zelfverbruik percentage gemiddeld huishouden NL
```

## Bronnen-prioriteit

### Tier 1 — autoriteit (gebruik altijd indien beschikbaar)
- .nl overheid (rijksoverheid.nl, rvo.nl, belastingdienst.nl)
- .gov / EU instellingen
- TNO, CBS, PBL
- Toezichthouders (ACM, AFM)
- Wetten.overheid.nl

### Tier 2 — gerenommeerd
- NOS, NRC, Volkskrant (voor nieuws-haakjes)
- Vakbladen (Solar Magazine, Energie+)
- Universiteiten / kenniscentra (.nl/.eu)

### Tier 3 — sectorpartijen (vermeld als bias)
- Branche-organisaties (Holland Solar, Energie-Nederland)
- Energieleveranciers (vermeld dat ze partij zijn)

### Tier 4 — commercieel (vermijd als primaire bron)
- Concurrenten (Zonneplan, 1KOMMA5°, Sessy) — alleen voor context, niet als bron
- Energievergelijkers
- Influencers / blogs zonder claims-onderbouwing

NOOIT:
- Wikipedia als enige bron (wel: starting point)
- Forum posts / Reddit als bron
- AI-generated content elders (kan halucinaties bevatten)

## Flow

### 1. Decompose query
Breek topic in deelvragen:
- Definitie / wat is het
- Status / huidige situatie
- Cijfers / quantificering
- Datum / tijdslijn
- Tegen-perspectief / kritiek

### 2. Parallel search
WebSearch + WebFetch op meerdere queries:
- "<topic> rijksoverheid 2026"
- "<topic> CBS data"
- "<topic> wet" / "<topic> regeling"
- Recent: "<topic> 2026" om verouderd te vermijden

### 3. Per bron extracteren
Voor elke gevonden bron:
- URL
- Auteur (indien individueel persoon)
- Publicatiedatum (kritisch — outdated bronnen markeren)
- Organisatie + tier
- Kerncitaten (max 1× per bron, <15 woorden, in quotes)
- Cijfers met eenheid

### 4. Conflict detection
Als bronnen elkaar tegenspreken:
- Markeer expliciet
- Geef gewicht op basis van tier + datum
- Suggereer welk getal/feit te gebruiken

### 5. E-E-A-T markers verzamelen
Voor het uiteindelijke artikel:
- **Experience**: case study / praktijkvoorbeeld?
- **Expertise**: wie kan auteur zijn (Juan? expert quote?)
- **Authoritativeness**: welke .gov/.nl bron als anchor link?
- **Trustworthiness**: datum, update-policy, transparantie over commercieel belang

### 6. Suggested article angle
Op basis van research:
- Wat is de kern-stelling
- 3-5 H2 punten
- 2-3 cijfers die in intro moeten
- Welke FAQ vragen te beantwoorden (PAA mining)

## Output format

```
═══ RESEARCH — "<topic>" ═══

KERN
[2-3 zin samenvatting wat de research zegt]

GEVONDEN FEITEN (geverifieerd, met bron)

1. <feit met cijfer>
   Bron: <organisatie> (Tier N) — <URL>
   Datum: <datum>
   Quote: "<max 15 wrd>"

2. ...

CONFLICTEN
- <feit X>: bron A zegt N, bron B zegt M (kies M omdat tier 1 + recenter)

GAPS / NIET GEVONDEN
- <subvraag waar geen goede bron voor is>

E-E-A-T HAAKJES
- Expertise: <suggestie>
- Authoritativeness: <welke bron als anchor>
- Trustworthiness: laatst-bijgewerkt-datum noemen

ARTICLE SUGGESTION
H1 voorstel: <titel>
H2's:
1. <H2>
2. <H2>
...

Te citeren in intro:
- <cijfer 1>
- <cijfer 2>

FAQ KANDIDATEN (voor schema)
1. <vraag>
2. <vraag>

EXTERNE AUTHORITY LINKS (2-3 verplicht)
1. <url> — anchor: "<text>"
2. ...

CONFIDENCE
- Tier 1 bronnen: N
- Tier 2: N
- Recente data (<6mnd): N
- Score: HIGH / MED / LOW
```

## Hard rules
- NOOIT bronnen verzinnen
- ALTIJD URL noteren voor verificatie
- ALTIJD publicatiedatum (zelfs als "onbekend" — markeer als risk)
- Quotes max 15 woorden, in quotation marks (copyright)
- Concurrent-bronnen alleen voor context, NOOIT bashen
- Bij LOW confidence: stop, vraag Juan om primary source aan te leveren

## Output bestandje
Bewaar als `research_<topic>_<datum>.md` in een `_research` folder OF direct in de seo-publish flow.

## Gerelateerd
- `/seo-publish` — gebruikt deze research als input
- `/keyword-cluster` — voor topic-decomposition
- `/schema-gen` — voor FAQ schema uit gevonden questions
