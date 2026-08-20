# Het aanbod — diagnose en voorstel

Twee dingen worden op juandiazllc.com verkocht: een consultancy-traject en
DEUS-seats. Dit document behandelt het eerste volledig en zegt van het tweede
wat er eerst dicht moet voordat aanbodwerk daar zin heeft.

Geschreven 2026-08-20. Alles hieronder is uit de repo gemeten, niet aangenomen;
§8 zegt per uitspraak waar hij vandaan komt.

---

## §0 — Wat hier gemeten is, en wat niet

**Gemeten:** wat de site vandaag over het aanbod zegt, in vier talen, uit
`lib/i18n/dict.ts`, `lib/seo/faqs.ts` en de pagina's zelf. Welke cijfers
`docs/claims.md` toestaat. Waar de CTA's naartoe wijzen. Wat er over DEUS is
vastgelegd na de meting van 2026-08-15 tegen `DEUS-SHARED`.

**Niet gemeten, en niet meetbaar vanaf hier:** of dit aanbod converteert. Er
staan nul rijen in `marketing.leads` en alle vijf de verkeersmeters staan uit of
stuk — zie §0 van [`seo-geo-plan.md`](seo-geo-plan.md). Elke uitspraak hieronder
gaat dus over de *constructie* van het aanbod, niet over gemeten gedrag. Wie hier
een conversiepercentage verwacht, leest het verkeerde document.

**Wat dat betekent voor de volgorde.** Een aanbod repareren zonder meetketen is
niet stuurloos — de gaten hieronder zijn structureel en zichtbaar zonder data —
maar het resultaat is pas af te lezen zodra §0 van het SEO-plan dicht is.

---

## §1 — Het aanbod vandaag, woordelijk

