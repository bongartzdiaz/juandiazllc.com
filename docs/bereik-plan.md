# Bereik — niche, links en leadmagneten

Geschreven 2026-08-23, na drie vragen op één dag: de link-buildingprompts
implementeren, verder nichen, en meer leadmagneten maken. Ze horen bij elkaar en
er zit een volgorde in, want twee ervan hangen aan de eerste.

Dit document vervangt niets. `docs/seo-geo-plan.md` beschrijft de drie spellen
(entiteit, topical, GEO), `docs/lead-magnet.md` de lekkage-scan en
`docs/aanbod.md` het aanbod. Hier staat wat die drie samen betekenen zodra je
smaller gaat richten.

---

## §0 — De grens die vooraf gaat

De promptpakketten op de werkmachine zijn **commercieel materiaal van derden**.
Er is een gebruiksrecht, geen distributierecht. Dat betekent drie dingen, en ze
zijn geen van drieën onderhandelbaar:

1. **Niets uit die pakketten komt in deze repo.** `bongartzdiaz/juandiazllc.com`
   is publiek — gemeten, niet aangenomen. Een prompt die hier belandt is
   gepubliceerd, ook als niemand hem leest.
2. **Ze kunnen niet als leadmagneet weg.** Weggeven aan een lijst is
   doorverspreiden. Dit raakt de derde vraag rechtstreeks: "gratis prompt packs"
   kan wel, maar dan met een pakket dat van Juan zelf is.
3. **Wat er wél uit mag komen zijn de uitkomsten.** Een doelgroepkeuze, een
   lijst met linkdoelen, een tekst die jij schrijft — dat is jouw werk, ook als
   een prompt eraan hielp.

Dit document beschrijft daarom in eigen woorden wat de pakketten kunnen, en
citeert er niets uit.

---

## §1 — Wat er gemeten is, vandaag

| | stand | bron |
|---|---|---|
| artikelen | 21, waarvan **11 met tag Energy** | `lib/insights.ts` |
| marktgebonden clusters | NL 6 · DE 3 · ES 3 | idem |
| vastgoed / horeca | 2 artikelen elk | idem |
| bevestigde klantuitkomsten | 4, waarvan **3 energie**; 2 dragen een markt (NL, NL/BE), 2 geen | `docs/claims.md` |
| tools | 2 — `lekkage-scan` staat **alleen op /nl**, `energy-roi` in vier talen maar met een Nederlands model | `lib/i18n/enkele-taal.ts` · `components/calculators/EnergyRoi.tsx` |
| leads ooit | **0 rijen** in `marketing.leads` | Supabase `wbgiouuifqhasedncysw` |
| Plausible-doelen | **niet aangemaakt** (het script draait wel op productie) | dashboard |
| DataForSEO | **inloggegevens niet gezet** | omgeving |
| Ahrefs | antwoordt "Insufficient plan" op elke aanroep — **ook op `public-domain-rating-free`**, gemeten 2026-08-23 | connector |
| `RESEND_API_KEY` | **niet gezet** op de edge functions | Supabase |
| backlinkprofiel | **niet meetbaar** — zie de aanname hieronder | — |

Vier van die elf regels zijn instrumenten die uitstaan. Dat is de reden dat
hieronder telkens staat wat wél en niet toetsbaar is.

**De aanname onder dit hele document, expliciet omdat het een aanname is.** Er
is van hieruit geen enkel backlinkgetal te meten: Ahrefs weigert ook zijn eigen
gratis endpoint en DataForSEO heeft geen inloggegevens. Wat er wél staat is een
afwezigheid van bewijs in de andere richting — er is in deze repo geen enkele
geplaatste pitch, geen enkele verdiende link en geen enkele vermelding
vastgelegd, en `docs/lucenai-backlinks.md` beveelt nog steeds de allereerste
link aan. Ik reken hieronder daarom met een domein zonder autoriteit. **Dat is
een aanname, geen meting**, en de eerste die hem kan vervangen is DataForSEO.

---

## §2 — De niche is er al, hij staat alleen niet op de site

De vraag was om verder te nichen. Het bewijs zegt dat het grotendeels al gebeurd
is en dat de **positionering** is achtergebleven.

**Wat de site zegt:** vier sectoren — energie, vastgoed, horeca, aangrenzend.

**Wat het bewijs zegt:**

