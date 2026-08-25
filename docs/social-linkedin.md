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

juan@juandiazllc.com
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

### De vorm

Elk artikel levert twee tot drie posts op, want een artikel draagt meerdere
observaties en een post draagt er één. 21 artikelen is dus geen zes weken maar
ruim een half jaar, mits je per post één ding zegt.

Vier regels die de vorm bepalen:

1. **De eerste twee regels zijn de hele post.** De rest staat achter "meer".
   Zet daar de observatie, niet de aanloop.
2. **Eén observatie per post.** Wie drie dingen zegt, zegt niets.
3. **De link onderaan, kaal.** Een post die zonder doorklikken al iets waard is
   wordt gelezen; een post die alleen een teaser is wordt weggescrold.
4. **Zeg hardop wat je niet weet.** Twee artikelen doen dit al expliciet, onder
   de kop "Wat ik hier niet beweer". Dat is in dit dossier het sterkste wat je
   hebt, want de concurrentie belooft rendementen die niemand kan onderbouwen.

### Kalender

Twee posts per week, dinsdag en donderdag. Dat is een voorstel en geen belofte:
een cadans die je niet volhoudt is slechter dan geen cadans, en dit gaat over
jouw uren.

| week | dinsdag | donderdag |
|---|---|---|
| 1 | Salderen stopt (energie) | Dashboards liegen (systems) |
| 2 | Energielabel 2030 (vastgoed) | Tien minuten voor check-in (horeca) |
| 3 | WPM datakwaliteit (logistiek) | Thuisbatterij terugverdientijd (energie) |
| 4 | ETS2 gasrekening (vastgoed) | Vaste gast is een vreemde (horeca) |
| 5 | Kostprijs per kilometer (logistiek) | Waarom operator-CRM's het begeven (systems) |
| 6 | Dynamisch contract doorrekenen (energie) | Het ESG-cijfer dat niemand verdedigt (vastgoed) |

De volgorde wisselt bewust van sector. Zes energieposts achter elkaar leest als
één onderwerp, en dan ben je de vastgoed- en horecalezer in week twee kwijt.

### Zes uitgeschreven posts

Hieronder staan de eerste zes, plak-klaar. Ze zijn geschreven ná het lezen van
de artikelbodies, dus elke bewering erin staat ook in het artikel. Wat er niet
in staat, staat er niet in.

---

**1 — Salderen stopt** · dinsdag week 1 · doelgroep: installateurs

```
Salderen stopt in 2027. Je klanten weten dat half, en dat halve weten is het probleem.

De meeste installateurs behandelen het als een voetnoot. Een regel onderaan de offerte, een antwoord als de klant erover begint.

Dat is een gemiste kans, om een reden die weinig met techniek te maken heeft. Dit gesprek wordt één keer gevoerd, en degene die het voert wint het.

Er zijn drie groepen die het deze maand nodig hebben, en ze vragen elk iets anders. Wie ze door elkaar haalt, verliest bij alle drie.

In alle drie de gesprekken is het sterkste wat je kunt doen niet praten. Rekenen. Laat de klant zijn eigen cijfers zien in plaats van een algemeen verhaal.

En zeg hardop wat je niet weet. Een installateur die zegt dat niemand de prijs van 2028 kent, wordt eerder geloofd dan een die een rendement belooft.

Welke drie groepen, en de drie zinnen die twijfel wegnemen:
juandiazllc.com/nl/insights/salderen-stopt-wat-installateurs-nu-moeten-vertellen
```

---

**2 — Dashboards liegen** · donderdag week 1 · doelgroep: directies, alle sectoren

```
Het dashboard stond groen. Twee weken later viel er een klant weg.

Elke directeur heeft dat moment gehad, en bijna niemand noemt het hardop.

Er is een doorlichting van een uur die je vandaag kunt doen. Stel bij elke tegel twee vragen.

Eén: welke beslissing neem ik anders als dit getal groen wordt?

Twee: wat zou er waar moeten zijn om dit getal groen te laten staan terwijl het slecht gaat?

Tegels die op de eerste vraag geen antwoord hebben kosten je aandacht en geven niets terug. Tegels die op de tweede vraag een makkelijk antwoord hebben zijn de gevaarlijke.

Begin bij de beslissing en niet bij de data. Dat dwingt ongemakkelijke gesprekken af, en precies die gesprekken maken een dashboard de moeite waard.

juandiazllc.com/nl/insights/why-most-operator-dashboards-lie
```

---

**3 — Energielabel 2030** · dinsdag week 2 · doelgroep: vastgoedoperators

