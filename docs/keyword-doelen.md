# Zoekwoorddoelen — juandiazllc.com en diazatlas.com

Per pagina: op welke vraag hij mikt, wat er vandaag staat, en of dat twee
dezelfde dingen zijn. Gemeten op 2026-09-22, van buitenaf, met alleen GET's.

Dit document hoort bij `docs/backlink-strategie.md`. Dat gaat over wie naar
je wijst; dit gaat over waar je op gevonden wordt. De twee delen één
beperking, en die staat hieronder als eerste.

## 0. Er is geen zoekvolume, en dat blijft zo tot er een sleutel is

In dit document staat geen enkel zoekvolume, geen moeilijkheidsscore en geen
positie. Niet omdat het niet uitmaakt, maar omdat er niets is om ze uit te
lezen:

| bron | stand op 2026-09-22 |
|---|---|
| DataForSEO | `DATAFORSEO_LOGIN` en `_PASSWORD` staan in `.env.example`, nul regels in `.env.local` |
| Ahrefs | `subscription-info-limits-and-usage` geeft `{"error":"Insufficient plan"}` op het gratis endpoint |
| Search Console | het DNS-TXT-record staat er; of de property geverifieerd is, is alleen ingelogd te zien |
| Plausible | de acht doelen zijn nog niet aangemaakt, dus kliks komen binnen en gaan weg |

Een verzonnen volume leest als een meting en wordt binnen een maand
overgeschreven als feit. Wat hier wél staat is gemeten: welke woorden er op
de pagina staan, hoe lang ze zijn, en welke van onze eigen pagina's elkaar in
de weg zitten. Dat is genoeg om de fouten te zien die hieronder staan.

De volgorde blijft dus: eerst de acht Plausible-doelen (`MANUAL_TASKS.md`),
dan Search Console verifiëren, dan pas praten over volumes.

## 1. Hoe er gemeten is

Per URL uit de sitemap één GET, en daaruit `<title>`, `<h1>` en de
meta-description. Negatieve controle: `example.com` — die gaf een titel zonder
enig van onze woorden, dus de extractie las werkelijk de pagina.

Twee valkuilen zaten in de meetlat zelf en zijn allebei gecorrigeerd voordat
er iets op deze lijst kwam:

- Een regex die `name="description"` vóór `content=` eiste, meldde ontbrekende
  descriptions op diazatlas. Die pagina's zetten `content=` eerst. De
  descriptions staan er gewoon.
- Dezelfde extractie strippte `<br>` en maakte van de Atlas-H1
  `15 minutes.Sketch.` Op het scherm staat daar een regelafbreking. Geen bug.

Zie [[feedback_verify_the_measuring_stick]].

## 2. juandiazllc.com — wat er gemeten is

### Sectorpagina's: goed, laat staan

Alle vier openen met de dienst en de sector, niet met een slogan:

| pagina | titel |
|---|---|
| `/nl/sectors/energy` | Operations consultant energie & zon |
| `/nl/sectors/real-estate` | Operations consultant vastgoed |
| `/nl/sectors/hospitality` | Revenue- en operations consultant horeca |
| `/nl/sectors/adjacent` | Operations consultant voor operators |

Dat is de vraagzin van de lezer, in zijn volgorde. `lib/sectors.test.ts`
bewaakt de lengte al. Hier is niets te doen.

### De rekenmachine: één taal van de vier viel uit de toon — opgelost

`/tools/energy-roi` rekent door wat het einde van de salderingsregeling kost.
Drie van de vier talen droegen het woord waarmee je zo'n pagina zoekt. Het
Nederlands niet:

| taal | titel vóór 2026-09-22 | actiewoord |
|---|---|---|
| en | Energy ROI calculator — net metering 2027 | calculator |
| de | Energie-ROI-Rechner — Einspeisung ab 2027 | Rechner |
| es | Calculadora de ROI energético — saldo 2027 | Calculadora |
| **nl** | **Energie-ROI — de saldeer-som voor 2027** | **geen** |