| | |
|---|---|
| klantuitkomsten | zonne-installateur (NL) · energiemakelaar (NL/BE) · thuisbatterij-installateur · multi-locatie operator |
| markt | twee dragen er een: NL en NL/BE. De andere twee staan zonder markt in `claims.md` |
| inhoud | meer dan de helft energie |
| werkende trechter | alleen NL-energie: saldering-cluster → `/tools/energy-roi` → `/tools/lekkage-scan` → `/contact` |

Drie van de vier bewijzen komen uit één vertical. De inhoud staat daar en de
trechter staat daar. Vastgoed en horeca hebben twee artikelen elk, en
`docs/seo-geo-plan.md` noemt dat zelf al "de slechtste stand: genoeg om
onderhoud te kosten, te weinig om te ranken".

**Voorstel: NL/BE energie-installateurs en -makelaars.** Zonnepanelen,
thuisbatterij, energielevering. De DE- en ES-clusters blijven staan — dat is
dezelfde vertical in een andere markt, niet een tweede vertical.

**Wat dat kost, eerlijk.** Twee sectoren uit de navigatie, vier artikelen die
hun cluster verliezen, en een smaller aanbod naar buiten. Wie vandaag op
`/sectors/hospitality` binnenkomt en boekt, komt er dan niet meer. Gemeten zijn
dat er nul — maar nul is ook geen bewijs dat het niet kán.

**Dit is een beslissing van Juan.** Nichen bepaalt wat je verkoopt, en dat staat
niet in een repo.

---

## §3 — De 36 prompts, eerlijk getrieerd

Het pakket bestrijkt zes gebieden. Tegen déze site, vandaag:

| gebied | kan het draaien? | waarom |
|---|---|---|
| backlinkprofiel auditen en opschonen | **nee** | er is geen databron: Ahrefs weigert ook zijn gratis endpoint, DataForSEO staat uit. En zolang de aanname uit §1 klopt is er geen profiel om te auditen |
| een eigen data-asset bouwen | **ja** | grootste hefboom, zie §4.1 |
| journalisten pitchen | **ja, met grenzen** | `docs/pitch-template.md` bestaat al met Tier-1-doelen. Grenzen in §4.2 |
| gebroken links terugwinnen | **nee, geblokkeerd** | vergt een backlink-index van concurrentdomeinen. DataForSEO |
| workflow, attributie, ROI-rapportage | **nee, geblokkeerd** | attributie vergt Plausible-doelen. Die bestaan niet |
| Wikipedia-citaties, ongelinkte vermeldingen | **deels** | vermeldingen monitoren vergt een bron. Wikipedia is voor een commercieel domein zonder gevestigde bekendheid bovendien lage opbrengst en hoog risico op verwijdering |

**Twee van de zes kunnen vandaag.** Drie zijn geblokkeerd op instrumenten die al
op de operator-lijst staan. Eén is niet van toepassing.

Dat is geen kritiek op het pakket. Het is geschreven voor een site die al
autoriteit heeft; op een domein zonder verdiende links begint het bij hoofdstuk twee.

---

## §4 — Wat er wél vandaag kan

### 4.1 Een data-asset dat niemand anders heeft

Dit is de enige linkbron die zonder bestaande autoriteit werkt: iets publiceren dat
journalisten en vakbladen moeten citeren omdat het nergens anders staat.

De haak is zeldzaam sterk: **1 januari 2027**. Een harde wettelijke datum, één
markt, en een sector die er niet klaar voor is.

**Voorstel: een enquête onder NL/BE zonne-installateurs over hun
post-salderingsgereedheid.** Wat vertellen ze klanten nu, wat rekenen ze voor,
hoeveel offertes bevatten al een batterij. Dat cijfer bestaat niet publiek.
Solar Magazine, de installateursvakbladen en de energieredacties hebben het
nodig zodra de deadline dichterbij komt.

Wat het vergt: een steekproef die groot genoeg is om te publiceren, een
methodologiesectie die kritiek overleeft, en eerlijkheid over de omvang. Een
kleine steekproef mag — een verzwegen steekproefomvang niet.

**Wat dit blokkeert:** je hebt respondenten nodig, en dat is bereik dat er nu
niet is. Vandaar §5.

### 4.2 Pitchen, binnen grenzen die al vastliggen

`docs/pitch-template.md` noemt Solar Magazine (NL), PV Magazine (DE), Tweakers
en El Confidencial. Twee harde grenzen, en die komen niet uit dit document maar
uit afspraken die er al lagen:

