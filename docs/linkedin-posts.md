# LinkedIn — de wachtrij

Twaalf posts, plak-klaar, in de volgorde waarin ze de deur uit gaan. Dit is de
**enige** plek waar ze staan. `docs/social-linkedin.md` gaat over het waarom —
kanaalkeuze, profieltekst, vorm, kalender — en droeg tot 2026-08-28 zijn eigen
kopie van de eerste zes. Twee documenten die één tekst dragen lopen uit elkaar,
dus die kopie is hierheen verhuisd.

**Ik plaats niets.** Publiceren is naar buiten gericht en onomkeerbaar; jij bent
de laatste stap, met opzet. En de grens uit `docs/bereik-plan.md` §6 blijft
ongewijzigd: posten op je eigen tijdlijn valt buiten het verbod,
**connectieverzoeken en DM's worden nooit geautomatiseerd.**

## Gemeten op 2026-08-28

| | uitkomst |
|---|---|
| de twaalf artikel-URL's op productie | **alle twaalf 200** |
| negatieve controle (`/nl/insights/deze-slug-bestaat-niet-xyz`) | 404 — dus die 200's zijn echte metingen |
| taal van de artikelen op `/nl` | alle twaalf Nederlands; de drie all-market-stukken dragen een `i18n.nl` |
| langste post | 1.233 tekens, tegen de 3.000 die LinkedIn toestaat |
| voorraad NL-markt | 21 artikelen, afgeleid uit `getAllInsights("nl")` |

`lib/linkedin-posts.test.ts` houdt dit vast: elke URL hieronder wijst naar een
slug die werkelijk in de Nederlandse markt gepubliceerd is, en geen post loopt
over de tekenlimiet. Een 404 in een geplaatste post is het enige wat hier echt
schade doet, en dat is precies de fout die je pas ziet nadat iemand geklikt heeft.

## De vorm, in vier regels

1. **De eerste twee regels zijn de hele post.** De rest staat achter "meer".
2. **Eén observatie per post.** Wie drie dingen zegt, zegt niets.
3. **De link onderaan, kaal.**
4. **Zeg hardop wat je niet weet.** Post 9 doet dat woordelijk. Dat is in dit
   dossier het sterkste wat je hebt, want de concurrentie belooft rendementen
   die niemand kan onderbouwen.

Elke bewering hieronder staat ook in het artikel waarnaar hij linkt. De posts
zijn geschreven ná het lezen van de bodies. Een post die specifieker is dan zijn
artikel is verzonnen, en dat is in dit dossier de duurste fout: twee van deze
artikelen dragen zelf een kop **"Wat ik hier niet beweer"**.

**Geen bedrag in welke post dan ook.** De cijfers staan in de Over-tekst van je
profiel, en die komen woordelijk uit `docs/claims.md`.

## Cadans

Twee per week, dinsdag en donderdag, zes weken. Dat is een voorstel en geen
belofte: een cadans die je niet volhoudt is slechter dan geen cadans, en dit
gaat over jouw uren.

De sector wisselt bewust per post. Zes energieposts achter elkaar leest als één
onderwerp, en dan ben je de vastgoed- en horecalezer in week twee kwijt.

| week | dinsdag | donderdag |
|---|---|---|
| 1 | 1 · Salderen stopt | 2 · Dashboards liegen |
| 2 | 3 · Energielabel 2030 | 4 · Tien minuten voor check-in |
| 3 | 5 · WPM datakwaliteit | 7 · Thuisbatterij terugverdientijd |
| 4 | 6 · ETS2 op de gasrekening | 8 · Je vaste gast is een vreemde |
| 5 | 9 · Kostprijs per kilometer | 10 · Waarom operator-CRM's het begeven |
| 6 | 11 · Dynamisch contract doorrekenen | 12 · Het ESG-cijfer |

De nummers lopen niet gelijk met de kalender, en dat is geen slordigheid: post 6
is als vierde geschreven en post 7 als zevende. Plaats op volgorde van de tabel,
niet van het nummer.

---

## 1 — Salderen stopt

`dinsdag week 1` · installateurs

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

## 2 — Dashboards liegen

`donderdag week 1` · directies, alle sectoren

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

## 3 — Energielabel 2030

`dinsdag week 2` · vastgoedoperators

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

## 4 — Tien minuten voor check-in

`donderdag week 2` · horeca

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

## 5 — WPM datakwaliteit

