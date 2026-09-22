# Backlinks naar juandiazllc.com — de strategie, en wat er vandaag gemeten is

**Gemeten op 2026-09-22.** Alles hieronder komt uit losse GET-verzoeken tegen
publieke adressen (`scripts/backlink-inventory.sh`, alleen lezen) of uit deze
repo. Niets is uit het geheugen overgenomen; waar een cijfer staat, staat erbij
hoe het gemeten is. Dit document gaat over **juandiazllc.com**. Voor
`lucenai.eu` staat een eigen volgorde in `docs/lucenai-backlinks.md`.

---

## 0. De nulmeting: wat er te meten valt, en wat niet

| bron | stand | gevolg |
|---|---|---|
| Ahrefs, ook het gratis DR-endpoint | `{"error":"Insufficient plan"}` op elk verzoek | geen domain rating, geen lijst verwijzende domeinen |
| Search Console | TXT-record staat in DNS; property niet geverifieerd (alleen ingelogd te zien) | het Links-rapport, de enige gratis lijst van inkomende links, is niet leesbaar |
| Plausible | doelen niet aangemaakt (operator-lijst, stap 1) | verwijzend verkeer is niet te onderscheiden van geen verkeer |
| eigen domeinen | **gemeten**, tabel in §1 | dit is de enige laag die vandaag te meten én te veranderen is |

Er is dus **geen extern nulpunt**. Dat is geen reden om niets te doen; het is
de reden om te beginnen bij wat je zelf in de hand hebt, en de meting te
verifiëren vóórdat je aan de rest begint. "Twee verwijzingen vanaf een domein
dat niet van Juan is" (de maat uit `docs/kanalen.md` §2.4) is pas te tellen
als Search Console leest.

---

## 1. Laag één — het eigen netwerk: acht domeinen, nul links

Juan beheert of bouwde acht publieke sites. **Geen van de acht linkt vandaag
naar juandiazllc.com.** Twee noemen hem wel bij naam, zonder link.

| adres | status | links → jdllc | naam zonder link | wat het is |
|---|---|---|---|---|
| `lucenai.eu/about` | 200 | 0 | **6** | Lucen AI; Juan staat er als "Co-Founder \| CTO" |
| `diazatlas.com/about` | 200 | 0 | **18** | Diaz Atlas; "Juan Diaz LLC (Delaware, USA)" in de voet, in vier talen |
| `diazatlas.com` | 200 | 0 | 13 | idem, home |
| `voltafy.nl` | 200 | 0 | 0 | venture |
| `performancetracker.nl` | 200 | 0 | 0 | venture |
| `salderingsregeling2027.nl` | 200 | 0 | 0 | eigen contentsite |
| `besparenbelgie.online` | 200 | 0 | 0 | eigen contentsite |
| `helpmijbesparen.nl` | 200 | 0 | 0 | klant van Kompas Agency |
| `philanthropyai.eu` | 301 → `lucenai.eu` | — | — | niets te doen |
| `example.com` | 200 | 0 | 0 | negatieve controle: de grep werkt |

Herhaal de meting met `bash scripts/backlink-inventory.sh`.

**Waarom dit de eerste laag is.** Een vermelding zonder link is de goedkoopste
backlink die bestaat: de tekst staat er al, er ontbreekt één `<a>`. En deze
sites gaan écht over dezelfde persoon of hetzelfde bedrijf — dat is de
redactionele reden die een link legitiem maakt. Het is geen ruil en geen
schema; het is een auteur die zijn eigen werk onder zijn naam zet.

**De regel die dit van een linknetwerk onderscheidt.** Acht domeinen die
allemaal in de voet, sitebreed, met dezelfde ankertekst naar hetzelfde adres
wijzen, zien er voor Google uit als precies wat ze zouden zijn: een netwerk.
Daarom per site **één redactionele plek** (about-pagina, colofon, auteursblok),
**geen sitebrede voet**, en een ankertekst die past bij de zin waar hij in
staat — de naam, of het bedrijf, niet "revenue operations consultant". Minder
links die kloppen slaan meer links die dat niet doen.

### 1.1 De vier die vandaag kunnen, op volgorde

