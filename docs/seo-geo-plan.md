# SEO, GEO en AI-SEO — targetingplan

**Opgesteld 2026-08-20.** Alles hieronder staat op een meting met datum en
instrument. Waar ik niet kon meten staat dat er, in plaats van een schatting.

---

## 0. Eerst dit: het plan is nu niet toetsbaar

Vijf meters geprobeerd, vijf keer nee:

| instrument | uitkomst 2026-08-20 |
|---|---|
| Vercel Web Analytics | 404 — staat niet aan voor `juandiazllc-com` |
| Plausible | geen API-sleutel; events vertrekken wél (geverifieerd 2026-08-20) |
| Search Console | niet gekoppeld; DNS TXT staat er, verificatie onbekend |
| DataForSEO | geen inloggegevens (open sinds 2026-08-03) |
| Ahrefs | `Insufficient plan` op elk endpoint, ook de gratis |

Daardoor is "0 rijen in `marketing.leads`" onbeslist tussen **geen verkeer** en
**geen conversie**, en dat zijn tegengestelde reparaties. Elk plan dat daar
overheen stapt is een gok met een tijdlijn eromheen.

**Stap nul, in deze volgorde, want elke stap erna wordt erdoor gescoord:**

1. Plausible-dashboard: bezoekers over 30 dagen. Eén blik.
2. Search Console: nakijken of de property geverifieerd is. Het record staat er.
3. De vier Plausible-doelen aanmaken (`Boeking 15min`, `Pricing CTA`,
   `Sector CTA`, `Tool CTA`) plus de drie properties `tier`, `sector`, `tool`.
   Getagd en geverifieerd in de code; zonder de doelen worden de kliks
   binnengehaald en weggegooid.
4. DataForSEO-inloggegevens, of de knoop doorhakken over OpenSEO.

Zonder 1 en 2 is de rest van dit document niet te scoren.

---

## 1. Het zijn drie spellen, geen één

Ze worden nu door elkaar gehaald en dat kost scherpte. Ze hebben verschillende
zoekers, verschillende concurrentie en verschillende meetlatten.

| | wie zoekt | waarop concurreer je | meetlat |
|---|---|---|---|
| **Entiteit** | iemand die je naam al kent | naamgenoten | positie op naamvarianten |
| **Topical** | iemand met een probleem | vakmedia, installateurs, leveranciers | vertoningen + kliks per cluster |
| **GEO / AI** | iemand die een assistent vraagt | wie het model citeert | citaties in antwoorden |

---

## 2. Spel 1 — de entiteit (je naam)

### De meting

`"Juan Diaz LLC"`, gemeten 2026-08-20 (let op: de zoekmachine achter dit
instrument is VS-georiënteerd, dus de Nederlandse SERP kan afwijken):

| plek | wat |
|---|---|
| 1 | Juan Diaz Construction LLC (BuildZoom, New Jersey) |
| 2–7 | **zes LinkedIn-profielen van andere mensen die Juan Diaz heten** |
| 8 | Juan Diaz Trucking LLC (FMCSA) |
| **9** | **juandiazllc.com** |
| 10 | JMDiaz |

`"Juan Stefan Diaz" fractional revenue operator`: **#1**, met een correcte
samenvatting van de site.

### Wat die twee metingen samen zeggen

De kale naam is verzadigd. **"Stefan" is je onderscheidende woord** — dat is de
enige term in de test die je meteen bovenaan zette. En zes van de tien
resultaten zijn LinkedIn-profielen, dus LinkedIn is op deze SERP de sterkste
speler; jouw eigen profiel hoort daar te staan in plaats van dat van een
vreemde.

**Wat niet te winnen valt:** de kale term "Juan Diaz". Bokser, voetballers, een
wijk in Panama-Stad. Daar is geen contentplan tegen opgewassen en het is
verspilde inzet. Dit document jaagt daar niet op.

**Wat wel te winnen valt:** "Juan Stefan Diaz", "Juan Diaz LLC", "Juan Diaz
revenue operator", "Juan Diaz Amsterdam", "Juan Diaz + [sector]".

### Acties, op volgorde van hefboom

1. **Sluit de entiteitslus.** De site wijst met `PERSON_SAME_AS`
   (`lib/seo/branding.ts`) naar LinkedIn, GitHub en Instagram. Die lus telt pas
   als hij twee kanten op wijst. Zet `juandiazllc.com` in het website-veld én de
   About van `linkedin.com/in/juanstefan`, in de GitHub-bio van `bongartzdiaz`,
   en in de Instagram-bio. *Operator-actie, geen code.*
2. **Zet de naam vooraan op de pagina die over de persoon gaat.**
   `meta.about.title` is nu "About me — fractional revenue operator". Op een
   naamzoekopdracht is dat de zwakst mogelijke titel: het woord dat de zoeker
   intikte staat er niet in, behalve in het achtervoegsel. Voorstel:
   "Juan Stefan Diaz — fractional revenue operator", in vier talen, met de naam
   ook in de H1.