`dinsdag week 3` · vervoerders en werkgevers met 100+

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

## 6 — ETS2 op de gasrekening

`dinsdag week 4` · vastgoed en multi-locatie

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

## 7 — Thuisbatterij terugverdientijd

`donderdag week 3` · installateurs

```
Zeven jaar staat in elke folder. Dat getal geldt voor bijna niemand.

Vraag drie aanbieders naar de terugverdientijd van dezelfde thuisbatterij en je krijgt drie getallen tussen de vijf en de twaalf jaar. Geen van drieën liegt. Ze rekenen met verschillende aannames, en de aanname die je niet ziet bepaalt het antwoord.

Vier dingen bepalen die uitkomst, en geen ervan staat in de brochure.

Hoeveel van je zonnestroom je nu al zelf gebruikt. Wat je na 2027 nog voor teruglevering krijgt. Hoe ver dag- en piektarief uit elkaar liggen. En of er binnen drie jaar een warmtepomp of een EV bij komt.

Dezelfde batterij is bij het ene huishouden in zes jaar rond en bij het volgende in dertien.

Wat wel werkt is saai: reken het twee keer door. Eén keer met de prijzen van nu, één keer met een pessimistisch scenario. Komt hij in beide gevallen rond, dan is het een beslissing in plaats van een gok.

De klant die na 2027 tevreden blijft is niet degene die de laagste prijs kreeg. Het is degene die vooraf een som zag kloppen die op zijn eigen huis sloeg.

juandiazllc.com/nl/insights/thuisbatterij-terugverdientijd-2027
```

---

## 8 — Je vaste gast is een vreemde

`donderdag week 4` · horeca

```
Vier systemen houden vier verschillende mensen bij, en geen van die vier is je vaste gast.

Dezelfde gast boekte via een reisbureau, rekende aan de bar af op kamernummer, kwam op de wifi met een privéadres en schreef een review onder een bijnaam.

Elk personalisatieproject begint met een platform dat gastdata samenbrengt. Daaronder ligt de aanname dat die data ooit is vastgelegd mét iets om hem op samen te brengen. Meestal is dat niet gebeurd.

De sleutel is geen technologie maar een beslissing: wat identificeert hier een gast.

E-mail ligt voor de hand, en het reisbureau breekt hem. Een telefoonnummer overleeft meer van de reis. Een loyaltynummer werkt alleen als aanmelden gebeurt op een moment waarop de gast een reden heeft — en dat is nooit bij check-in, als hij zijn sleutel wil.

Welk veld het ook wordt, het moet op elk contactmoment hetzelfde veld zijn. Dat is werk zonder glans en het is het hele project.

Begin daarom kleiner dan je leverancier voorstelt. Eén sleutel, twee contactmomenten, en bewijs met de hand dat je één maand aankomsten aan een eerder verblijf kunt koppelen. Lukt dat niet bij twee, dan lukt het ook niet bij acht.

juandiazllc.com/nl/insights/your-returning-guest-looks-new-to-every-system
```

---

## 9 — Kostprijs per kilometer

`dinsdag week 5` · vervoerders

```
Neemt de brandstofclausule in je vervoerscontracten de CO2-component mee?

Die clausule verwijst bijna altijd naar een marktindex. Of die index de CO2-kosten meeneemt is de vraag die je deze maand aan je eigen contractenmap kunt stellen.

Ik weet het antwoord niet. Dat hangt per index en per contract af. Maar het bepaalt wel of deze hele kwestie jouw probleem is of dat van je klant.

Wat eronder ligt: vanaf 2027 vallen brandstofleveranciers onder ETS2. De verplichting ligt bij hen, niet bij jou. Geen vergunning, geen rapportage.

Dat klinkt comfortabel en het is het tegenovergestelde. Bij een kostenpost die via een derde binnenkomt ken je de datum niet, het tarief niet en de grondslag niet. En wanneer een leverancier gaat doorberekenen is een commerciële beslissing, geen wettelijke.

De reflex is scherper inkopen. Dat helpt marginaal, want je kunt een aanbod niet beoordelen zolang je je eigen basislijn niet scherp hebt.

Die vraag nu stellen kost een middag. Hem in 2027 stellen kost een onderhandeling.

juandiazllc.com/nl/insights/kostprijs-per-kilometer-ets2-de-component-die-u-niet-ziet
```

---

## 10 — Waarom operator-CRM's het begeven

