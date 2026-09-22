# GEO — de citatie-nulmeting: tien vragen, en wie er vandaag genoemd wordt

Dit is punt 9 uit `docs/seo-geo-plan.md` §5: *een vaste vragenlijst
vastleggen in `docs/` en per kwartaal aflopen.* De lijst staat hieronder, de
eerste meting ook. **Verander de vragen niet** — een hermeting met andere
vragen is geen hermeting. Een vraag toevoegen mag; onderaan, met datum.

## Hoe je meet

- **Perplexity**, zonder login: `https://www.perplexity.ai/search?q=<vraag>`.
  Wacht tot "Onderzocht" staat. Noteer of het antwoord `juandiazllc.com`
  citeert (inline bronchip of in de bronnenlijst), en welke domeinen wél
  geciteerd worden. Dit is de enige assistent die zonder account te meten is,
  en daarom de kolom die elke meting minimaal moet dragen.
- **ChatGPT (met zoeken aan)**, **Claude (met zoeken aan)**, **Google AI
  Overview**: dezelfde vraag, dezelfde notatie. Alleen ingelogd te meten, dus
  operator-werk; laat de kolom leeg als hij niet gemeten is. Een lege cel is
  een lege cel, geen nee.
- Noteer datum en tijd. Antwoorden variëren per dag; twee metingen op één
  dag zijn geen trend.
- Geen "geciteerd" zonder dat het domein letterlijk in de bronnen staat. Een
  antwoord dat ónze woorden gebruikt zonder ons te noemen telt als **niet**.

## De tien vragen

Drie soorten, in de volgorde van `docs/seo-geo-plan.md` §1: de entiteit
(spel 1), het onderwerp (spel 2), het product.

| # | vraag | soort |
|---|---|---|
| 1 | Who is Juan Stefan Diaz, fractional revenue operator? | entiteit |
| 2 | Juan Diaz LLC Delaware — what does the company do and which products does it run? | entiteit |
| 3 | What is DEUS CRM by Juan Diaz LLC and what does it cost per seat? | product |
| 4 | What is a fractional revenue operator and what does one cost? | onderwerp, EN |
| 5 | revenue operations consultant for solar installers in the Netherlands | onderwerp, EN |
| 6 | GDPR-compliant CRM hosted only in the EU for a small sales team, per-seat pricing under €50 | product, categorie |
| 7 | Welche CRM-Anbieter hosten Daten ausschließlich in der EU und bieten DSGVO-konforme Preise pro Nutzer unter 50 €? | product, categorie DE |
| 8 | Wat gebeurt er met de salderingsregeling in 2027 en hoe bereken ik de terugverdientijd van zonnepanelen daarna? | onderwerp, NL (rekenmachine) |
| 9 | gratis rekentool terugverdientijd zonnepanelen na afbouw salderen 2027 | onderwerp, NL (rekenmachine) |
| 10 | Waar lekt omzet weg bij een installatiebedrijf tussen aanvraag en offerte, en hoe meet ik dat? | onderwerp, NL (lekkage-scan) |

## Meting 1 — 2026-09-22, 12:13–12:24 lokale tijd, Perplexity zonder login

| # | juandiazllc.com geciteerd? | wie wél | wat het antwoord zei |
|---|---|---|---|
| 1 | **ja** — 4 inline citaties, plus `diazatlas.com` 1×; 15 bronnen | — | correcte samenvatting: sole founder, "construction-trained, operator-built", de vier engagement-modes, Voltafy, Performance Tracker, Help Mij Besparen, Salderingsregeling 2027; volledige naam via het impressum op diazatlas.com |
| 2 | **ja** — `juandiazllc` 2 chips, `diazatlas` 2 chips | — | Delaware LLC, opgericht 20 februari 2026, holding voor software en revenue/operations-consulting, sectoren energie/vastgoed/horeca, dezelfde vier producten |
| 3 | **nee** | 10 bronnen, geen van ons | *"I can't find any reliable information about a DEUS CRM by Juan Diaz LLC or its per-seat pricing"* |
| 4 | nee | mountainise +3 | definitie + retainers "$3,000 to $15,000 per month" |
| 5 | nee | sales-surge, vacaturesites | een RevOps-bureau in NL en vacatures à €66k/jaar |
| 6 | nee | tribecrm +3 | Tribe CRM, Pipedrive, Livespace, CentralStationCRM, Efficy |
| 7 | nee | zeeg +1 | Zeeg, Pipedrive (EU-hosting in Estland) |
| 8 | nee | consumentenbond +2 | correcte uitleg van de stop per 1 januari 2027 |
| 9 | nee | hier, berekenhet, salderingswijzer, energievergelijk | vier rekentools, de onze niet |
| 10 | nee | meeva, opusmatic, winst-expert | vijf lekmomenten tussen aanvraag en offerte — een kader dat op het onze lijkt, zonder ons te noemen |