"Saldeer-som" kwam in deze hele repo precies één keer voor: in die titel. De
pagina eronder gebruikt het niet, de beschrijving niet, de artikelen niet.
`lib/insights.ts` draagt wél "saldeervoordeel" en "saldeertarief" — echte
woorden uit de energiewereld. "Saldeer-som" was dat niet.

Staat nu: **Salderingsregeling 2027 berekenen — gratis tool** (47 tekens, de
`TITLE_BUDGET` is 48). De beschrijving hoefde niet mee: die opende al met
"Reken door", noemt 2027 en noemt de thuisbatterij.

Bewaakt door `lib/zoekwoorden.test.ts`: lengte, een actiewoord per taal, de
wettelijke naam van de regeling in het Nederlands, en vier verschillende
titels.

### De lekkage-scan: een merknaam, en dat mag

`/nl/tools/lekkage-scan` heet "Lekkage-scan: waar je omzet weglekt",
`/tools/leak-scan` "Leak scan: where your revenue leaks". Niemand tikt dat in.
Dat is ook niet waar hij voor is: het is een leadmagneet die bereikt wordt
vanaf de site, vanuit LinkedIn en uit de scan-reeks. Een zoekwoord erin
proppen maakt hem niet vindbaar en wel lelijker. Laat staan.

### `/pricing`: "GDPR" waar de Nederlandse lezer "AVG" zegt

De Nederlandse titel is "Prijzen — DEUS CRM, EU-gehost, GDPR-klaar". GDPR is
de Engelse afkorting; de Nederlandse wet heet de AVG, en dat is wat een
Nederlandse inkoper intikt en in zijn eigen documenten leest. De Duitse
pagina doet het wél goed — die kent DSGVO als eigen term.

**Niet gewijzigd**, met opzet. De prijspagina draagt gegenereerde blokken
(`scripts/regenerate-pricing.mjs`, `--check` in CI) en drie poorten
(`lib/pricing-md.test.ts`, `lib/pricing-definitie.test.ts`,
`lib/prijsknoppen.test.ts`). Eén woord in de titel omzetten raakt die keten
niet, maar de keuze GDPR-of-AVG loopt door de hele Nederlandse kopij, de
juridische pagina's en `/pricing.md`. Dat is één beslissing, niet één string.
Staat op de operatorlijst.

### `/es/tools/energy-roi`: een Spaanse pagina over een Nederlandse wet

De Spaanse rekenmachine modelleert de Nederlandse salderingsregeling, en zegt
dat ook ("el fin del balance neto neerlandés"). Wie in het Spaans zoekt, zoekt
niet daarnaar. De pagina is niet fout, hij is onbereikbaar via zoek. Of dat
erg is hangt ervan af of de ES-locale ooit iets anders moet dragen dan
vertaling — dat is een beslissing, geen fix.

## 3. Drie eigen pagina's op één zoekterm

Dit is de scherpste vondst van de meting, en hij is groter dan deze repo.

| eigenaar | URL | titel, gemeten 2026-09-22 |
|---|---|---|
| eigen domein | `salderingsregeling2027.nl` | Salderingsregeling 2027 — Alles over het einde van salderen |
| deze site | `/nl/work/salderingsregeling-2027` | Salderingsregeling 2027 — de afbouw |
| deze site | `/nl/tools/energy-roi` | Salderingsregeling 2027 berekenen — gratis tool |

Drie eigen pagina's, één term. De rekenmachine hoort daar: "berekenen" is een
andere vraag dan "wat is het", en dat verschil is precies de reden dat zijn
titel nu die van de veldgids níét meer overlapt — `lib/zoekwoorden.test.ts`
houdt dat zo.

De twee eerste rijen zijn het probleem. Een exact-match-domein en een
portfoliopagina met bijna dezelfde titel. Drie manieren om dat op te lossen:

1. **De portfoliopagina hertitelen** naar wat hij werkelijk is — het verhaal
   van de build, niet de veldgids zelf. Bijvoorbeeld "Salderingsregeling 2027
   — de build erachter" (43 tekens, past).