3. **Drie knopen beschrijven één persoon, en ze zijn het oneens.** Nagemeten op
   2026-08-20, geen vermoeden:

   | plek | `name` | `url` |
   |---|---|---|
   | `app/[locale]/layout.tsx` (founder) | Juan Stefan **Diaz** | `/{l}/about` |
   | `app/[locale]/about/page.tsx` | Juan Stefan **Bongartz** Diaz | `/about` |
   | `lib/seo/article.ts` (`AUTHOR_PERSON`) | Juan Stefan **Bongartz** Diaz | `/about` |

   Drie problemen tegelijk, en ze versterken elkaar:

   - **Twee verschillende namen.** De opzet was bewust — de kop van
     `article.ts` legt uit dat de lange vorm de kennispaneel-identiteit draagt
     met de korte als `alternateName`. Maar `layout.tsx` doet het omgekeerde:
     korte vorm als `name`, en geen `alternateName`. Het onderscheidende woord
     waar dit hele hoofdstuk op leunt staat dus in de ene knoop wel en in de
     andere niet.
   - **Geen enkele knoop draagt een `@id`.** Zonder dat is er geen bewijs dat
     het één entiteit is; een crawler mag ze als drie losse personen lezen.
   - **`url` wijst twee van de drie keer naar `/about`**, en dat geeft 307 naar
     `/en/about` (gemeten). `layout.tsx` wijst wél naar de canonieke,
     taal-geprefixte vorm. Derde inconsistentie op hetzelfde veld.

   De reparatie is één gedeelde constante naast `PERSON_SAME_AS` in
   `lib/seo/branding.ts` — naam, `alternateName`, `@id` en canonieke `url` —
   waar alle drie de knopen uit lezen. Dat is precies de vorm die deze repo al
   twee keer eerder heeft gekozen: één `NAV_LINKS` in plaats van twee lijsten,
   één `PERSON_SAME_AS` in plaats van drie literals. Beide keren was de dubbele
   lijst zelf de oorzaak van het gat.

   Dit is een codewijziging die ik kan doen; hij hoort in de tabel in §5.
4. **Een echte foto.** `AUTHOR_IMAGE_URL` wijst naar `/opengraph-image`, een
   gegenereerde merkkaart. `public/me/portrait.jpg` bestaat niet en geeft 404 op
   productie. Voor een kennispaneel wil Google een gezicht, geen kaart. Dit stond
   al in `MANUAL_TASKS.md` als cosmetisch punt; het heeft nu een rangschikkingsreden.
5. **Profielen buiten de site.** De SERP wordt gedomineerd door profielpagina's,
   niet door websites. Een compleet, actief LinkedIn-profiel en een GitHub met
   een ingevulde bio doen hier meer dan een extra artikel.

### Hoe je weet of het werkt

Search Console → Prestaties → filter op zoekopdrachten die "diaz" bevatten.
Positie per variant, elke maand. Dat is het enige eerlijke rapportcijfer, en het
werkt pas na stap nul.

---

## 3. Spel 2 — topical (waar de echte kopers zoeken)

### De stand

21 artikelen. Twaalf zijn aan één markt gebonden:

| markt | artikelen | wig |
|---|---|---|
| NL | 6 | salderingsregeling stopt 1-1-2027 |
| DE | 3 | dalende Einspeisevergütung, §14a/§41a EnWG |
| ES | 3 | compensación de excedentes ≠ balance neto |

Tags: `Energy` 11, `Systems` 4, `Real estate` 2, `Hospitality` 2, `Growth` 1,
`Strategy` 1.

### Wat daaraan goed is

De drie energieclusters zijn per markt in de eigen regelgeving geschreven, niet
vertaald. Dat is precies waarom ze kunnen ranken op een domein zonder
autoriteit: een Duitse lezer die `Einspeisevergütung` zoekt krijgt geen
Nederlands verhaal met andere woorden erop.

### Waar het dun is

**Vastgoed en horeca hebben twee artikelen elk.** Dat is geen cluster maar een
aanzet. Twee artikelen ranken niet en dragen ook geen interne linkstructuur.

**De rekenmachine is alleen Nederlands.** `/tools/energy-roi` modelleert de
saldering; DE en ES hebben geen tool om naartoe te trechteren. Dat is de grootste
openstaande hefboom aan deze kant, en het is een productbeslissing die al eerder
is uitgesteld: één rekenmachine die zich per taal aanpast, of aparte tools
(`/tools/heimspeicher-rechner`, `/tools/autoconsumo`). **Dat is jouw keuze, niet
de mijne** — de rekenmodellen verschillen wezenlijk, want DE en ES hebben nooit
salderen gekend.

### Voorstel

Verdiepen boven verbreden. Een vierde markt openen zonder regelgevingshaak levert
niets; een derde en vierde artikel per bestaand cluster wel.

1. **Kies de rekenmachine-route** (productbeslissing). Dat ontsluit de DE- en
   ES-trechter die nu doodloopt.
2. **Vastgoed en horeca naar vier artikelen elk**, of accepteer dat het geen
   clusters zijn en haal ze uit de navigatie. Twee is de slechtste stand: genoeg
   om onderhoud te kosten, te weinig om te ranken.