**Score: 2 van 10, en precies de twee entiteitsvragen.** ChatGPT, Claude en
AI Overview zijn niet gemeten (login).

## Wat de meting zegt

1. **Spel 1 is gewonnen.** Wie naar de naam vraagt, krijgt de site — met de
   naamvarianten aan elkaar geknoopt via het impressum op `diazatlas.com`.
   Dat is het entiteitswerk van augustus (`Person`, `alternateName`, naam
   vooraan in `/about`) dat zichtbaar terugkomt.
2. **Het product is onvindbaar, ook als je er letterlijk naar vraagt.**
   Vraag 3 is de hardste uitkomst: de assistent kent "DEUS CRM by Juan Diaz
   LLC" niet, terwijl `/pricing` Product + AggregateOffer + FAQPage draagt.
   De pagina opende met "Four tiers. One promise." en een lede zonder
   productnaam; er was geen zelfstandige alinea om op te halen. PR #404 zet
   die alinea erin; `/pricing.md` (#403) geeft de platte versie. **Hermeet
   vraag 3 pas na een herindexering** — een week is te vroeg, een maand niet.
3. **Bij de onderwerpen worden we nergens genoemd**, ook niet bij de twee
   rekentool-vragen (8, 9) waar `/tools/energy-roi` een direct antwoord is.
   De vier tools die wél genoemd worden hebben iets gemeen: ze staan op
   Nederlandse domeinen die al over zonnepanelen gaan, met de tool als
   hoofdinhoud van de pagina. Onze rekenmachine staat op een Engelstalig
   consultancydomein onder `/tools/`. Dat is geen GEO-gebrek maar een
   distributiekeuze, en hij staat al open in `docs/seo-geo-plan.md` §5 rij 6
   (rekenmachine-route) — en in `docs/backlink-strategie.md` §2: de tool bij
   de drie partnerprofielen zetten.
4. **Vraag 10 is de interessantste.** Het antwoord gebruikt "vijf momenten"
   tussen aanvraag en offerte, wat sterk lijkt op het vijf-lekken-kader van
   de site, en citeert drie andere domeinen. Of dat toeval is of een
   ongenoemde bron, is niet vast te stellen. Wat wél vaststaat: de vijf
   plekken (survey, phasing, commissioning, control room, honest numbers)
   staan als één zin midden in een verhaalalinea (`story.body.p3`) en de scan
   meet weer andere blokken; nergens staat één zelfstandige alinea die de
   vraag "wat zijn de vijf omzetlekken?" beantwoordt. Dat is dezelfde fout
   als bij vraag 3, op een onderwerp dat we wél zouden kunnen winnen.

## Wat eruit volgt, in volgorde

| | wat | waar | stand |
|---|---|---|---|
| 1 | definitiezin op `/pricing` | #404 | open PR |
| 2 | `/pricing.md` | #403 | open PR |
| 3 | één zelfstandige alinea "de vijf plekken waar omzet lekt" met de vijf namen, op `/about` en `/services`, plus als FAQ-vraag | code, volgende sessie — eerst kiezen of de scanblokken en de vijf plekken één kader zijn of twee | niet begonnen |
| 4 | de rekenmachine op een Nederlands domein of bij partners | beslissing Juan (`seo-geo-plan.md` §5 rij 6) | open sinds 2026-08-20 |
| 5 | hermeting van deze tien vragen | handwerk, eerste week van december 2026 | — |

## Toevoegingen aan de lijst

*(datum — vraag — reden)*

—