Uit `services.how.*` (PR #182) en `SERVICES_FAQ_BY_LOCALE` / `CONTACT_FAQ`:

| stap | wat er staat | prijs zoals gepubliceerd |
|---|---|---|
| 0 | intro-gesprek, 15 minuten, direct boekbaar via cal.com | gratis |
| 1 | blueprint-gesprek, 30 minuten → diagnose van één pagina | gratis |
| 2 | diagnostische sprint, 30 dagen | "flat fee" — **geen bedrag** |
| 3 | scope + bouw, eerste 90 dagen | "fixed fee" — geen bedrag, na de diagnose |
| 4 | operatie | maandelijkse retainer — geen bedrag |

Daarnaast zegt `services.how.note` dat er per uitkomst geprijsd wordt en niet per
uur, en dat advies een losstaand traject is zonder verplichting dat de bouw volgt.

**Er staat nergens in deze repo een bedrag voor stap 2, 3 of 4.** Gecontroleerd
op `lib/`, `docs/` en `_drafts/`: de vier prijsconcepten onder `_drafts/pricing/`
gaan alle vier over DEUS-seats. `docs/claims.md` heeft een sectie
`juandiazllc.com` met positionering en de vier klantuitkomsten, en geen tarief.

Onder het traject ligt een aparte, wél benoemde methode: **Survey → Blueprint →
Build → Commission → Operate** (`process.1..5.name`), de bouwkundige vijfslag.

---

## §2 — De waardevergelijking: welke hefboom klemt

```
              gewenste uitkomst  ×  geloofwaardigheid dat je hem haalt
  waarde  =  ──────────────────────────────────────────────────────────
              tijd tot resultaat  ×  moeite en risico voor de koper
```

| hefboom | stand | waarom |
|---|---|---|
| gewenste uitkomst | redelijk | meer geld verdienen is gesteld, maar abstract op de plek waar besloten wordt |
| **geloofwaardigheid** | **laag — dit klemt** | zie hieronder |
| tijd tot resultaat | gemengd | eerste *inzicht* is snel (gratis gesprek, diagnose van één pagina); eerste *systeem* is 30 + 90 dagen |
| moeite en risico | onbekend | nergens staat wat de klant zelf moet leveren, en onbekende moeite leest als veel moeite |

**Waarom geloofwaardigheid de bindende beperking is, en waarom dat goedkoop op
te lossen valt.** Het bewijs bestaat al en is al goedgekeurd:

| cijfer | context zoals gepubliceerd | sector | periode |
|---|---|---|---|
| `+38%` | lead-naar-gesprek na vervanging van een vier-tool-stack door één CRM met WhatsApp-flow | NL-zonne-installateur | 90 dagen |
| `3.2x` | pijplijnsnelheid toen buitendienst en kantoor dezelfde dealstatus deelden | NL/BE-energiemakelaar | 6 maanden |
| `−61%` | tijd tot offerte na automatisering van intake, schouw en voorstel | thuisbatterij-installateur | Q1-uitrol |
| `€0` | extra SaaS-uitgaven; uitgefaseerde tools betaalden de herbouw | operator met meerdere vestigingen | jaar één |

Bevestigd door Juan op 2026-08-19, geanonimiseerd met opzet, en bewaakt door
`components/sections/ResultsStrip.test.ts`.

**Ze staan alleen op de homepage,** tussen `Stats` en `Signals`. Gemeten:
`/services` en `/contact` bevatten samen **nul cijfers**. Het sterkste bezit ligt
als decoratie op de pagina waar niemand koopt, en ontbreekt op de twee pagina's
waar de beslissing valt.

Daarnaast draagt `/work` vier live producten die Juan zelf gebouwd heeft. Dat is
echt bewijs, maar van een andere soort: het toont dat hij zijn eigen dingen kan
bouwen, niet dat hij jouw ding kan repareren. Klantbewijs en bouwersbewijs zijn
niet uitwisselbaar, en alleen het eerste beantwoordt de vraag die de koper stelt.

---

## §3 — De zes onderdelen van een compleet aanbod

| # | onderdeel | stand |
|---|---|---|
| 1 | kernlevering | aanwezig, abstract |
| 2 | bonusstapel | afwezig |
| 3 | **garantie** | **afwezig — grootste hefboom** |
| 4 | schaarste of urgentie | afwezig, terwijl er twee échte beschikbaar zijn |
| 5 | naam | de methode heeft er een, het traject niet |
| 6 | prijs en betaalstructuur | nergens een getal |

### 1 — Kernlevering

Stap 1 levert een artefact: een diagnose van één pagina. Dat is goed
geformuleerd, want de koper kan zich er iets bij voorstellen. Stap 2 levert
volgens de tekst alleen dat beide partijen ontrisicoën — een toestand, geen ding.

**Voorstel:** benoem wat de 30 dagen oplevert zoals stap 1 dat doet. Een
tastbaar artefact met een naam verkoopt zichzelf; een toestand vraagt om
vertrouwen dat er nog niet is.

### 2 — Bonusstapel

Afwezig, en dat is voorlopig het juiste antwoord. Bonussen stapelen op een
aanbod zonder garantie en zonder prijs verschuift het gesprek naar de verkeerde
vraag. Als er ooit één bij komt, dan iets dat al bestaat en niets extra kost om
te leveren — de energie-ROI-calculator is de enige kandidaat in deze repo.

**Geen opgeblazen bedrag-ter-waarde-van.** Dat is de val waar regel 1 van
`docs/claims.md` voor bestaat.

### 3 — Garantie — de grootste hefboom

Er is er geen, op geen enkele stap. Dat is precies waar de hefboom
geloofwaardigheid zit die in §2 klemt.

**De verkeerde garantie is een uitkomstgarantie.** De uitkomst hangt af van wat
de klant zelf doet, de marge draagt het risico niet, en het ene traject dat
faalt is publiek.

**De juiste vorm hier hangt aan stap 2** — de enige stap die een prijs krijgt, en
de stap die per definitie al de ontrisiceringsstap is. Een garantie op de
*levering* van die stap, niet op de uitkomst ervan, kost weinig en verwijdert de
grootste twijfel bij de eerste betaling. Welke precies, en of het risico
aanvaardbaar is, staat in §5 als beslissing.

### 4 — Schaarste en urgentie

Afwezig, en er liggen twee die **echt** zijn — de enige soort die mag:

1. **Capaciteit.** Eén operator kan een eindig aantal trajecten tegelijk dragen.
   Dat is geen marketingtruc maar de werkelijkheid van dit bedrijfsmodel. Het
   getal is een beslissing (§5).
2. **1 januari 2027.** Het einde van de salderingsregeling is een externe,
   gedateerde deadline die het hele NL-energiesegment raakt en waar de site al
   vijf artikelen en een rekentool over heeft. Voor dat segment is urgentie geen
   constructie maar een agenda-item.

**Nooit een afteller die nergens op slaat.** Kunstmatige schaarste kost het
vertrouwen dat de rest van deze site zorgvuldig opbouwt.

### 5 — Naam

De methode heet Survey → Blueprint → Build → Commission → Operate. Het
commerciële traject heet niets. De losse stappen dragen soortnamen
(diagnostische sprint, retainer) die elke consultant gebruikt.

**Blueprint staat er twee keer, en dat is geen defect.** Het woord is tegelijk
fase 2 van de methode en de naam van het gratis gesprek. Ik heb hier eerst een
hernoeming voorgesteld en die daarna doorgerekend; beide helften van dat
voorstel bleken verkeerd:

| | vindplaatsen | opmerking |
|---|---|---|
| het gesprek hernoemen | 7 vermeldingen in de Engelse FAQ alleen, maal vier talen ≈ 28 | het dure pad, niet het goedkope |
| de fase hernoemen | `process.2.name`, 4 keer (onvertaald in alle talen) | goedkoop, maar sloopt de bouwkundige metafoor |

En bij nameten is het ook inhoudelijk geen botsing: het gratis gesprek ís fase 2
in het klein — dertig minuten tekenen in plaats van een bouwfase. Wat kopers
werkelijk door elkaar halen is *intro versus blueprint*, en dat beantwoordt de
FAQ al in drie aparte vragen.

**Voorstel: hernoem niets.** Maak in plaats daarvan de verhouding één keer
expliciet — het gesprek is fase 2 in het klein — zodat het herhaalde woord als
samenhang leest en niet als slordigheid. Eén sleutel maal vier talen tegenover
achtentwintig bewerkingen.

De naam voor het traject als geheel is een aparte vraag, en die kan wachten tot
er een prijs en een garantie op staan. Een naam op een aanbod zonder die twee is
een etiket op een lege doos.

### 6 — Prijs en betaalstructuur

Nergens een getal. Dat er pas na de diagnose geoffreerd wordt geldt voor stap 3
en 4, en dat is verdedigbaar en zelfs sterk: je prijst een bouw niet vóór de
schouw.

**Voor stap 2 is het dat niet.** Een vaste prijs die je niet noemt, is voor de
koper geen vaste prijs. Het patroon dat hier past: **één zichtbaar bedrag aan de
poort, offertes daarachter.** Welk bedrag is een beslissing (§5), en het gaat
volgens regel 1 eerst in `docs/claims.md`.

---

## §4 — Vier wijzigingen die geen beslissing vragen

Deze kunnen nu, zonder dat er een prijs of garantie vaststaat. Concrete sleutels
staan in de bijlage.

| # | wijziging | waarom | raakt |
|---|---|---|---|
| A | de vier klantuitkomsten op `/services` en `/contact` | het bewijs staat er al, goedgekeurd en bewaakt; het staat alleen op de verkeerde pagina | mount plus poort |
| B | `?interest=<dienst>` op de vier dienst-CTA's | `/pricing` doet dit sinds #196 en `/tools/energy-roi` ook; `/services` stuurt alles naar een kaal `/contact`, dus een advieslead is niet te onderscheiden van een bouwlead | 4 links |
| C | één zin die zegt dat het gratis gesprek fase 2 in het klein is | het woord Blueprint staat twee keer; hernoemen kost 28 bewerkingen en sloopt óf de metafoor óf de FAQ, uitleggen kost er vier | 1 sleutel maal vier talen |
| D | het artefact van stap 2 benoemen | stap 1 noemt een ding, stap 2 een toestand | dict maal vier talen |

**A is de zwaarste van de vier** en de goedkoopste: het is een mount, geen nieuwe
claim. `ResultsStrip` hangt al aan de poort die eist dat elk gepubliceerd cijfer
in `docs/claims.md` staat, dus meeverhuizen introduceert geen onbewaakte
bewering.

**B is het enige punt met een meetbaar gevolg.** Zodra de herkomst in `source`
belandt (`contact_page:interest=advisory:stage=…`) is per dienst te zien wat er
binnenkomt — de eerste keer dat de consultancy-kant überhaupt iets meet.

---

## §5 — Drie beslissingen die alleen van jou kunnen komen

Geen van deze drie kan uit de repo worden afgeleid, en geen van drieën mag
verzonnen worden.

1. **Wat kost de diagnostische sprint van 30 dagen?** Eén bedrag. Het gaat eerst
   in `docs/claims.md` (regel 1), daarna pas in kopij. Zonder dit blijft
   onderdeel 6 open en blijft een vaste prijs een belofte zonder inhoud.

2. **Draag je een garantie, en welke?** De vorm die bij dit aanbod past raakt de
   levering van stap 2, niet de uitkomst. Het is jouw risico, dus jouw keuze; ik
   kan de gangbare vormen naast elkaar zetten met wat elk kost als het misgaat,
   maar de knoop is niet van mij.

3. **Hoeveel trajecten draag je tegelijk?** Een getal maakt de schaarste echt en
   controleerbaar. Zonder getal is elke urgentie-zin een constructie, en dan
   hoort hij er niet te staan.

---

## §6 — DEUS, de tweede pass: wat er eerst dicht moet

Aanbodwerk op `/pricing` is nu niet de eerste zet, en dat is een meting, geen
mening. Vijf dingen staan ervoor, alle vijf uit `docs/claims.md`, sectie
*juandiazllc.com — /pricing (DEUS)*:

1. **Er is geen koopweg.** Elke CTA gaat naar `/contact`; Stripe vertrok met
   #134. De pagina is feitelijk een leadpagina met een prijslijst erop, en hoort
   ook zo beoordeeld te worden.
2. **De acht bedragen zijn lijstprijzen, geen geverifieerde prijzen** — naar de
   maatstaf die dat bestand zelf zet: een prijs is geverifieerd als hij wordt
   afgelezen van het ding dat het geld aanneemt. Niets neemt geld aan voor DEUS.
3. **De pagina beschrijft een fractie van het product.** Gemeten 2026-08-15 tegen
   `DEUS-SHARED`: 201 API-routes en 34 documentatiepagina's tegen 34 rijen op de
   prijspagina. Afwezig: SCIM 2.0, een manipulatiebestendig auditlog met
   hashketen en verificatie-endpoint, ROPA-export (AVG art. 30), sessie-timeout
   per organisatie, API-sleutels met rotatie, webhook-retry, automatiseringen,
   leadroutering en -scoring, een AI-opdrachtbalk, e-handtekeningen, sms, dialer,
   kanban, pijplijnen, rapportages, klantportaal — plus drie verticale modules
   (vastgoed, hospitality, filantropie).
4. **Het migratie-aanbod is een belofte, geen staat van dienst:** vijf werkdagen,
   twee trainingen, 30 dagen voorrangssupport. Er is nog nooit een migratie
   geleverd.
5. **Waar DEUS draait is niet vast te stellen** uit de repo, en dat is een
   compliance-claim (EU-dataresidentie).

**De bindende beperking bij DEUS is dus niet de prijs maar de gewenste uitkomst.**
De pagina onderverkoopt een product dat al bestaat. Dat is goed nieuws: het
vraagt geen bouwwerk en geen prijsverlaging, alleen een eerlijker beschrijving —
precies wat `claims.md` zelf al concludeerde over de vraag of de Business-tier
zijn prijsstap verdient.

**Volgorde die ik voorstel:** punt 3 eerst (welke van die mogelijkheden
prijsrijen worden, en op welk niveau — dat is aanbodwerk en het kan nu), punt 1
en 5 als beslissingen ernaast, punt 2 en 4 als taalcorrecties die meeliften.

---

## §7 — Wat hier niet beloofd wordt

- **Geen conversiepercentage, geen omzetprojectie.** De meetketen staat uit; zie
  §0. Wie een getal wil, moet eerst §0 van `seo-geo-plan.md` sluiten.
- **Geen uitspraak over welk bedrag juist is** voor de diagnostische sprint of de
  DEUS-tiers. Dat is §5 en `docs/claims.md`, niet dit document.
- **Geen nieuwe klantclaim.** Alles wat hierboven als bewijs wordt ingezet, staat
  al in `docs/claims.md` en is al gepubliceerd.
- **Geen belofte dat een beter aanbod verkeer vervangt.** Nul bezoekers maal een
  perfect aanbod is nul.

---

## §8 — Herkomst

| uitspraak | bron |
|---|---|
| de vier stappen en hun bewoordingen | `lib/i18n/dict.ts` → `services.how.*`, `SERVICES_FAQ_BY_LOCALE`, `CONTACT_FAQ` |
| nergens een bedrag voor het traject | grep over `lib/`, `docs/`, `_drafts/`; de vier prijsconcepten gaan over DEUS-seats |
| de vier klantuitkomsten | `docs/claims.md`, sectie *The four operator outcomes*, bevestigd 2026-08-19 |
| bewijs staat alleen op de homepage | `ResultsStrip` gemount in `app/[locale]/page.tsx:95`; nul cijfers op `/services` en `/contact` |
| `/services` geeft geen herkomst mee | enige `href` op die pagina is `/contact`; `/pricing` en `/tools/energy-roi` gebruiken wél `?interest=` |
| de vijf fasen | `process.1..5.name` |
| Blueprint staat 7 keer in de EN-FAQ en 4 keer als fase-naam | `grep -oic 'blueprint call' lib/seo/faqs.ts` = 7; `grep -c '"process.2.name": "Blueprint"' lib/i18n/dict.ts` = 4 |
| vijf NL-artikelen over saldering | `getAllInsights("nl").filter(tag === "Energy")` = 5 |
| alles onder §6 | `docs/claims.md`, sectie *juandiazllc.com — /pricing (DEUS)*, gemeten 2026-08-15 tegen `DEUS-SHARED@59e4c71` |
| meetketen staat uit | `docs/seo-geo-plan.md` §0 |

---

## Bijlage — de sleutels die zouden veranderen

Niet toegepast. Dit is de lijst zodat jij kiest wat er live gaat.

### A — bewijs op de beslispagina's

Geen nieuwe sleutels. `<ResultsStrip />` mounten in
`app/[locale]/services/page.tsx` en `app/[locale]/contact/page.tsx`, plus een
poort die eist dat de sectie op alle drie de pagina's staat óf op geen enkele —
anders drift hij terug naar één pagina zonder dat iemand het merkt.

### B — herkomst per dienst

Vier `href`-waarden in `app/[locale]/services/page.tsx`, patroon overgenomen van
`/pricing` sinds #196:

| dienst | wordt |
|---|---|
| Revenue-engine builds | `/contact?interest=engine` |
| Fractional revenue operations | `/contact?interest=fractional` |
| Build-vs-buy advisory | `/contact?interest=advisory` |
| Instruments for the field | `/contact?interest=instruments` |

Landt in `marketing.leads.source` als `contact_page:interest=advisory:stage=…`.
Geen dict-wijziging, geen nieuwe tekst.

### C — het herhaalde woord uitleggen in plaats van wegwerken

Eén nieuwe sleutel, bijvoorbeeld `services.how.s1.note`, in vier talen: het
gratis gesprek is fase 2 van de methode in het klein. Te tonen onder
`services.how.s1.body`, en desgewenst als antwoordregel in de bestaande
FAQ-vraag die intro en blueprint uit elkaar houdt.

**Niets hernoemen.** Gemeten: `blueprint call` staat 7 keer in de Engelse FAQ,
maal vier talen ongeveer 28 plekken; `process.2.name` staat 4 keer en is in
alle vier de talen onvertaald. Beide hernoemroutes kosten meer dan ze opleveren,
en de ene sloopt de bouwkundige metafoor waar de positionering op rust.

Raakt `lib/i18n/eerste-stap.test.ts` niet, omdat er geen sleutel van naam
verandert. Zou er ooit tóch hernoemd worden, dan is dat de poort die meeverhuist
in plaats van eromheen — die houdt bij dat dezelfde eerste stap overal één naam
draagt.

### D — het artefact van stap 2

`services.how.s2.title` en `services.how.s2.body` in vier talen. Nieuwe tekst kan
pas als beslissing 1 uit §5 er is: zonder bedrag blijft de titel een vaste prijs
beloven zonder inhoud.
