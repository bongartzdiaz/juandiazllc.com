# Bereik — niche, links en leadmagneten

Geschreven 2026-08-23, na drie vragen op één dag: de link-buildingprompts
implementeren, verder nichen, en meer leadmagneten maken. Ze horen bij elkaar en
er zit een volgorde in, want twee ervan hangen aan de eerste.

**§2 is op 2026-08-23 herzien.** De eerste versie beval aan te nichen op
energie; dat bleek de verkeerde vraag. De vraag is niet welke sector, maar
welke wettelijke datum de rekensom van een markt breekt — en dat filter wijst
twee andere markten aan.

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

## §2 — Niet nichen op sector. Nichen op de vorm, en dan de datum als filter.

> **Herzien 2026-08-23.** De eerste versie van dit hoofdstuk beval aan om te
> nichen op NL/BE-energie. Dat was fout, en op een herkenbare manier: het
> optimaliseerde op waar het bewijs toevallig ligt in plaats van op waar het
> probleem het ergst is. Vier van de vijf ventures zijn energie, dus stapelde
> het bewijs zich daar op. Dat maakt energie de **steekproef**, niet de markt.

### Wat de dienst werkelijk repareert

`services.how.s1.body`, in vier talen:

> een diagnose van één pagina: waar je operatie en je cijfers uit elkaar lopen.

Dat is geen sector. Dat is een **vorm**: een operator die een terugkerende
beslissing van formaat neemt op een getal dat uit het systeem van een ander
komt, en het niet kan controleren.

De vier sectorpagina's zeggen dat zelf al, elk in hun eigen woorden:

Woordelijk uit de Nederlandse strings in `lib/sectors.ts`, niet vertaald:

| sector | de leknamen op zijn eigen pagina |
|---|---|
| energie | Cijfers die de leverancier uitkomen · Aannames van vóór 2027 · Tooling voor installateurs |
| vastgoed | Blind op portefeuilleniveau · Verzonnen verduurzamingsrekensom · ESG als jaarlijkse paniek |
| horeca | Kanaalchaos · Blind op omzet · Gastdata blijft liggen |
| aangrenzend | *"Overal waar operators een P&L hebben en slechte software."* — de tagline zelf |

Vier keer hetzelfde defect, vier keer een andere sector eromheen.

### Waarom energie dan wél werkte

Niet omdat het energie is. Omdat er vier dingen tegelijk waar zijn, en die
combinatie is zeldzaam:

1. **een harde datum waar niemand omheen kan** — 1-1-2027
2. **het getal komt van een partij met een belang** — het dashboard is gebouwd
   door wie de installatie verkocht
3. **de operatie draait op spreadsheets** — zichtbare pijn, geen abstractie
4. **NL/BE-specifieke regelgeving** — dunne concurrentie, geen Amerikaanse
   inhoud om tegenop te boksen

Punt 1 is de motor. Een lek zonder klok blijft eeuwig op de lijst staan; een
lek met een datum wordt dit kwartaal een opdracht.

### De test, en wat hij oplevert

**Welke NL/BE-markt krijgt binnenkort een datum die de bestaande rekensom
breekt?** Drie haken nagetrokken op 2026-08-23:

| markt | haak | datum | hardheid |
|---|---|---|---|
| transport & logistiek | **ETS2** — CO2-beprijzing op brandstof, doorberekend door leveranciers | veiling **gepland** jan 2027; eerste inlevering **2029** over 2028 | **middel** — zie de correctie hieronder |
| vastgoed / utiliteitsbouw | **EPBD IV** — slechtst presterende utiliteitsgebouwen naar **energielabel D** | **1 januari 2030**; eisen voor 2033 nog niet vastgesteld; regels in het Bbl **uiterlijk 2027** | **hard** |
| gebouwbeheer | **ETS2** op aardgas in gebouwen | idem als transport | **middel** |
| bouw | Wkb gevolgklasse 2 | **uitgesteld, geen datum** — evaluatie 2027, gk2/3 pas rond 2028 | **zacht — niet als urgentie gebruiken** |

