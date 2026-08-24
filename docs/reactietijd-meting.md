# Reactietijd meten bij bedrijven — protocol

Opgesteld 2026-08-24. Dit is een operator-document: Juan voert het uit, met de
hand, en niets eraan is geautomatiseerd.

Het meet één ding: **hoe lang duurt het voordat er een mens antwoordt op een
bericht dat buiten kantooruren binnenkomt.** Dat is het enige getal dat deze
opzet oplevert, en §0 zegt precies wat het wel en niet betekent.

De aanleiding is blok B van de lekkage-scan (`lib/lekkage-scan.ts`, vraag B3).
Die vraagt bedrijven om hun eigen reactietijd op te zoeken. Dit protocol doet
hetzelfde van buitenaf, bij één bedrijf tegelijk, zodat het gesprek begint met
een getal dat de ander zelf kan natrekken in plaats van met een aanname.

---

## §0 — Wat dit meet, en wat het niet meet

**Wat het meet.** De verstreken tijd tussen een bericht dat via één specifiek
kanaal binnenkomt op een specifiek moment, en het eerste inhoudelijke antwoord
van een mens. Voor dat ene bericht, op die ene avond.

**Wat het niet meet, en waar je dus niets over mag zeggen:**

| | waarom niet |
|---|---|
| hoe snel ze op een **koopklare** lead reageren | een bericht van een onbekend bedrijf komt in dezelfde inbox maar niet in dezelfde triage. Waarschijnlijk reageren ze op een consument met een dak sneller. Die richting is bekend, de omvang niet. |
| hoe snel ze **gemiddeld** zijn | één meting is één avond. Ziekte, vakantie, één drukke dinsdag. |
| of sneller reageren hén iets oplevert | dat is een oorzakelijke claim. Dit meet er niet aan. |
| hoe ze het doen **ten opzichte van anderen** | zie §8: je hebt geen recht om de meting van bedrijf A aan bedrijf B te laten zien. |

**De regel die daaruit volgt, en die het hele protocol draagt:**

> **Je mag het voorval noemen, niet het patroon.**
>
> "Op dinsdag 26 augustus om 20:30 stuurde ik een bericht; het antwoord kwam
> donderdag om 11:15" is een feit dat de ontvanger in zijn eigen mailbox kan
> controleren. "Jullie reageren traag" is een generalisatie op n=1.

---

## §1 — De grens

### Wat je zelf verboden hebt, en wat daarvan geldt

Deze vier staan als harde regel vast en veranderen hier niet:

- **geen geautomatiseerde formulierinzending** bij doelbedrijven
- **geen geautomatiseerde LinkedIn-connectieverzoeken of -DM's**
- **geen koude WhatsApp**
- **geen koude e-mail naar Duitsland**

Dat betekent: elke aanvraag wordt met de hand ingediend, en dat is meteen de
bovengrens van de batchgrootte (§2). De beperking is hier geen last maar de
reden dat de meting overeind blijft als iemand ernaar vraagt.

### Wat de wet erover zegt — en wat ik niet kan vaststellen

De **aanvraag zelf** is geen commerciële communicatie: het is een bericht via
een kanaal dat het bedrijf zelf voor contact heeft opengesteld, met een echte
naam en een echte vraag. Daar zit het probleem niet.

Het probleem zit in de **terugkoppeling**, en het hangt af van of ze
geantwoord hebben. Zie §7 — dat onderscheid is de kern van dit protocol.

> **Wat ik niet heb vastgesteld.** Of een ongevraagde commerciële e-mail aan
> een rechtspersoon met een op de eigen website gepubliceerd adres is
> toegestaan onder art. 11.7 Telecommunicatiewet. De ACM is de toezichthouder.
> Ik heb de bepaling niet tot op lid-niveau nagetrokken en ga hem hier niet
> samenvatten alsof ik dat wel heb gedaan.
>
> **Status: niet bevestigd.** Die regel is de schakelaar. Zolang hij zo staat
> ligt sjabloon B-2 in §7 stil, en de poort in `lib/reactietijd-protocol.test.ts`
> koppelt de twee aan elkaar: je kunt de blokkade daar niet weghalen zonder
> deze status hier ook om te zetten, en andersom evenmin.

---

## §2 — De opzet