| # | waar | wat | naar | eigenaar | kost |
|---|---|---|---|---|---|
| 1 | `lucenai.eu/about` | de naam "Juan Stefan Bongartz Diaz" linken | `https://juandiazllc.com/en/about` | operator, WordPress | 1 minuut. Staat al als stap 4 in `docs/lucenai-backlinks.md` §3 |
| 2 | `diazatlas.com/about` en de voet | "Juan Diaz LLC (Delaware, USA)" linken, één keer per pagina | `https://juandiazllc.com/en/about` | repo `bongartzdiaz/diaz-editor`, `landing/` | 1 PR |
| 3 | `salderingsregeling2027.nl`, `besparenbelgie.online` | een **auteursblok** onder elk artikel: naam + één zin + link | `https://juandiazllc.com/nl/about` | die repo's | 1 component per site |
| 4 | `voltafy.nl`, `performancetracker.nl` | "Gebouwd door Juan Diaz LLC" in het colofon of op de about-pagina | `https://juandiazllc.com/nl/about` (of `/en/`) | die repo's | 1 regel per site |

Rij 3 is meer dan een link. Een auteursblok op twee contentsites in de
energiesector is een **auteurssignaal**: dezelfde persoon, met dezelfde
naamvormen als in `lib/seo/branding.ts` (`PERSON_ALTERNATE_NAMES`), verbonden
aan artikelen over salderen en besparen. Dat is E-E-A-T waar een crawler het
kan zien, en het is de reden dat `/about` het doeladres is en niet de home:
`/about#juan` is het `Person`-knooppunt in het schema.

**Wat niet zonder te vragen mag: `helpmijbesparen.nl`.** Dat is een klant.
Een "gebouwd door"-regel in de voet is gangbaar, maar het is hún site en hún
beslissing. Vragen, niet zetten.

### 1.2 Wat deze laag oplevert, eerlijk

Vier tot zes links vanaf domeinen die zelf weinig autoriteit dragen. De
SEO-waarde is klein. De **entiteitswaarde** is echt: het verbindt de knopen
die over dezelfde persoon gaan, en het maakt de naamvarianten (Juan Diaz, Juan
Stefan Diaz, Juan Stefan Bongartz Diaz) tot één persoon in plaats van drie.
Dat is precies het spel dat `docs/seo-geo-plan.md` §2 beschrijft, en het is
de laag waar AI-assistenten op leunen als ze "wie is Juan Diaz" beantwoorden.

---

## 2. Laag twee — de dingen op de site die een link waard zijn

Een backlink krijg je voor iets dat de linkende partij aan zijn lezers wil
laten zien. Dit staat er al, of ligt klaar:

| asset | adres | waarom iemand ernaar linkt | stand |
|---|---|---|---|
| Energie-ROI-rekenmachine (afbouw salderen 2027) | `/tools/energy-roi` (en/nl/de/es) | een actueel Nederlands onderwerp met een datum; installateurs en energie-adviseurs kunnen hem aan klanten geven | live; opvang (mail) wacht op Brevo — zie operator-lijst |
| Lekkage-scan | `/nl/tools/lekkage-scan`, `/tools/leak-scan` | een diagnose in vijf minuten, geen formulier vooraf | live; opvang idem |
| Het datastuk | nog niet geschreven; skelet in `docs/datastuk.md` | het enige soort artikel waar een vakblad op een domein zonder autoriteit naar linkt (`docs/kanalen.md` §2.4) | wacht op Juans antwoorden in `docs/claims.md` |
| `/pricing.md`, `/llms.txt`, `/llms-full.txt` | root | geen linkmagneten, maar wat een AI-assistent citeert als hij ons citeert | live sinds #403 |

**De rekenmachine is de kandidaat die vandaag kan.** Hij is Nederlands,
gedateerd (2027), en nuttig voor precies de drie partnerprofielen uit
`docs/partners.md` (installateur, boekhouder, energie-adviseur). Een partner
die hem op zijn site zet, linkt. Dat is geen linkverzoek maar een tool
uitlenen; de link volgt.

**Het datastuk is de enige die links van vakbladen kan opleveren**, en hij is
geblokkeerd op data die alleen Juan heeft. Zie `docs/datastuk.md` voor de
vragen. Zonder die antwoorden is elk cijfer verzonnen, en dat is hier de
hoofdzonde.

---

## 3. Laag drie — verdiende vermeldingen, binnen de grenzen die al vastliggen

De grenzen staan in `docs/lucenai-backlinks.md` §4 en `docs/outreach.md` §5
en veranderen hier niet: **geen geautomatiseerde outreach, geen gekochte of
geruilde links, geen belofte over posities of termijnen.**