```
Je deadline is 1 januari 2030. Je meetlat verandert in datzelfde jaar.

De slechtst presterende utiliteitsgebouwen moeten dan op label D. Dat is de enige harde datum in dit dossier.

Wat er in datzelfde jaar gebeurt: de labelschaal wordt opnieuw ingedeeld, de A-plussen vervallen, en er komt een gemoderniseerde bepalingsmethode. Hoe die twee zich tot elkaar verhouden weet vandaag niemand precies.

En de regels waaraan je in 2030 moet voldoen liggen pas in 2027 vast. Dat is drie jaar voorbereiding voor een portefeuille waarin één renovatie al langer duurt.

De reflex is wachten tot 2027 en dan een adviesbureau een nulmeting laten doen. Dat is de duurste variant.

Wat wel werkt is saai. Zorg dat je de rangorde zelf opnieuw kunt draaien. Verbruik per gebouw uit de facturen en de meterstanden, niet uit de doorbelasting. Bij elk cijfer vastleggen waar het vandaan komt en op welke datum.

De vraag om deze week mee te beginnen is klein genoeg. Kun je vandaag, zonder iemand te bellen, per gebouw laten zien waar het verbruikscijfer vandaan komt?

juandiazllc.com/nl/insights/energielabel-2030-de-meetlat-verandert-mee
```

---

**4 — Tien minuten voor check-in** · donderdag week 2 · doelgroep: horeca

```
Vraag een revenue manager waar de marge zit en hij wijst naar de prijslijst.

Vraag waar hij weglekt en het eerlijke antwoord is: in de tien minuten vóór check-in.

De upsell die niet kwam. De kamer die uit gewoonte werd toegewezen. De prijs die te lang bleef staan.

Horeca is een van de laatste sectoren waar een ervaren operator per geval omzetbeslissingen neemt zonder gereedschap om ze aan te toetsen. Aan de balie, waar de omzet daadwerkelijk ontstaat, staat vrijwel geen software.

Geen van die drie lekken is een probleem van je prijstool. Het zijn beslissingsproblemen op het moment zelf.

De revenue manager heeft geen mooier rapport over vorige week nodig. Hij heeft iets nodig dat de juiste keuze duidelijk maakt in de tien minuten dat hij hem nog kan maken.

juandiazllc.com/nl/insights/the-ten-minutes-before-check-in
```

---

**5 — WPM datakwaliteit** · dinsdag week 3 · doelgroep: vervoerders en werkgevers met 100+

```
Het toezicht kijkt niet alleen of je rapporteert. Het kijkt ook of je cijfers kloppen.

Werkgevers met honderd of meer werknemers leveren sinds 1 juli 2024 jaarlijks gegevens aan over zakelijk verkeer en woon-werkverkeer. Op zichzelf een administratieve klus.

Bij een vervoerder is de ironie compleet. Een bedrijf dat voor de kost dingen over de weg verplaatst en dat tot op de kilometer meet, blijkt niet te kunnen zeggen hoe zijn eigen mensen op het werk komen.

Niet omdat niemand het bijhoudt. Omdat vier systemen elk een stukje hebben.

Een verslag samenstellen uit die vier kost een paar dagen en het lukt. Het probleem komt bij de vraag daarna: waar komt dit getal vandaan, en klopt het.

Daar valt het meestal om. Het verslag van vorig jaar is gemaakt door iemand die inmiddels iets anders doet, in een spreadsheet die niemand meer helemaal begrijpt.

Er ligt trouwens een ontwerp-wijzigingsbesluit dat de grens naar 250 wil verplaatsen. Wanneer dat ingaat is niet bekend. Je kunt er dus niet op wachten, en je kunt er ook geen eenmalig project van maken.

juandiazllc.com/nl/insights/wpm-de-omgevingsdienst-controleert-uw-cijfers-niet-uw-inzending
```

---

**6 — ETS2 op de gasrekening** · dinsdag week 4 · doelgroep: vastgoed en multi-locatie

```
Je gasrekening krijgt er een component bij. Je ziet niet wanneer hij binnenkomt, en niet hoeveel hij is.

Vanaf 2027 vallen brandstofleveranciers onder ETS2. De verplichting ligt bij hen en niet bij jou. Geen vergunning, geen rapportage, geen registeraccount.

Dat klinkt als goed nieuws en het is het tegenovergestelde.

Bij een heffing die je zelf afdraagt ken je de datum, het tarief en de grondslag. Bij een kostenpost die via een derde binnenkomt ken je geen van drieën. Wanneer een leverancier gaat doorberekenen is bovendien een commerciële beslissing en geen wettelijke.

De gebruikelijke reactie is scherper inkopen. Langer vastzetten, meer offertes, een adviseur op de tender. Dat helpt marginaal en het laat het onderliggende probleem staan, want je kunt de stijging niet toerekenen.

Wie zijn verbruik per object kent en weet waar dat cijfer vandaan komt, ziet een tariefstijging binnen een maand terug in zijn eigen cijfers. Wie dat niet heeft ziet alleen een hogere factuur.

En wat ik hier niet beweer: ik heb geen bedrag. Dat hangt af van een veilingprijs die nog niet bestaat.

juandiazllc.com/nl/insights/ets2-de-gasrekening-krijgt-een-component-erbij
```

---

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