2. **Niets doen** en beide laten staan. Het zijn verschillende domeinen; ze
   kunnen naast elkaar bestaan.
3. **De portfoliopagina naar het domein laten wijzen** met een prominente
   uitgaande link, zodat het exact-match-domein het signaal krijgt.

**Niet uitgevoerd, en dat is met opzet.** Optie 1 is een pagina bewust
zwakker maken op een term. Dat is alleen verstandig als je wéét welke van de
twee vandaag gevonden wordt, en dat is precies wat er zonder Search Console
niet te zien is (§0). Een verkeerde gok kost de enige pagina die er staat.
Beslissing voor Juan, na de Search-Console-verificatie.

## 4. diazatlas.com — twee harde vondsten

### Er is geen prijspagina, alleen een sprong naar een anker

**Eerst gemeten, en fout gelezen.** Een GET op `https://diazatlas.com/pricing`
gaf 200 en exact dezelfde 113.112 bytes als de homepage, met dezelfde sha256
(`898bfff19cf2734b…`). Daaruit las ik "twee URL's, één pagina". Wat er
werkelijk gebeurde is dat `urllib` de omleiding volgde.

**Hermeten zonder de omleiding te volgen:**

| URL | uitkomst |
|---|---|
| `/pricing` | **307** → `/#pricing` |
| `/features` | 404 |
| `/nl/pricing` | 404 |
| `/de/pricing` | 404 |

De regel staat in `landing/vercel.json:121`. Er is dus geen prijspagina en
geen URL die op een prijsvraag kan staan — alleen een sprong naar een anker
op de homepage, en die sprong bestaat alleen in het Engels. Zie
[[feedback_verify_the_measuring_stick]]: een client die omleidingen volgt,
laat een 307 eruitzien als een 200.

Wie zoekt op
"Diaz Editor price", "CAD software eenmalig kopen" of "CAD zonder abonnement
prijs" komt uit op een homepage. Voor een product van €197 eenmalig, waarvan
het hele onderscheid mét de markt "geen abonnement" is, is dat de duurste
ontbrekende pagina die er is.

**Te doen in `bongartzdiaz/diaz-editor`:** een echte `landing/pricing.html`
met een eigen titel, eigen H1, de vergelijking eenmalig-versus-abonnement en
een eigen canonical. Vier talen, want het prijsargument is in het Duits het
sterkst ("Kein Abo").

### Drie van de vier titels worden afgekapt

| taal | tekens | wat er wegvalt boven 60 |
|---|---|---|
| en | 58 | — |
| es | 61 | de laatste `€` |
| nl | 67 | "levenslang" |
| de | **77** | **"€197 Lebenslang"** |

De Duitse titel verliest zeventien tekens, en dat zijn precies de zeventien
die het verschil met een abonnement dragen. Het staat er, het wordt niet
getoond.

**Te doen:** de vier titels binnen 60 tekens, met de prijs vóór de doelgroep
in plaats van erna. Bijvoorbeeld DE: "Diaz Editor — CAD einmalig €197, kein
Abo" (41).

### Wat er wél goed staat

- De meta-descriptions staan op alle gemeten pagina's, in alle vier de talen.
  De eerdere melding dat ze ontbraken was een fout in mijn eigen regex (§1).
- hreflang staat compleet met `x-default` op de gemeten pagina's.
- `/download` is scherp getiteld: "Download Diaz Editor — free 14-day trial,
  no credit card" (56 tekens, past).
- De blog draagt een echte longtail in vier talen
  (`/blog/cad-software-for-electricians-2026`,
  `/de/blog/cad-software-einmalig-kaufen-2026`, …). 321 URL's in de sitemap.
  Daar is het zoekwoordwerk al gedaan.

## 5. De eigen domeinen eromheen