`donderdag week 5` · directies, alle sectoren

```
Je kocht een CRM, zette de contacten over en gaf twee trainingen. Binnen een kwartaal liep de pijplijn weer via WhatsApp en het geheugen.

Het symptoom is gebruik. De oorzaak is ontwerp.

Een CRM wordt verlaten omdat hij is ingericht op wat het kantoor wil zien en niet op wat het veldteam moet doen. De dashboards zijn mooi, het invoeren is duur. Dus de mensen die de omzet maken stoppen met invoeren, de dashboards lopen leeg, en de directie noemt het een technisch probleem.

Eén toets voorspelt het bijna altijd. Kan een verkoper een deal bijwerken tijdens het lopen van de parkeerplaats naar de voordeur? Zo niet, dan verliest het CRM al.

Wat je doet voordat je een leverancierscontract aanraakt: schrijf de tien handelingen op die je team op een gewone dinsdag het vaakst doet. Bouw die tien als flows van één tik. Alles wat meer dan drie tikken kost gaat terug naar de tekentafel.

Die tien flows zijn het systeem. De rest is rapportage.

juandiazllc.com/nl/insights/why-operator-crms-fail
```

---

## 11 — Dynamisch contract doorrekenen

`dinsdag week 6` · installateurs en energieadviseurs

```
Met saldering maakte het niet uit wanneer je stroom terugleverde.

Vanaf 2027 worden het uur waarop je levert en het uur waarop je verbruikt twee verschillende getallen.

Daar zit het hele verhaal van het dynamische contract.

Je panelen leveren het meest rond het middaguur — precies het moment waarop half Nederland ook levert en de prijs richting nul zakt. Je afname zit 's ochtends en 's avonds, als de prijs juist hoog is. Zonder batterij of sturing verkoop je dus goedkoop en koop je duur.

Dat is de asymmetrie die de meeste verkoopgesprekken overslaan.

En het antwoord verschilt per huishouden. Hoog zelfverbruik overdag: dynamisch wint vaak. Leeg huis overdag met een piek 's avonds: dynamisch kost geld ten opzichte van een vast contract. Met een batterij of slimme sturing kantelt het profiel weer.

Dus reken het door met het verbruiksprofiel per uur, niet met het jaargemiddelde dat in elke folder staat. En neem minstens één pessimistisch scenario mee.

Een dynamisch contract is geen product dat je verkoopt. Het is een uitkomst die je uitrekent — en wie eerlijk laat zien wanneer het níét de moeite waard is, wint de klant die twijfelt.

juandiazllc.com/nl/insights/dynamisch-energiecontract-na-de-salderingsregeling
```

---

## 12 — Het ESG-cijfer dat niemand verdedigt

`donderdag week 6` · vastgoedoperators

```
Je ESG-rapport heeft drie decimalen en een nette grafiek. Dat is precies waarom niemand doorvraagt.

Het cijfer is in twee weken haastwerk samengesteld uit de systemen van een stuk of twaalf beheerders, elk met een eigen definitie van energieverbruik, bezetting en algemene ruimte.

Een due-diligenceteam stelt drie vragen.

Van welke meter komt dit kWh-cijfer, en klopt het met de energienota? Als twee panden dezelfde intensiteit rapporteren, delen ze dan door dezelfde noemer? En als ik dit ene pand vanaf de bron opnieuw doorreken, kom ik dan op jouw getal uit?

Is het antwoord op een van die drie een spreadsheet en een telefoontje naar de beheerder, dan is het cijfer een verhaal en geen meting. Een goede analist vindt de naad binnen een middag.

De oplossing is geen beter rapport. Definieer de cijfers één keer — welke meter, welke noemer, welke periode — en bereken ze doorlopend vanaf de bron. Dan is het jaarrapport een schermafdruk van iets wat het hele jaar al waar was.

Wijkt het dashboard af van de factuur, dan heeft het dashboard ongelijk. En dat merk je in maart in plaats van in de dataroom.

juandiazllc.com/nl/insights/the-esg-number-your-asset-manager-cant-defend
```

---

## Wat hier niet beloofd wordt

Vier dingen, en ze staan in `docs/social-linkedin.md` §3 — bij de kanaalkeuze
waar ze horen. De kortste versie: er is geen basislijn, en zolang de vijf
Plausible-doelen niet bestaan is een klik vanaf LinkedIn niet te onderscheiden
van geen verkeer.
