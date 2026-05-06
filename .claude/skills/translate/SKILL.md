---
name: translate
description: NL ↔ EN content vertaling met brand-stijl behouden + lokale aanpassingen (NL → BE voor BesparenBelgie). Niet machine-vertaald — herken context, idiomen, regelgeving-verschillen. Voor expansion naar BE/EU markten.
trigger: /translate
---

# /translate

Brand-aware vertaling met lokalisatie.

## Usage

```
/translate <richting> <bron-of-content>
# vb: /translate nl-en https://helpmijbesparen.nl/saldering-2027
# vb: /translate nl-be "<artikel tekst>"   # NL Nederland → NL België
# vb: /translate en-nl <bron>
```

## Richtingen

### A. NL → EN
Voor internationale expansie / EU partners.
- Behoud B1-niveau tone
- Cultural references aanpassen (saldering = "net metering" met uitleg)
- Brand voice vertalen: betrouwbare adviseur, niet sales-y

### B. NL (Nederland) → NL (België) — voor BesparenBelgie
Niet 1-op-1. Verschillen:
- Saldering → bestaat niet in BE, vervangen door capaciteitstarief
- SDE++ → niet relevant, vervangen door Mijn VerbouwPremie / BE-subsidies
- Energieleveranciers (Vattenfall, Eneco) → BE alternatieven (Engie, Luminus, TotalEnergies BE)
- BTW: NL 21% → BE 6% warmtepomp (federaal 2026)
- "EPC label" andere methodologie BE
- Postcode systeem 4-cijfer NL → 4-cijfer BE
- Zinsbouw subtiel anders (Vlaams idioom)
- Geld-eenheid blijft EUR

### C. EN → NL
Voor research import / industry sources naar NL content.

## Wat NIET zomaar overzetten

### Regelgeving
- Saldering 2027 is NL-specifiek
- SDE++ NL alleen
- KvK NL → BCE BE (Kruispuntbank van Ondernemingen)
- BTW% verschilt
- AVG/GDPR identiek (EU breed)

### Marktreferenties
- Concurrent-namen: Sessy/Zonneplan/1KOMMA5° = NL → niet automatisch in BE landschap
- BE has Solora, Avaler, eigen spelers
- Doe altijd /research voor BE-specifiek

### Cultural
- "Lekker" → moeilijk te vertalen, omschrijven
- "Gezellig" → idem
- Vlaamse woordenschat vs Nederlandse: "lekken" (BE) vs "lekken" (NL) — same. Maar: "frigo" (BE), "koelkast" (NL).

## Glossary (HMB specifiek)

| NL (NL) | NL (BE) | EN |
|---|---|---|
| salderingsregeling | n.v.t. (capaciteitstarief) | net metering |
| terugleververgoeding | injectievergoeding | feed-in tariff |
| zonnepanelen | zonnepanelen | solar panels |
| thuisbatterij | thuisbatterij | home battery |
| zelfverbruik | eigenverbruik | self-consumption |
| rijksoverheid | federale overheid | national government |
| KvK | BCE / KBO | Chamber of Commerce |
| Belastingdienst | FOD Financiën | Tax Authority |
| RVO (Rijksdienst Ondernemend NL) | VLAIO (Vlaanderen) | — |
| NL netbeheerder (Stedin/Liander) | Fluvius (Vlaanderen) | grid operator |

## Brand voice in target language

### NL (NL) → EN
- "Wij" → "we" (warm, niet "the company")
- "Slim" / "verstandig" → "smart" / "informed"
- Cijfers altijd in EUR aanhouden (laat conversie naar GBP/USD aan lezer)
- Datums: ISO of "5 May 2026" (niet "5/5/2026" = ambiguous)

### NL (NL) → NL (BE)
- "Wij" / "u" mengen voorzichtig — BE iets formeler
- Vermijd te uitgesproken Hollandse zegswijzen
- Vlaams registry: "rekening houden met" → kan blijven, maar "om en bij" (BE) > "ongeveer" (NL)

## Flow

### 1. Source analyse
- Lees volledige source
- Identificeer:
  - Cijfers (welke moeten lokaliseren?)
  - Wetten/regels (welke vervangen?)
  - Concurrent-namen (welke vervangen of skip?)
  - Bron-links (welke werken nog in target markt?)

### 2. Vertaal sectie-voor-sectie
NIET woord-voor-woord. Per zin/paragraaf:
- Wat is intent
- Hoe zou dit native klinken
- Welke local context nodig

### 3. Lokaliseer cijfers
- Saldering 2027 (NL) → niet 1:1 vertaald, vervang door BE-equivalent of skip
- Energie-prijzen NL ≠ BE — voeg disclaimer toe of update

### 4. Lokaliseer bronnen
- rijksoverheid.nl → federale overheid BE bron
- NOS link → vrt.be of de standaard
- Engelse bron: BBC / Reuters / EU Commission

### 5. Compliance recheck (target market)
- BE: andere disclaimer-regels mogelijk
- EN: keep AVG language (EU = equally valid)
- Geen prijsgaranties, geen concurrent-bashing (universal)

### 6. SEO target language
- Keywords lokaliseren via /research in target market
- Meta tags vertaald (title <60 char in target taal)
- hreflang implementatie
- Canonical naar primary versie

## Output format

```
═══ TRANSLATE — <bron> → <target> ═══

SOURCE STATS
- Word count: N
- Reading level: B1
- Bronnen: N

TRANSLATED CONTENT
[volledige vertaling]

LOCALIZATIONS APPLIED
1. <NL specifiek term> → <BE/EN equivalent>
2. <bron-link> → <local equivalent>
3. ...

CIJFERS / DATA UPDATES
- <stat NL> → <stat target> (bron: <local source>)

NIET VERTAALD / SKIPPED
- <bv. saldering sectie — niet relevant in BE markt>

NIEUWE BRONNEN NODIG
1. <BE/EN bron voor X claim>
2. ...

SEO
- Meta title: <vertaald, <60 char>
- Meta desc: <vertaald, <155 char>
- Suggested hreflang: <code>

COMPLIANCE TARGET MARKET
[ ] Disclaimers correct
[ ] Geen prijsgaranties
[ ] Geen concurrent
[ ] Bron-links werken in target

QA AANBEVELING
- Native speaker review (BE: Vlaamse muttertongue, EN: target market)
- Recheck na 1 week (verse blik)
```

## Hard rules
- NOOIT machine-translate output zonder human review
- NL→BE is NIET 1:1 — controleer regelgeving + termen
- Brand voice behouden, niet pasted
- Bronnen lokaliseren waar van toepassing
- Memory: bij elke vertaling — `project_translate_<slug>_<lang>.md`

## Memory check
Lees: reference_hmb_brand. CLAUDE.md §12 BesparenBelgie keywords. Zoek bestaande BE-vertalingen voor consistency.