| | |
|---|---|
| **batchgrootte** | **tien bedrijven.** Handmatig indienen kost per bedrijf een paar minuten; tien is te doen op één avond en levert een terugkoppeling op die je ook echt afmaakt. Vijfentwintig niet. |
| **tijdstip** | **dinsdag 20:30**, voor alle tien identiek, tot op het kwartier. |
| **kanaal** | **één per bedrijf**, en genoteerd. Meng het webformulier niet met WhatsApp of een direct mailadres — dat zijn drie verschillende systemen met drie verschillende bemensingen. |
| **cadans** | maximaal één batch per week. |
| **herhaling** | zie §5: minstens twee metingen per bedrijf, minstens twee weken uit elkaar, vóór je iets zegt dat verder gaat dan het voorval. |

**Waarom dinsdagavond.** Het is de scherpste vraag die je kunt stellen zonder
oneerlijk te zijn: komt er iets in beweging als er niemand achter de knoppen
zit. Kantooruren meten iets anders — daar meet je de wachtrij, niet de
bemensing. Kies er één en blijf erbij, anders vergelijk je dinsdagavond met
donderdagochtend.

**Sluit uit wie al klant of gesprekspartner is.** Een lopend traject vertekent
de reactietijd en de meting vertekent het traject.

---

## §3 — De aanvraag

Dit is het deel waar de opzet eerlijk of oneerlijk wordt. Drie regels, geen
uitzonderingen.

1. **Echte naam, echt bedrijf, echt adres.** Juan Diaz, juandiazllc.com, het
   mailadres dat je normaal gebruikt. Geen pseudoniem, geen wegwerpadres, geen
   tweede domein.
2. **Een vraag die je werkelijk beantwoord wilt hebben.** Geen verzonnen
   project, geen verzonnen dak, geen verzonnen budget.
3. **Niets verzwijgen dat de ander niet zelf kan zien.** Je noteert het
   tijdstip van je eigen bericht en van hun antwoord. **Beide tijdstempels
   staan in hun eigen mailbox.** Je leest niets af wat zij niet kunnen
   natrekken, en dat is precies waarom de terugkoppeling in §7 kan bestaan
   zonder dat je iemand voor de gek hebt gehouden.

**Wat je níet doet:** je zegt in de aanvraag niet dat je de tijd opneemt. Dan
meet je de reactie op "iemand kijkt mee" en niet de reactie op een gewoon
bericht. Dat is het enige wat je achterwege laat, en het is geen misleiding —
het is de reden dat de meting iets betekent. Bij de eerste terugkoppeling zeg
je het meteen (§7).

**De aanvraag zelf**, als voorbeeld — pas hem aan tot hij van jou is:

```mail
Onderwerp: Vraag over jullie offertetraject

Hallo,

Ik ben Juan Diaz. Ik bouw meetsystemen voor bedrijven die op offertes en
aanvragen draaien, vooral in de energie- en installatiehoek.

Eén vraag: wie gaat er bij jullie over het traject van aanvraag tot offerte?
Ik zou die persoon graag een korte vraag stellen over hoe dat bij jullie
loopt.

Juan Diaz
juandiazllc.com
```

Kort, waar, en beantwoordbaar. Hij vraagt om een doorverwijzing, niet om een
gesprek — dat is een lagere drempel en een eerlijker eerste stap.

**De aanhef draagt geen tijdstip, en dat is opzet.** "Goedenavond" klopt om
20:30 en is fout zodra je een minuut later verstuurt dan gepland; "Goedemorgen"
klopt niet als de herinnering van dag acht om drie uur 's middags de deur uit
gaat. Alle vier de sjablonen openen daarom met `Hallo,`. Eén onjuist detail in
de eerste regel is het soort ding dat de lezer laat zien dat er een sjabloon
onder ligt — en dan meet je de reactie op een sjabloon.

**Heeft het formulier geen onderwerpveld, zet de onderwerpregel dan als eerste
regel van het bericht**, gevolgd door een lege regel. Zo:

> Vraag over jullie offertetraject
>
> Hallo,
>
> Ik ben Juan Diaz. …