> **Bijgewerkt 2026-08-23, na verificatie bij de uitvoerders.** Twee rijen zijn
> zwakker gebleken dan ik ze eerst opschreef, en één sterker.
>
> **ETS2 stond op "hard, jan 2027".** De NEa zegt dat de eerste veiling *gepland*
> is voor januari 2027 en dat de eerste inlevering van rechten pas in **2029**
> plaatsvindt, over de emissies van 2028. De verplichting ligt bovendien bij de
> brandstofleverancier; wanneer die het doorberekent is commercieel gedrag, geen
> wettelijke datum. De richting staat vast, het moment niet.
>
> **EPBD IV stond op "slechtste 16% / 26%".** Die percentages staan op **geen van
> beide** overheidsbronnen — ze kwamen uit een samenvatting van derden. De
> Nederlandse uitvoering drukt de eis uit in een **label**: label D uiterlijk
> 1 januari 2030, en de eisen voor 2033 zijn nog niet vastgesteld. Dat is de
> sterkere formulering, want een eigenaar kan zijn eigen label opzoeken en een
> landelijke rangorde niet.
>
> Beide correcties staan met bron en datum in `docs/claims.md`. **De rangschikking
> hieronder verandert er niet door — vastgoed wordt er juist sterker van, want
> het is nu de enige rij met een harde datum.**

Die laatste rij is de reden dat deze tabel bestaat. Bouw was mijn eerste gok —
Juan is bouwkundig getraind, de site zegt dat in vier talen, en Wkb leek de
haak. De meting zegt dat die deadline is weggeschoven. **Bouw blijft een
kandidaat, maar dan op het marge-lek** (je kent je projectmarge pas bij de
nacalculatie, maanden te laat) en dat lek heeft geen externe klok.

### Wat eruit volgt

**Transport en logistiek is de zuiverste kopie van het energiepatroon.** Zelfde
maand, zelfde mechaniek: een kostprijs per kilometer die is opgebouwd uit een
TMS, een tankpas en een planningssysteem die elkaar niet kennen, en die per
januari 2027 gaat bewegen om een reden buiten de operator om. Alle vier de
condities hierboven zijn waar.

**Vastgoed is de goedkoopste uitbreiding, en dat is een ander argument.** Het
stáát al op de site, het draagt al twee artikelen, en de data is letterlijk
dezelfde data als het energiewerk — meterstanden per pand. Wat er ontbrak was
de haak, en die is er nu: EPBD IV dwingt een eigenaar zijn eigen portefeuille
te **rangschikken** om te weten welke panden in de slechtste 16% zitten. Dat is
precies de zin die op zijn eigen sectorpagina staat als lek — "portfolio-
blindheid" — nu met een wettelijke aanleiding erachter.

**Horeca is de zwakste van de vier die er staan.** Het lek is echt, maar er is
geen externe klok en de zelfstandige exploitant is de moeilijkste betaler van
de vier. Ketens kunnen wel, maar dat is een lange verkoopcyclus.

### Wat dit niet zegt

- **Geen marktomvang.** Die is van hieruit niet te meten zolang DataForSEO
  uitstaat, en een geschat aantal bedrijven is geen meting.
- **Geen belofte dat de haak converteert.** ETS2 legt de verplichting formeel
  bij de brandstofleverancier, niet bij de vervoerder. De vervoerder voelt hem
  als kostprijs, niet als compliance-taak — dat is een andere verkoopingang dan
  saldering, waar de huiseigenaar zelf de gedupeerde is.
- **Geen tweede taal erbij.** Elke markt hierboven is NL/BE. De DE- en
  ES-clusters blijven staan; er komt niets bij tot de rekenmachine-route
  beslist is.

### De beslissing

Niet "welke sector", maar **welke tweede haak**. Eén erbij, niet drie:

| optie | kosten | wat je koopt |
|---|---|---|
| **A — transport & logistiek** | nieuw cluster vanaf nul, nieuw publiek | de zuiverste herhaling van het patroon dat aantoonbaar werkte |
| **B — vastgoed verdiepen** | twee artikelen staan er al, data overlapt met energie | het snelste resultaat, op een sector die al in de navigatie staat |
| **C — allebei** | twee clusters onderhouden naast energie | breder bereik, tragere opbouw per cluster |

Mijn voorkeur is **B eerst, A daarna** — niet omdat vastgoed het grootste
potentieel heeft, maar omdat het de enige is waar de haak nieuw is en de rest
al staat. A is het sterkere verhaal en het duurdere begin.

Horeca hoort in beide gevallen uit de navigatie of naar vier artikelen. Twee
is de stand die `docs/seo-geo-plan.md` zelf al "de slechtste" noemt.

