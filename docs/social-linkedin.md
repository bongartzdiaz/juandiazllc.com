# LinkedIn — het kanaal, het profiel en de motor

Dit voert §6 van `docs/bereik-plan.md` uit. De kanaalkeuze stond daar al
onderbouwd en wordt hier niet overgedaan: **één kanaal, LinkedIn, persoonlijk
profiel.** Wat hieronder staat is het uitvoerbare deel.

Alles is gemeten op 2026-08-25 tenzij er een andere datum staat.

## Wat ik niet doe, en waarom dat hier staat

**Accounts aanmaken doe ik niet.** Dat is een harde grens, geen voorkeur.
**Posten namens jou doe ik ook niet** zonder dat je per bericht akkoord geeft;
publiceren is naar buiten gericht en onomkeerbaar.

Wat hier staat is daarom plak-klaar. Jij bent de laatste stap, met opzet.

En de grens uit §6 blijft ongewijzigd en is niet onderhandelbaar: posten op je
eigen tijdlijn valt buiten het verbod, **connectieverzoeken en DM's worden nooit
geautomatiseerd.** Dat geldt ook als een prompt uit een pakket erom vraagt.

## Wat er staat, gemeten

| kanaal | stand |
|---|---|
| LinkedIn persoonlijk `/in/juanstefan` | bestaat, staat in `PERSON_SAME_AS` én zichtbaar op `/contact` |
| LinkedIn bedrijf `/company/juandiazllc` | bestaat, staat in `ORG_SAME_AS` — **maar nergens zichtbaar voor een mens** |
| Instagram `@diazelcazador` | bestaat, zichtbaar op `/contact` |
| GitHub `bongartzdiaz` | bestaat, persoonlijk |
| X / Twitter | bestaat niet; in #198 uit `sameAs` gehaald omdat hij 404 gaf |
| TikTok, YouTube | komen in de codebase niet voor |

Twee dingen die opvallen en die van jou zijn om te beslissen, niet van mij:

1. **De bedrijfspagina is voor een bezoeker onvindbaar.** Hij staat alleen in
   JSON-LD. Een bezoeker die je bedrijf op LinkedIn zoekt vindt hem via Google,
   niet via je eigen site.
2. **Instagram staat als kanaal op de site.** `@diazelcazador` draagt een andere
   belofte dan `juandiazllc.com`. Dat is merkwerk en geen distributiewerk, en het
   is jouw keuze of die link daar hoort.

**Voorraad:** 21 artikelen die in de Nederlandse markt staan, over zeven
onderwerpen. Energy 5, Real estate 4, Hospitality 4, Systems 4, Logistics 2,
Strategy 1, Growth 1. Dat is de grondstof.

---

## 1. Het profiel

Het profiel is de landingspagina van elke post. Eenmalig werk, en het rendeert
bij elke post daarna opnieuw.

### Kop (LinkedIn staat 220 tekens toe)

```
Fractional revenue operator. Ik zoek uit waar je operatie en je cijfers uit elkaar lopen, en bouw dan het eerste stuk dat het dichttrekt. Energie, vastgoed, horeca. NL/BE.
```

166 tekens. De kop staat onder je naam in elke zoekopdracht, elke reactie en
elke post, dus hij moet los van context leesbaar zijn.

### Over (LinkedIn staat 2.600 tekens toe)

Alleen de eerste twee regels zijn zichtbaar voordat iemand op "meer" klikt.
Daarom staat de scherpste zin bovenaan en niet de introductie.

```
De meeste operators hebben geen softwareprobleem. Ze hebben vier systemen die op dezelfde vraag vier antwoorden geven.

Ik kom uit de bouw. Daar is een bouwplan iets waar getallen in staan en waar een aannemer mee vooruit kan. Dat doe ik nu voor operaties: uitzoeken waar je operatie en je cijfers uit elkaar lopen, en dan het eerste stuk bouwen dat het dichttrekt.

Sectoren: energie, vastgoed, horeca. Nederland en België.

Uit lopende opdrachten, geanonimiseerd:

+38% lead-naar-call-conversie nadat een 4-tool-stack werd vervangen door één CRM + WhatsApp-flow. Nederlandse zonne-installateur, 90 dagen.

3,2x pipeline-snelheid zodra het veldteam en kantoor realtime dezelfde deal-status deelden. NL/BE energiemakelaar, 6 maanden.

−61% tijd-tot-offerte na automatisering van de gegevensoverdracht van intake naar survey naar voorstel. Residentiële batterij-installateur, Q1-uitrol.

€0 extra SaaS-uitgaven. De besparing op afgeschaalde tools financierde de rebuild. Multi-vestiging operator, jaar één.

Hoe het loopt:

1. Blueprint-gesprek van een kwartier, gratis. Je krijgt een diagnose van één pagina, ook als je daarna niets doet.
2. Diagnosesprint van 30 dagen, €2.500 excl. btw. Je krijgt het bouwplan plus het eerste onderdeel dat al draait. Allebei van jou, ook als een ander het uitvoert.
3. Bouwen. De sprintprijs gaat er volledig vanaf.

Ik draag drie trajecten tegelijk. Op de uitkomst geef ik geen garantie. Op de levering wel.

Ik schrijf wekelijks over verplichtingen die volgend jaar hard worden: het einde van de saldering, ETS2, energielabel 2030, WPM. juandiazllc.com/nl/insights

info@juandiazllc.com
```