Niet in de aanhef proppen en niet weglaten. Weglaten lijkt onschuldig, maar de
onderwerpregel is wat het antwoord straks herkenbaar maakt in je eigen mailbox,
en §5 leest `verzonden` en `eerste_mens` daaruit af. Heet het veld `Betreft` of
"Ik heb een vraag over", dan hoort de regel dáár en niet ook nog in het bericht.

Welke van jouw formulieren zo'n veld hebben is een eigenschap van de batch en
niet van het protocol; dat staat in het draaiboek naast de batch zelf.

---

## §4 — De velden

Eén regel per meting. Neem alle velden op, ook de lege: een leeg veld is een
uitkomst, geen ontbrekende invoer.

| veld | wat erin staat |
|---|---|
| `bedrijf` | handelsnaam zoals hij op de site staat |
| `kanaal` | `formulier` · `mail` · `whatsapp` — precies één |
| `verzonden` | datum + tijd met tijdzone, tot op de minuut |
| `bevestiging` | tijdstip van de automatische ontvangstbevestiging, of leeg |
| `eerste_mens` | tijdstip van de eerste poging tot contact door een mens |
| `medium_antwoord` | `mail` · `telefoon` · `whatsapp` · `geen` |
| `uren` | `eerste_mens` − `verzonden`, afgerond op een half uur |
| `binnen_24u` | ja / nee |
| `notitie` | één zin, feitelijk. Geen oordeel. |

### Wat wel en niet telt als antwoord

**Telt wel:**

- een mail van een mens met inhoud, hoe kort ook
- een telefoonpoging vanaf hun nummer, **ook als je niet opnam** — vanaf hun
  kant hebben ze gereageerd, en dat is wat je meet
- een WhatsApp-bericht van een mens

**Telt niet:**

- de automatische ontvangstbevestiging ("we hebben je bericht ontvangen") —
  die noteer je apart in `bevestiging`, want hij is op zichzelf informatief
- een afwezigheidsmelding
- een chatbot- of AI-antwoord zonder inhoudelijke reactie op je vraag
- een nieuwsbrief-inschrijving die vanzelf volgt

Dat onderscheid is niet muggenzifterij: een bedrijf met een keurige
ontvangstbevestiging en drie dagen stilte heeft een ander probleem dan een
bedrijf met niets van beide, en de terugkoppeling verschilt.

---

## §5 — De klok

**Start** bij `verzonden`. Niet bij het moment dat jij het formulier opende.

**Stop** bij `eerste_mens`.

**Afronden** op een half uur. Preciezer suggereert een nauwkeurigheid die de
opzet niet heeft — een mail kan minuten in een wachtrij staan.

**Kap af op 168 uur (zeven dagen).** Daarna noteer je `>168` en géén getal.
Nooit extrapoleren, nooit "waarschijnlijk een week of twee". Een afkapping is
een uitkomst; een schatting is een verzinsel.

**Twee metingen voordat je iets over een patroon zegt.** Minstens twee weken
uit elkaar, zelfde weekdag, zelfde tijd, zelfde kanaal. Eén meting mag je
feitelijk noemen (§0); pas bij twee metingen die dezelfde kant op wijzen mag
je "dit lijkt structureel" denken — en zelfs dan schrijf je het niet op als
feit.

---

## §6 — Waar het log staat

> **Niet in deze repo.** `bongartzdiaz/juandiazllc.com` is publiek. Het log
> bevat namen van bedrijven en hun reactiegedrag; dat is bedrijfsinformatie
> over derden en die hoort niet op GitHub.

Bewaar hem lokaal of in een afgeschermd document:

```
C:/business/Juan Diaz LLC/_metingen/reactietijd-<jaar>.csv
```

Belandt hij per ongeluk toch in de repo, dan hoort hij in `.gitignore` en moet
hij uit de historie — niet alleen uit de laatste commit.

**Noteer het bedrijf, niet de persoon.** Als er een naam onder het antwoord
staat is die niet nodig voor de meting, en zonder die naam heb je een
dataminimalisatie-vraag minder.

---

## §7 — De terugkoppeling

Hier splitst het protocol, en het splitst op het enige feit dat juridisch en
fatsoenlijk telt: **heeft het bedrijf zelf contact met je opgenomen?**

### Spoor A — ze hebben geantwoord