### Bronnen

- ETS2, veiling en inlevering: [NEa — ETS-2 emissierechten](https://www.emissieautoriteit.nl/regelgeving/eu-ets-2/ets-2-emissierechten) (de uitvoerder; leidend boven de rest) · [NEa, eerste rapportageplicht](https://www.emissieautoriteit.nl/actueel/nieuws/2025/05/14/eerste-rapportageplicht-ets-2-afgerond) · [evofenedex](https://www.evofenedex.nl/actualiteiten/ets2-komt-eraan-dit-verandert-er-voor-jouw-bedrijf)
- EPBD IV en de slechtste 16% / 26%: [Rijksoverheid](https://www.rijksoverheid.nl/actueel/nieuws/2025/07/14/energiezuiniger-bouwen-en-nieuw-energielabel-door-implementatie-europese-richtlijn) · [RVO](https://www.rvo.nl/onderwerpen/wetten-en-regels-gebouwen/epbd-iv) · [DGBC](https://www.dgbc.nl/longreads/epbd-iv-verklaard-het-uitfaseren-van-slechte-energielabels-per-2030/)
- Wkb, uitstel van gevolgklasse 2: [IPLO](https://iplo.nl/regelgeving/regels-voor-activiteiten/technische-bouwactiviteit/kwaliteitsborging/wet-kwaliteitsborging-bouwen-wkb/) · [VNG](https://vng.nl/artikelen/gefaseerde-implementatie-wkb) · [Rijksoverheid](https://www.rijksoverheid.nl/themas/bouwen-en-wonen/bouwregelgeving/meer-toezicht-in-de-bouw-via-de-wet-kwaliteitsborging-voor-het-bouwen-wkb)

**Elke haak hierboven is nagetrokken op 2026-08-23 en draagt een datum die kan
schuiven — Wkb is daar het bewijs van.** Voordat er een bedrag, een deadline of
een percentage in kopij belandt, gaat het eerst door `docs/claims.md` en wordt
het opnieuw bij de bron gecontroleerd.

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

De haak is zeldzaam sterk: **1 januari 2027**. En sinds de herziening van §2 is
dat niet één markt maar drie — saldering, ETS2 op brandstof en ETS2 op
gebouwgas landen in dezelfde maand. Welke van de drie de enquête draagt volgt
uit beslissing 1; de vorm hieronder verandert er niet van.

**Voorstel bij de huidige stand: een enquête onder NL/BE zonne-installateurs
over hun post-salderingsgereedheid.** Wat vertellen ze klanten nu, wat rekenen
ze voor, hoeveel offertes bevatten al een batterij. Dat cijfer bestaat niet
publiek. Solar Magazine, de installateursvakbladen en de energieredacties
hebben het nodig zodra de deadline dichterbij komt.

**Valt beslissing 1 op transport, dan is de variant net zo sterk:** wat hebben
vervoerders doorgerekend voor ETS2, en hoeveel van hen weten hun eigen
kostprijs per kilometer per januari 2027? Dat getal bestaat evenmin publiek, en
de vakbladen hebben het even hard nodig. Bij vastgoed luidt de vraag hoeveel
eigenaren weten welke panden in de slechtste 16% van EPBD IV vallen.

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
   dat is beslissing 4 hieronder, niet iets om er stilzwijgend bij te doen.
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

1. **Welke tweede haak: transport (A), vastgoed verdiepen (B) of allebei (C)?**
   De onderbouwing en mijn voorkeur staan in §2. Dit is geen sectorkeuze maar
   een keuze welke wettelijke datum je als volgende aanleiding gebruikt.
2. **Horeca: naar vier artikelen of uit de navigatie?** Twee is de stand die
   `docs/seo-geo-plan.md` zelf "de slechtste" noemt — genoeg om onderhoud te
   kosten, te weinig om te ranken. Beide richtingen kunnen; ze houden én blijven
   onderhouden is de enige uitkomst die niets oplevert.
3. **De enquête: doen we die?** Het is de enige linkbron in dit document die op
   een domein zonder autoriteit werkt, en hij kost tijd om respondenten te vinden.
   Valt de keuze op A, dan is de vervoerder-variant even sterk als de
   installateur-variant: niemand weet wat ETS2 per kilometer gaat kosten.
4. **De rekenmachine-route** (stond al open in `docs/seo-geo-plan.md` §3): één
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