3. **Geen nieuwe markt** tot er een even harde deadline ligt als 1-1-2027.

---

## 4. Spel 3 — GEO en AI-SEO

### Wat er al staat, en het is meer dan gemiddeld

| onderdeel | stand |
|---|---|
| `robots.txt` | **16 AI-crawlers expliciet toegestaan** — GPTBot, OAI-SearchBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot en tien meer |
| `public/llms.txt` | aanwezig, 59 regels, met sitemap, feeds, talen en contact |
| `Person` + `sameAs` | consistent uit één bron (`PERSON_SAME_AS`) |
| `BlogPosting` | auteur, uitgever, datum, `mainEntityOfPage` |
| `FAQPage` | antwoorden onder 300 tekens, definitieve eerste zin |
| `Product` + `AggregateOffer` | op `/pricing` |
| feeds | `feed.json` + `rss.xml` |

De redenering in `app/robots.ts` klopt en is het bewaren waard: *je verbergen
voor die crawlers betekent niet dat het model zwijgt, maar dat het je
positionering verzint in plaats van citeert.*

### Bewijs dat het werkt

De zoekopdracht op `"Juan Stefan Diaz" fractional revenue operator` gaf een
antwoord dat de site correct samenvatte — inclusief Voltafy, Performance Tracker,
Help Mij Besparen, Salderingsregeling 2027 en het vijf-lekken-kader. Dat is geen
theorie over citeerbaarheid; dat is een citatie.

### De gaten

1. **Geen `llms-full.txt`.** `llms.txt` is een wegwijzer; de volledige variant
   geeft het model de inhoud zonder te crawlen. Voor 21 artikelen is dat een
   generator van een paar regels, en `feed.json` heeft de body-afvlakking al.
2. **Geen markdown-parallel per artikel.** Sommige assistenten prefereren
   `.md` boven HTML. `/insights/<slug>.md` naast de HTML is goedkoop.
3. **`llms.txt` heeft een `Last updated` die met de hand bijgehouden wordt.**
   Dat is precies de vorm die stilletjes veroudert. Genereren, of er een poort op
   zetten — deze repo heeft daar inmiddels een patroon voor.
4. **Geen meting van citaties.** Er is nu geen enkele manier om te zien of
   ChatGPT, Claude of Perplexity je noemt. Dat is handwerk: elk kwartaal een
   vaste set vragen stellen aan vier assistenten en noteren wie er genoemd wordt.
   Saai, maar het is het enige eerlijke nulpunt.

### Voorstel

- `llms-full.txt` genereren uit dezelfde bron als `feed.json`.
- `Last updated` in `llms.txt` afleiden in plaats van typen.
- Een vaste vragenlijst vastleggen in `docs/` en per kwartaal aflopen.
- De markdown-parallel pas daarna; eerst meten of het iets oplevert.

---

## 5. Volgorde

| | wat | wie |
|---|---|---|
| 1 | Plausible-getal + Search Console-verificatie | operator |
| 2 | Entiteitslus sluiten op LinkedIn/GitHub/Instagram | operator |
| 3 | Naam vooraan in `/about`-titel en H1, vier talen | code |
| 4 | één `Person`-constante: naam, `alternateName`, `@id`, canonieke url | code |
| 5 | Portret leveren | operator |
| 6 | Rekenmachine-route kiezen voor DE/ES | jij |
| 7 | `llms-full.txt` + afgeleide `Last updated` | code |
| 8 | Vastgoed/horeca verdiepen of uit de navigatie halen | jij |
| 9 | Citatie-nulmeting vastleggen | handwerk |

De code-items (3, 4, 7) kan ik doen zodra je ze goedkeurt. De rest niet.

---

## 6. Wat ik niet beloof

- **Geen positie op de kale term "Juan Diaz".** Zie de meting.
- **Geen tijdlijn naar pagina 1.** Zonder Search Console is er geen nulpunt, en
  zonder nulpunt is elke termijn verzonnen.
- **Geen verkeerscijfers of zoekvolumes.** DataForSEO en Ahrefs zijn allebei
  ontoegankelijk; wat ik niet gemeten heb schrijf ik niet op.
- **Geen belofte over AI-citaties.** Die zijn niet stuurbaar, alleen
  waarschijnlijker te maken. De infrastructuur staat er al beter voor dan
  gemiddeld.

---

## 7. Herkomst van de metingen

| bewering | hoe gemeten |
|---|---|
| SERP-posities | websearch 2026-08-20, VS-georiënteerd instrument |
| Vercel Analytics uit | Vercel MCP `get_web_analytics` → 404 |
| leads 0 rijen | `count(*)` op `marketing.leads`, projectref `wbgiouuifqhasedncysw` |
| 16 AI-crawlers | `app/robots.ts` |
| 21 artikelen, tags, markten | telling over `lib/insights.ts` |
| portret 404 | `curl https://juandiazllc.com/me/portrait.jpg` |
| Plausible verstuurt events | DOM-meting met onderschepte `fetch`, 2026-08-20 |