**Ingeperkt door Juan op 2026-09-22: alleen `juandiazllc.com` en
`diazatlas.com`.** Wat hieronder staat is daarmee een meting en geen
takenlijst. Het blijft staan omdat het gemeten is en omdat één rij een
feitelijke fout in onze éigen kopij aanwijst — zie `performancetracker.nl`
onderaan deze sectie. Die rij gaat niet over zoekwoorden en valt niet onder de
inperking: hij zegt dat een pagina op `juandiazllc.com` een product beschrijft
dat op dat domein niet te vinden is.

Gemeten op dezelfde dag, dezelfde manier.

| domein | titel | oordeel |
|---|---|---|
| `voltafy.nl` | Voltafy, Energie in eigen handen \| Zonnepanelen, thuisbatterij & warmtepomp | goed — draagt drie productcategorieën |
| `salderingsregeling2027.nl` | Salderingsregeling 2027 — Alles over het einde van salderen | goed — zie §3 voor het overlapprobleem |
| `performancetracker.nl` | Performance Tracker — Voltara | zwak, en er is iets anders aan de hand — zie hieronder |
| `besparenbelgie.online` | **Besparen Belgie** | de grootste titelmisser van de hele estate |

### ~~`besparenbelgie.online`: twee woorden~~ — buiten scope sinds 2026-09-22

De titel is "Besparen Belgie". De meta-description eronder is wél scherp —
"Bespaar op je energiekosten met zonnepanelen en thuisbatterijen in België!" —
dus de inhoud is er. De titel gooit hem weg. Eén regel in het template lost
dit op, bijvoorbeeld "Zonnepanelen & thuisbatterij België — wat bespaar je?"

### `performancetracker.nl`: domein en portfoliopagina beschrijven iets anders

- Het domein zegt: "Performance Tracker — Voltara", description "Team
  prestaties, real-time inzicht, resultaat gedreven."
- `juandiazllc.com/nl/work/performance-tracker` zegt: "Live opbrengst,
  verliesanalyse en meldingen voor zonne-eigenaren en installateurs."

Teamprestaties tegen zonneopbrengst. Dat is geen zoekwoordkwestie maar een
claim die niet klopt — óf het product is van richting veranderd en de
portfoliopagina loopt achter, óf het domein draait iets anders. **Niet
gewijzigd**: een cijfer of een claim invullen zonder te weten welke van de
twee waar is, is precies wat `docs/claims.md` moet voorkomen. Vraag voor Juan.

### Geen H1 op drie van de vier

`salderingsregeling2027.nl`, `besparenbelgie.online` en
`performancetracker.nl` serveren geen `<h1>` in de HTML.
`juandiazllc.com` en `diazatlas.com` doen dat wel. Een H1 is geen
rankingknop, maar hij is wel het eerste wat een extractie — van Google tot
een AI-crawler — als onderwerp van de pagina leest. Drie sites laten dat veld
leeg.

## 6. Wat er vandaag veranderd is

| wat | waar |
|---|---|
| NL-titel van de rekenmachine naar de taal van de vraag | `lib/i18n/dict.ts` |
| poort eronder: lengte, actiewoord per taal, wettelijke naam, geen dubbele titel met de veldgids | `lib/zoekwoorden.test.ts` |
| dit document | `docs/keyword-doelen.md` |

Eén titel. De rest van deze lijst is bewust niet uitgevoerd: drie items
wachten op een beslissing van Juan (§2 AVG, §3 de portfoliopagina, §5
Performance Tracker) en drie horen in een andere repo (§4, §5 BesparenBE).

## 7. Hoe je dit hermeet

```bash
python kw.py https://juandiazllc.com "nl/(tools|work|sectors|pricing|services)"
```

`kw.py` staat in de scratchpad van de sessie van 2026-09-22 en is twintig
regels: sitemap ophalen, per URL één GET, titel/H1/description eruit. Neem
`example.com` mee als negatieve controle — zonder die controle leest een lege
uitkomst als een schone meting.

Hermeet zodra één van deze drie waar is: de Plausible-doelen staan, Search
Console is geverifieerd, of er is een DataForSEO-sleutel. Tot die tijd
verandert er aan §0 niets en aan de rest weinig.