Dan bestaat er een lopende briefwisseling die zíj hebben voortgezet. Je
antwoordt in dezelfde draad. Dit is het schone pad, en het is de reden dat de
aanvraag in §3 een echte vraag moet zijn: als de vraag echt is, is het antwoord
echt, en dan is de draad echt.

```mail
Onderwerp: Re: <hun onderwerp>

Dank voor je reactie — en voor de doorverwijzing.

Eén ding hoort erbij, want het is de reden dat ik contact zocht. Ik heb de tijd
tussen mijn bericht en jullie antwoord opgeschreven. Ik stuurde het dinsdag om
20:30 via het contactformulier; het antwoord kwam donderdag om 11:15. Dat is
ruim achtendertig uur. Beide tijdstempels staan ook in jullie eigen mailbox,
dus je kunt het nakijken.

Ik zeg er meteen bij wat het niet is: één meting op één avond. Het zegt niets
over hoe jullie het doorgaans doen, en daar doe ik ook geen uitspraak over.
Wat het wel laat zien is wat er gebeurt met een bericht dat binnenkomt als er
niemand aan de knoppen zit.

Mijn vraag is deze: weten jullie zelf hoeveel uur daar gemiddeld tussen zit?

Als het antwoord nee is, is dat geen verwijt — het staat nergens, want er is
meestal geen systeem dat het bijhoudt. Ik heb er een vragenlijst voor gemaakt
die je in vier minuten doorloopt en die je zelf invult: juandiazllc.com/nl/tools/lekkage-scan.
Geen verplichting, geen mailadres nodig.

Juan Diaz
juandiazllc.com
```

**Wat er bewust niet in staat**, en dat is geen stijlkeuze:

| weggelaten | waarom |
|---|---|
| een vergelijking met andere bedrijven | dat is de meting van iemand anders. Zie §8. |
| "78% koopt bij wie het eerst reageert" | folklore zonder traceerbare bron. Zie `docs/claims.md`. |
| een garantie of "anders kost het niets" | er is geen uitkomstgarantie, beslist 2026-08-22. |
| "nog twee plekken deze week" | er zijn drie trajecten en alle drie zijn vrij. Een aftellend getal zonder onderhouden bron mag niet. |
| een prijs | de sprint kost €2.500 excl. btw, maar dat is een antwoord op een vraag die hier nog niet gesteld is. |

**Optioneel, één zin, en alleen als je hem wilt.** Er is precies één cijfer dat
je hier mág noemen: bedrijven die binnen het uur reageerden kwalificeerden
bijna zeven keer zo vaak een lead als bedrijven die er langer over deden
(Harvard Business Review, 2011, audit van 2.241 bedrijven). Noem er dan
meteen bij dat het Amerikaans onderzoek is en dat het over kwalificeren gaat
en niet over winnen. Zonder die twee zinnen is het een halve waarheid.

Mijn advies is hem weg te laten. Het getal over hén is sterker dan elke
benchmark, want dat kunnen ze controleren.

### Spoor B — ze hebben niet geantwoord

Hier horen twee berichten, en ze zijn niet van dezelfde soort. **B-1 is gewone
correspondentie en mag vandaag. B-2 is marketing en ligt stil.** Dat onderscheid
is het hele spoor; behandel ze niet als één ding.

#### B-1 — de herinnering

Een onbeantwoorde vraag één keer herhalen is geen reclame. Het is wat iedereen
doet die een bericht stuurde en niets terugkreeg, en het valt buiten de vraag
uit §1 omdat er geen aanbod in staat.

**Drie voorwaarden, alle drie:**

1. **Je wilt het antwoord nog steeds echt hebben.** Wil je dat niet, dan is de
   herinnering een voorwendsel om een deur open te krijgen, en dan stuur je hem
   niet. Dit is de enige voorwaarde die iemand anders niet voor je kan
   controleren.
2. **Er staat geen aanbod in.** Geen link naar de scan, geen dienst, geen
   cijfer, geen uitnodiging tot een gesprek.
3. **Je noemt de meting niet.** Daar is nog niets over te zeggen zolang er geen
   gesprek is.

**Wanneer.** Dag acht, in kantooruren. De meting is dan afgesloten — §5 kapt af
op 168 uur — dus je hoeft het tijdstip niet meer te sturen. Nu wil je juist
gelezen worden, en dat is een ander moment dan dinsdagavond.