Wat wél kan, en al in de outreach-volgorde zit:

| kanaal | de link die erbij hoort | bron |
|---|---|---|
| de vier klanten om één introductie vragen | bij een introductie hoort een zin op hún site ("we werken met …") alleen als zíj dat willen; vraag het pas als het traject iets opleverde dat ze willen laten zien | `docs/kanalen.md` §2.1 |
| doorverwijspartners | een partner die de rekenmachine of de scan doorstuurt, zet hem het liefst op zijn eigen site — dat is de link | `docs/partners.md` |
| LinkedIn, persoonlijk profiel | `nofollow`, telt niet als link. Wel het kanaal waar het datastuk zijn eerste lezers krijgt | `docs/social-linkedin.md` |
| bedrijfsvermeldingen | alleen de echte: de LinkedIn-bedrijfspagina staat in `ORG_SAME_AS` en nog niet zichtbaar op de site (operator-lijst); een Google Business Profile is er niet, en of dat past bij een bedrijf zonder bezoekadres is een vraag, geen taak | `lib/seo/branding.ts` |

**Directories, gastblogs en "resource pages" staan hier bewust niet.** Op een
domein zonder nulpunt is dat werk dat je niet kunt meten, en de generieke
sites in die categorie zijn precies de links die je over een jaar wilt
verwijderen.

---

## 4. Wat "bewezen" betekent, en hoe je het meet

| meting | hoe | wanneer |
|---|---|---|
| eigen netwerk | `bash scripts/backlink-inventory.sh` — de tabel in §1 moet van 0 naar 4–6 gaan | na elke wijziging aan een van de sites |
| externe links | Search Console → Links → "Top linking sites". Vereist dat de property geverifieerd is (TXT staat er) | maandelijks, zodra de property leest |
| verwijzend verkeer | Plausible → Sources, met de vijf doelen erachter zodat een klik van een partner te onderscheiden is van niets | zodra de doelen bestaan |
| of een AI-assistent ons citeert | `docs/geo-citatie-nulmeting.md` — twaalf vragen, drie assistenten, één tabel | maandelijks |

De eerste rij kan vandaag. De andere drie wachten op stappen die al op de
operator-lijst staan in `CLAUDE.md`, en die staan daar niet voor niets: een
backlinkstrategie zonder Search Console is een strategie zonder scorebord.

---

## 5. De volgorde, in één tabel

| | wat | wie | blokkade |
|---|---|---|---|
| 1 | `lucenai.eu/about`: de naam linken | operator | geen |
| 2 | Search Console verifiëren (TXT staat er) | operator | geen |
| 3 | `diazatlas.com`: "Juan Diaz LLC" linken in about + voet | PR in diaz-editor | geen |
| 4 | auteursblok op de twee contentsites | PR per site | geen |
| 5 | colofonregel op de twee ventures | PR per site | geen |
| 6 | de rekenmachine aan de drie partnerprofielen geven | operator, met `docs/partners.md` | Brevo (de opvang achter de tool) |
| 7 | het datastuk | Juan levert data → sessie schrijft | `docs/datastuk.md` |
| 8 | Ahrefs loskoppelen, of een plan dat antwoordt | operator | geld |

Stap 1 en 2 kosten samen vijf minuten en zijn de enige twee die vandaag iets
meetbaars veranderen.

---

## 6. Wat hier bewust niet staat

- **Geen aantallen.** "Twintig links in drie maanden" is een getal zonder
  bron. De maat is die van `docs/kanalen.md`: twee verwijzingen vanaf een
  domein dat niet van Juan is, op een horizon van een half jaar.
- **Geen tooling om links te kopen, te ruilen of te "bouwen".** Dezelfde grens
  als in `docs/lucenai-backlinks.md` §4.
- **Geen sitebrede voet-links over de acht domeinen.** Zie §1: dat is de
  vorm die een netwerk verraadt, en het is ook gewoon lelijk.
- **Geen positioneringsbesluit.** `lucenai.eu` en `juandiazllc.com` mikken op
  dezelfde twee sectoren met dezelfde diagnose; wie op welk zoekwoord moet
  ranken is een keuze voor Juan, Hash en Peter (`docs/lucenai-backlinks.md`
  §5), geen SEO-ingreep.