- **elke verzending vraagt akkoord per stuk.** Er gaat niets namens Juan de deur
  uit zonder dat hij het gezien heeft.
- **koude e-mail naar Duitsland gaat niet.** PV Magazine DE valt daarmee af als
  koud kanaal. Via een introductie of een reactie op hun eigen oproep mag wel.

De goedkoopste eerste stap staat al beschreven en kost een minuut: laat
`lucenai.eu/about` de naam Juan Diaz naar `juandiazllc.com/en/about` linken
(`docs/lucenai-backlinks.md` §3). Eén link vanaf een domein zonder autoriteit —
de SEO-waarde is bijna nul, de entiteitswaarde bescheiden maar echt.

---

## §5 — Leadmagneten: het kanaal is donker

Er staat er al één sinds 2026-08-22 (`/nl/tools/lekkage-scan`) en een
rekenmachine (`/tools/energy-roi`, in vier talen maar met een Nederlands
saldering-model). Samen hebben ze **nul leads** opgeleverd.

Dat cijfer betekent niet dat ze niet werken. Het betekent dat we het niet weten:

| | |
|---|---|
| bezoekers | onbekend — Plausible-doelen bestaan niet |
| e-mail bij een inzending | **gaat niet de deur uit** — `RESEND_API_KEY` staat niet op de edge functions |

**Een nieuwe leadmagneet bouwen vóór dat kanaal open is, is opvang bouwen boven
een afvoer die dicht zit.** Wie converteert krijgt niets terug, en je ziet het
niet gebeuren. Dat is exact de toestand die de leadketen-meting van 20 augustus
blootlegde.

### Volgorde die hieruit volgt

1. **Doelen aanmaken en de sleutel zetten.** Operator-acties die al op de lijst
   staan. Zonder stap 1 is elke volgende stap onmeetbaar.
2. **De bestaande twee eerst laten werken.** De scan wordt vanaf drie plekken
   gelinkt (`/nl/services`, `/nl/tools/energy-roi`, en onder elke NL-energiepost).
   De rekenmachine staat in vier talen met een model dat alleen voor NL klopt —
   dat is beslissing 3 hieronder, niet iets om er stilzwijgend bij te doen.
3. **Dán een derde**, en die volgt uit §4.1: **de enquête ís de leadmagneet.** Je
   vraagt installateurs mee te doen en geeft het volledige rapport terug vóór
   publicatie. Dat levert in één beweging respondenten, e-mailadressen en het
   data-asset op.
4. **Een eigen promptpakket** kan daarna: de prompts waarmee jij een operatie
   doorlicht. Dat draagt je methode in plaats van andermans product weg te geven.

### Wat een gratis cursus zou vergen

Kan, maar het is de duurste vorm en de traagste. Een cursus vraagt onderhoud,
een afleverplatform en een reden waarom hij beter is dan het artikel dat er al
staat. Op een lijst van nul abonnees is de opbrengst per uur werk lager dan bij
1, 2 en 3. Niet nu.

---

## §6 — Beslissingen die van Juan zijn

1. **Nichen naar NL/BE energie, ja of nee?** Zo ja: gaan vastgoed en horeca uit
   de navigatie, of blijven ze staan zonder verdere investering? Beide kan; de
   slechtste uitkomst is ze houden én blijven onderhouden.
2. **De enquête: doen we die?** Het is de enige linkbron in dit document die op
   een domein zonder autoriteit werkt, en hij kost tijd om respondenten te vinden.
3. **De rekenmachine-route** (stond al open in `docs/seo-geo-plan.md` §3): één
   tool die zich per taal aanpast, of aparte tools per markt. De DE- en
   ES-trechter loopt tot die tijd dood.

---

## §7 — Wat hier niet beloofd wordt

- **Geen termijn.** Autoriteit opbouwen vanaf niets duurt kwartalen, niet weken,
  en niemand kan zeggen hoeveel.
- **Geen aantal links.** Elke belofte over "N backlinks" is een verkoopcijfer,
  geen prognose.
- **Geen conversiecijfer voor een leadmagneet** zolang §5 openstaat. Er is geen
  basislijn om tegen af te zetten.
- **Geen uitspraak over verkeer** tot Plausible meet. Alles hierboven over
  bereik is een redenering over structuur, geen meting van publiek.