```mail
Onderwerp: Mijn vraag van dinsdag

Hallo,

Vorige week dinsdagavond stuurde ik via jullie contactformulier een vraag: wie
gaat er bij jullie over het traject van aanvraag tot offerte? Ik heb er niets
op teruggehoord, en de kans is reëel dat het bericht niet is aangekomen.

Vandaar deze ene herinnering. Is het niet aan mij besteed, dan hoor ik dat ook
graag — dan laat ik het hierbij.

Juan Diaz
juandiazllc.com
```

**Waarom dit zonder aanbod sterker is dan met.** Antwoorden ze, dan zit je in
spoor A en mag alles wat daar staat — de herinnering zet B om in A zonder één
commerciële zin. Antwoorden ze niet, dan is dát het antwoord.

**Eén herinnering, daarna niets.** Geen tweede, geen derde, geen ander kanaal.

#### B-2 — de meting-mail (geschreven, geblokkeerd)

Dit is het bericht dat de meting wél noemt. Hij staat hier uitgeschreven zodat
je hem kunt beoordelen, en hij ligt stil tot de status in §1 omgaat.

**Hij bevat geen aanbod, en toch behandel ik hem als commercieel** — hij komt
van een partij met een belang, bij een bedrijf dat nooit om contact heeft
gevraagd. Dat is de conservatieve lezing en die houd ik aan tot een jurist iets
anders zegt.

**De inhoudelijke keuze die hem draagt:** zeven dagen stilte is vaker een kapot
formulier dan een traag bedrijf. Een formulier dat niets aflevert geeft geen
signaal — niemand merkt het, want er komt precies niets binnen en dat ziet er
hetzelfde uit als een rustige week. Daarmee is dit bericht een dienst en geen
verwijt, en dat is niet alleen aardiger maar ook waarschijnlijker waar.

```mail
Onderwerp: Jullie contactformulier

[NIET VERSTUREN — status in §1 staat op niet bevestigd]

Hallo,

Vorige week dinsdag om 20:30 heb ik via het contactformulier op jullie site een
vraag gesteld. Zeven dagen later was daar niets op teruggekomen, ook geen
ontvangstbevestiging. Mijn bericht staat aan jullie kant in een inbox, of het
is er nooit geweest. Dat kun je zelf nakijken, en dat is de reden dat ik het
meld.

Ik zeg er niets mee over hoe jullie doorgaans reageren. Dat weet ik niet, en
met een bericht kun je dat ook niet weten. Wat ik wel weet is dat er twee
verklaringen zijn en dat ze allebei het nakijken waard zijn. Of het formulier
levert niets af. Of het komt aan en er kijkt buiten kantooruren niemand naar.

De eerste kost je alles wat er via die weg binnenkomt. De tweede kost je alleen
de haastigen.

Nakijken kost twee minuten: vul je eigen formulier in met een privé-adres en
kijk of er iets aankomt. Daar heb je mij niet voor nodig.

Juan Diaz
juandiazllc.com
```

**Er staat bewust geen vervolgstap in.** Geen link, geen vraag, geen
uitnodiging. Als ze reageren zit je in spoor A en ligt alles open; reageren ze
niet, dan heb je iemand iets nuttigs verteld en houdt het op. Een bericht dat
niets vraagt is bovendien het enige dat je kunt sturen aan iemand die je niets
heeft gevraagd zonder dat het schuurt.

#### Wat er moet gebeuren voordat B-2 mag

1. Een jurist beantwoordt de vraag uit §1: mag ongevraagde commerciële e-mail
   naar een rechtspersoon met een op de eigen site gepubliceerd adres, onder
   art. 11.7 Telecommunicatiewet.
2. Komt daar een ja op — al dan niet onder voorwaarden — dan zet je **twee
   regels** om, en geen andere:
   - in §1: `Status: niet bevestigd` wordt de status die de jurist geeft
   - in het sjabloon hierboven: de regel `[NIET VERSTUREN — ...]` gaat eruit
3. De poort koppelt die twee. Haal je er één weg, dan wordt de suite rood. Dat
   is opzet: een sjabloon dat vrijgegeven is terwijl het document nog "niet
   bevestigd" zegt, is precies de toestand waarin iemand over een half jaar de
   verkeerde conclusie trekt.