Elk cijfer hierboven komt woordelijk uit `docs/claims.md` en uit de gepubliceerde
Nederlandse kopij (`results.r1..r4` in `lib/i18n/dict.ts`). Er staat **geen enkel
getal in dat niet al ergens gepubliceerd is**. Verander je er een, verander hem
dan eerst in `docs/claims.md`; de poort in `ResultsStrip.test.ts` bewaakt dat aan
de site-kant al.

### De bedrijfspagina

Zelfde tekst werkt daar niet: die is van de rechtspersoon en niet van jou. Kort
houden, en hem vooral laten verwijzen naar het persoonlijke profiel, want daar
gebeurt het.

```
Juan Diaz, LLC bouwt de systemen waarmee operators in energie, vastgoed en horeca zien waar hun omzet weglekt, en daarna het stuk dat het dichttrekt.

Werkwijze: blueprint eerst, bouwen daarna. Een diagnosesprint van 30 dagen levert een bouwplan plus het eerste werkende onderdeel op, allebei eigendom van de klant.

Producten: Voltafy, Performance Tracker, Help Mij Besparen, Salderingsregeling 2027.

juandiazllc.com
```

De vier productnamen staan in `lib/ventures.ts` als `live` en worden door
`lib/ventures.test.ts` bewaakt. Philly staat er bewust **niet** bij: die is in
aanbouw, en #188 heeft precies die claim uit de site gehaald.

---

## 2. De motor: 21 artikelen worden zes weken

De inhoud bestaat al. Wat ontbreekt is dat iemand hem ergens neerzet. Nieuwe
stukken bedenken terwijl bestaande stukken ongelezen liggen is de duurste
volgorde die er is.

### De vorm, de kalender en de posts

Die staan in `docs/linkedin-posts.md`, en alleen daar. Twaalf posts in de
volgorde waarin ze de deur uit gaan, met de vier vorm-regels ervoor en per post
de doelgroep en het slot. De artikel-URL's zijn op productie gemeten en
`lib/linkedin-posts.test.ts` houdt vast dat ze naar bestaande NL-artikelen
blijven wijzen.

Wat hier blijft staan is de redenering: welk kanaal, welk profiel, en waarom de
inhoud die er al ligt eerst aan de beurt is.

## 3. Wat hier niet beloofd wordt

- **Geen bereikcijfer.** Er is geen basislijn. Wat een post op LinkedIn doet
  hangt van meer af dan van de tekst.
- **Geen postfrequentie als belofte.** Twee per week is een voorstel.
- **Geen tweede kanaal** tot het eerste aantoonbaar iets doet.
- **Geen conversiecijfer.** Zolang de Plausible-doelen niet bestaan is een klik
  vanaf LinkedIn niet te onderscheiden van geen verkeer. Dat is stap 1 hieronder,
  en dat is precies waarom hij stap 1 is.

## 4. Wat er van jou nodig is

In deze volgorde, want ze blokkeren elkaar.

1. **De vijf Plausible-doelen aanmaken.** Staat al op de operator-lijst bovenaan
   `CLAUDE.md`. Zonder die doelen worden de kliks binnengehaald en weggegooid, en
   dan is meten of dit werkt onmogelijk.
2. **Kop en Over op het persoonlijke profiel plakken.** Tien minuten.
3. **Beslissen over de bedrijfspagina.** Wel of niet zichtbaar maken op de site.
   Wil je hem zichtbaar: dat is één regel in `components/sections/Contact.tsx`.
4. **Beslissen over de Instagram-link.** Blijft `@diazelcazador` op `/contact`
   staan, of gaat hij eruit tot er een zakelijk account is?
5. **Post 1 plaatsen.** De rest volgt vanzelf zodra de eerste er staat.

Stap 2 tot en met 5 kunnen vandaag. Stap 1 bepaalt of je over zes weken weet of
het gewerkt heeft.