Komt er een nee, of een ja onder voorwaarden waar je niet aan voldoet, dan
blijft B-1 het einde van het spoor. Dat is geen verlies: één eerlijke
herinnering en dan stoppen is een houding waar je later geen last van hebt.

#### Stoppen

**Elk negatief signaal is definitief.** "Graag geen mail meer", een
afmeldverzoek, een geërgerd antwoord, een spamklacht — het bedrijf gaat op een
niet-benaderen-lijst en komt in geen enkele volgende batch terug. Die lijst
draagt bedrijfsnamen en valt onder dezelfde bewaarregel als het meetlog (§6):
buiten deze repo.

Ook zonder negatief signaal geldt: na B-1 stuur je niets meer, en na een
eventuele B-2 evenmin.

**Het alternatief met een ander regime:** bellen. Zakelijk koud bellen valt
onder andere regels dan e-mail, en een gepubliceerd bedrijfsnummer is
uitgenodigd contact. Ook dat zou ik eerst laten bevestigen. Als je belt geldt
dezelfde inhoudelijke grens: het voorval noemen, niet het patroon, en geen
enkel cijfer dat niet in `docs/claims.md` staat.

---

## §8 — Wat je hiermee wel en niet mag beweren

**Nooit publiceren.** Niet op de site, niet in een bericht, niet
geanonimiseerd-maar-herkenbaar. Een meting hoort in één gesprek met één
bedrijf: dat van henzelf.

"Van de tien installateurs die ik dinsdagavond schreef, antwoordden er drie
binnen 24 uur" is een uitspraak over acht bedrijven die daar geen toestemming
voor gaven, en bij een batch van tien in één regio zijn ze herleidbaar. Dat
soort zin komt terug als reputatieprobleem, niet als autoriteit.

**Nooit als benchmark aanbieden.** "Wil je weten hoe je scoort ten opzichte
van je concurrenten?" belooft de data van anderen. Dat is precies wat je niet
mag weggeven, en het is ook nog eens n=1 per bedrijf.

**Wel toegestaan**, en dat is genoeg:

- het voorval melden aan het bedrijf dat het betreft
- eruit leren welke kanalen en welke tijdstippen de moeite waard zijn
- na tien of twintig metingen zelf beter weten waar de vraag zit — voor jouw
  eigen keuzes, niet als gepubliceerde uitspraak

**Als een bedrijf vraagt of je dit vaker doet: zeg ja.** Niet uitleggen wie
nog meer, wel dát het een vaste manier van werken is. Ontwijken maakt van een
eerlijke meting alsnog iets vaags.

---

## §9 — Wat je na tien metingen weet

Eerlijk gezegd niet veel over de markt, en dat is prima. Wat je wél hebt:

- **tien gesprekken die beginnen met een controleerbaar feit** in plaats van
  een aanname — dat is de enige reden dat deze opzet bestaat
- een eerste beeld van welk kanaal überhaupt uitkomt bij een mens
- de aanleiding om de lekkage-scan aan te bieden op het moment dat hij ergens
  over gaat
- een spoor A / spoor B-verdeling die zelf informatief is: als negen van de
  tien niet antwoorden, is het probleem niet je meting maar je doelgroep of je
  aanvraagtekst

**Wat je er níet mee kunt**, en waar deze opzet dus niet de oplossing voor is:
het is geen kanaal dat schaalt. Tien per week met de hand is tien per week.
Wil je bereik, dan komt dat van de artikelen, de scan en de vindbaarheid —
niet hiervandaan.

---

## Verwante documenten

- [`docs/claims.md`](claims.md) — elk cijfer dat naar buiten gaat, en de drie
  die dat níet mogen. Onder "Reactietijd op leads" staat de onderbouwing van
  de enige benchmark die dit protocol toelaat.
- [`docs/lead-magnet.md`](lead-magnet.md) — de lekkage-scan, waar vraag B3
  hetzelfde meet van binnenuit.
- [`docs/bereik-plan.md`](bereik-plan.md) — waar dit in de bereikstrategie past.
- `lib/reactietijd-protocol.test.ts` — de poort die de sjablonen hierboven
  leest en bewaakt dat er geen verboden claim in terechtkomt.
