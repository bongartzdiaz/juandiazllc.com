# Koude outreach — de grens, de kopij en de voorraad

Geschreven 2026-09-23, op verzoek: *"tijd om mezelf meer naar buiten te brengen
door wat outreach te doen, email campagne klaarzetten om te versturen."*

Dit is het **derde** spoor. `docs/introducties.md` is warm (oud-klanten),
`docs/partners.md` is doorverwijzing. Hier staat wat er naar iemand gaat die
Juan Diaz LLC nog niet kent. De kopij staat alleen hier; de volgorde en het
register staan in `docs/outreach.md` en worden niet herhaald.

**Ik verstuur niets.** Versturen is jouw handeling, per bericht.

---

## §1 — De grens loopt per land, en de afzender bepaalt hem niet

Gemeten op 2026-09-23. Dit staat vooraan omdat het bepaalt welk kanaal een
bericht mag dragen, en naar wie.

**Het toepasselijke recht volgt de ontvanger, niet de afzender.** Versturen
vanuit Juan Diaz LLC maakt een Duitse of Nederlandse ontvanger niet
Amerikaans. Een mail uit Delaware naar een Duits bedrijf valt onder UWG §7.
Dit is de val waar de meeste koude campagnes in lopen.

| markt | koude B2B-e-mail | de regel |
|---|---|---|
| **Verenigde Staten** | **opt-out.** Geen toestemming vooraf | CAN-SPAM: eerlijke onderwerpregel, fysiek postadres in elk bericht, werkende afmeldlink |
| **Verenigd Koninkrijk** | **toegestaan** naar corporate adressen | PECR corporate-subscriber-uitzondering; sole traders wél opt-in |
| Nederland · rechtspersoon | alleen naar een adres dat is gepubliceerd **om acquisitie te ontvangen** | Tw 11.7. `info@` telt daar normaliter niet onder |
| Nederland · eenmanszaak, vof, zzp | **nee** — gelden als natuurlijk persoon | opt-in vereist |
| **Duitsland** | **nee**, ook B2B | UWG §7: dubbele opt-in, boetes tot €300.000 |

**De VS is daarmee de thuismarkt van deze reeks**, en niet alleen juridisch:
Juan Diaz LLC ís een Amerikaanse entiteit, dus het vereiste postadres is er
gewoon. Het VK komt op twee.

Drie dingen die hier makkelijk misgaan.

De **Nederlandse soft opt-in voor oud-klanten is per 1 juli 2026 vervallen**.
"Ze waren ooit klant" draagt niets meer. Dat raakt `docs/introducties.md`
niet — een introductievraag aan iemand die je kent is geen commercieel
bericht — maar een aanbod aan diezelfde persoon zou het wel zijn.

De ACM handhaaft actief, met de bewijslast bij de verzender en een
boetemaximum van €900.000 of 1% van de omzet.

En **CAN-SPAM eist een fysiek postadres in élk commercieel bericht**, niet
alleen in het eerste — en toestemming heft dat niet op. Een broadcast naar
iemand die zich zelf heeft ingeschreven draagt het adres dus net zo goed als
een koud bericht. Sinds 2026-09-23 staat het er: het adres van de registered
agent van Juan Diaz LLC in Dover, Delaware. Een postadres onder een
commerciële mail is openbaar van aard, en dat is precies wat de wet eist.

**Eén ding om na te gaan vóór het eerste bericht de deur uit gaat.** Veel
Delaware-agents sturen alleen betekeningen en staatsstukken door, geen gewone
post. Reageert iemand per brief, of controleert een ontvangende partij het
adres, dan moet daar iets aankomen. Doet de agent dat niet, dan is een
commerciële postbus de betere keuze — CAN-SPAM aanvaardt die expliciet.

**Welke entiteit.** Standaard gaat het vanuit **Juan Diaz LLC**. Wie liever
met een Europese partij contracteert, kan dat — dat is een
verkoopargument bij EU-inkopers (facturatie, btw, AVG-comfort), geen
juridische uitweg. Het verandert niets aan de tabel hierboven.

**De kanalen die openstaan waar e-mail dat niet doet:**

1. **LinkedIn**, handmatig — al gekozen op 2026-08-25, profielkopij ligt klaar
   in `docs/social-linkedin.md`, twaalf posts in `docs/linkedin-posts.md`.
   Geautomatiseerde connectieverzoeken en DM's blijven verboden
   (`docs/kanalen.md` §3).
2. **Telefoon** naar rechtspersonen, onder het eigen B2B-regime.
3. **Warme introducties** — `docs/introducties.md`, zeven berichten, nul
   verstuurd. Juridisch het schoonste pad dat er is, en het ligt er al.

**Eén waarschuwing die niet juridisch is.** De vier bewijzen in §8 zijn
NL/BE-uitkomsten. `docs/kanalen.md` §3 waarschuwt dat verbreden het enige
bewijs verdunt dat er is, en dat geldt onverminderd: een Amerikaanse
installateur leest "een Nederlandse installateur" als een ander land met
andere gewoontes. Het is verdedigbaar omdat het probleem — leads die in vier
systemen hangen — niet aan een land gebonden is. Maar het is zwakker bewijs
dan thuis, en dat hoort hier te staan.

---

## §2 — De vorm

Zes regels. Ze wijken bewust af van `docs/introducties.md`, want daar bestaat
een gedeelde herinnering en hier niet.

1. **Open bij hun probleem, niet bij mijn resultaat.** Een koude lezer heeft
   het cijfer niet meegemaakt; ermee openen leest als opschepperij.
2. **Eén bewijspunt, dat van hun eigen sector**, woordelijk uit
   `docs/claims.md`. Geanonimiseerd, op sectorniveau, zoals het op de site staat.
3. **Eén vraag, één vraagteken.**
4. **Geen bijlage. Hooguit één link, en pas vanaf bericht 2.**
5. **Afmeldregel in elke e-mail.** Bij opt-out is dat geen beleefdheid maar de
   voorwaarde waaronder het bericht mag.
6. **Afzender en postadres onder elk bericht.** CAN-SPAM eist het fysieke
   adres in élk commercieel bericht, de broadcast inbegrepen.
   `lib/koude-outreach.test.ts` gaat rood zodra een bericht het kwijtraakt, of
   zodra er twee verschillende adressen onder de twaalf komen te staan.

Toon: je, kort, concreet. Dezelfde stem als de site.

**Onderwerpregels.** Elk eerste bericht en elke afsluiter draagt zijn eigen
regel; hij staat per bericht boven het blok. De opvolging krijgt er bewust
geen: die gaat als antwoord in de thread van het eerste bericht, zodat de
lezer de context meteen terugziet. De regels zijn klein geschreven en
letterlijk — ze dekken wat het bericht vraagt, want een onderwerpregel die
iets anders belooft is in de VS verboden (CAN-SPAM) en hier gewoon oneerlijk.
Om dezelfde reden nooit een vals `Re:` op een eerste bericht.

**Twee opvolgingen, daarna stopt het spoor.** Warm netwerk krijgt er één
(`docs/outreach.md` §3); koud krijgt er twee, omdat er geen relatie is om te
beschadigen. Drie is spam.

**Houd het volume laag.** De capaciteit staat op **drie trajecten tegelijk**
(`docs/claims.md`, beslist 2026-08-22). Twintig gesprekken tegelijk is geen
succes maar een wachtlijst die je zelf hebt gemaakt.

---

## §3 — Spoor A · Nederlandse zonne-installateur

Bewijs: **+38%** lead-naar-gesprek, 90 dagen, na vier losse tools vervangen
door één CRM met WhatsApp-flow.

### A1 — eerste bericht

Onderwerp: waar leads blijven hangen bij [bedrijf]

```
Hoi [naam],

Bij zonne-installateurs gaat het bijna altijd op dezelfde plek mis. De leads
komen binnen, maar ze staan in vier systemen en niemand ziet welke er nog open
staat. Bij een Nederlandse installateur ging de conversie van lead naar gesprek
in 90 dagen 38% omhoog toen dat één systeem werd, met de WhatsApp-flow erin.

Waar blijft een lead bij [bedrijf] hangen — bij het terugbellen, of bij het
inplannen van de schouw?

Juan Diaz
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA · juandiazllc.com

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### A2 — opvolging, acht werkdagen later

Verstuur als antwoord in dezelfde thread als A1 (Re:), geen eigen onderwerp.

```
Hoi [naam],

Korte herhaling, dan laat ik het los.

Als de opvolging bij jullie wél strak loopt, negeer dit. Loopt hij niet strak,
dan is de vraag die ik zou stellen: hoeveel aanvragen van vorige maand zijn
nooit teruggebeld? Dat getal staat meestal nergens, en dat is precies het punt.

Wil je zien hoe dat eruitziet als het wel ergens staat:
juandiazllc.com/nl/work

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### A3 — afsluiter, twaalf werkdagen na A2

Onderwerp: laatste van mij

```
Hoi [naam],

Ik stop hier, geen zorgen.

Mocht het later gaan knellen: ik doe dit in sprints van 30 dagen, vaste prijs
€2.500 excl. btw, en ik draag er drie tegelijk. Dan weet je waar je me vindt.

Succes met [bedrijf].

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA
```

---

## §4 — Spoor B · NL/BE energiemakelaar

Bewijs: **3.2x** pipelinesnelheid, 6 maanden, nadat buitendienst en kantoor
dezelfde dealstatus realtime deelden.

### B1 — eerste bericht

Onderwerp: wat buiten al weet en kantoor nog niet

```
Hoi [naam],

Bij energiemakelaars is de rem op de pijplijn zelden het aantal leads. Het is
de vertraging tussen wat er in het veld gebeurt en wat het systeem weet. Bij
een NL/BE-makelaar ging de pijplijn 3.2x sneller lopen toen buitendienst en
kantoor naar dezelfde status keken, in dezelfde seconde.

Als je buitendienst vandaag iets afspreekt bij een klant, wanneer weet kantoor
dat bij [bedrijf] — meteen, of aan het eind van de dag?

Juan Diaz
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA · juandiazllc.com

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### B2 — opvolging, acht werkdagen later

Verstuur als antwoord in dezelfde thread als B1 (Re:), geen eigen onderwerp.

```
Hoi [naam],

Nog één keer, dan hou ik op.

De test die ik zou doen: pak een deal die vorige week is gesloten en kijk hoe
lang het duurde voordat kantoor dat wist. Is dat meer dan een uur, dan zit daar
je snelheid.

Hoe ik dat aanpak staat hier: juandiazllc.com/nl/work

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### B3 — afsluiter, twaalf werkdagen na B2

Onderwerp: laatste van mij

```
Hoi [naam],

Laatste bericht van mij.

Als het ooit tijd wordt: 30 dagen, €2.500 excl. btw vast, drie trajecten
tegelijk. Je hoort niets meer tot je zelf iets laat weten.

Succes.

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA
```

---

## §5 — Spoor C · Residentiële batterij-installateur

Bewijs: **−61%** doorlooptijd tot offerte, Q1-uitrol, na automatisering van de
overdracht intake → schouw → offerte.

### C1 — eerste bericht

Onderwerp: hoeveel dagen van aanvraag naar offerte?

```
Hoi [naam],

Bij batterij-installateurs zit de doorlooptijd zelden in het werk. Hij zit in
de overdrachten: intake naar schouw, schouw naar offerte, en elke keer typt
iemand dezelfde gegevens over. Bij een residentiële installateur ging die
doorlooptijd 61% omlaag toen die drie stappen elkaar rechtstreeks voedden.

Hoe lang duurt het bij [bedrijf] tussen een aanvraag en een offerte de deur
uit?

Juan Diaz
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA · juandiazllc.com

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### C2 — opvolging, acht werkdagen later

Verstuur als antwoord in dezelfde thread als C1 (Re:), geen eigen onderwerp.

```
Hoi [naam],

Kort, en dan is het klaar.

Als jullie binnen een dag offerte uit hebben: negeer dit, dan zit je goed.
Duurt het langer, dan is de vraag niet wie er te traag werkt maar hoe vaak
dezelfde gegevens opnieuw worden ingevoerd.

Voorbeelden: juandiazllc.com/nl/work

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA

Liever geen berichten meer van mij? Eén regel terug en ik haal je eruit.
```

### C3 — afsluiter, twaalf werkdagen na C2

Onderwerp: laatste van mij

```
Hoi [naam],

Ik laat het hierbij.

Voor als het terugkomt: sprints van 30 dagen, €2.500 excl. btw, drie tegelijk.
Verder hoor je niets meer van me.

Succes met [bedrijf].

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA
```

---

## §6 — De broadcast, als voorraad

**Deze gaat vandaag niet de deur uit, en dat is geen keuze.** Twee blokkades,
allebei gemeten:

- **Brevo geeft 403** — `Your SMTP account is not yet activated`. Vier
  bevestigingen van support, vier keer dezelfde 403 uit de API.
- **Nul abonnees, ooit.** `marketing.subscribers` is leeg. Eén lead in totaal,
  Juans eigen test van 19 september.

De tweede is de echte. Een broadcast zonder lijst is een mail aan niemand. Deze
tekst ligt hier klaar voor het moment dat er inschrijvingen zijn. Wie zich
inschrijft heeft toestemming gegeven, dus §1 speelt hier niet.

### Mail 1 — welkom, direct na inschrijving

```
Onderwerp: Waar je leads blijven hangen

Hoi,

Je schreef je in, dus hier is meteen iets bruikbaars.

Bij operators in energie en installatie zie ik vier keer op de vijf hetzelfde
patroon: de leads komen binnen, maar ze staan verspreid over losse tools en
niemand ziet welke er nog open staat. Het probleem lijkt marketing. Het is
opvolging.

Vier dingen die ik heb zien werken, geanonimiseerd maar echt gemeten:

- lead naar gesprek +38% in 90 dagen, toen vier tools één systeem werden
- pijplijn 3.2x sneller in 6 maanden, toen buitendienst en kantoor dezelfde
  status deelden
- doorlooptijd tot offerte −61%, toen intake, schouw en offerte elkaar direct
  voedden
- €0 extra softwarekosten in jaar één — de afgevoerde tools betaalden de
  herbouw

Volgende week stuur ik hoe dat eerste getal tot stand kwam, stap voor stap.

Juan Diaz
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA · juandiazllc.com

Afmelden: [afmeldlink]
```

### Mail 2 — het bewijs uitgewerkt, zeven dagen later

```
Onderwerp: Hoe die +38% er van binnen uitzag

Hoi,

Vorige week noemde ik +38% conversie van lead naar gesprek. Hier is wat er
werkelijk veranderde.

Er lag geen leadprobleem. Er lagen vier systemen: het formulier op de site, een
losse inbox, WhatsApp op iemands telefoon, en een spreadsheet waar het
uiteindelijk in belandde. Elke overgang kostte een dag, en bij elke overgang
verdween een deel.

Wat we deden: één plek waar elke aanvraag landt, WhatsApp erin in plaats van
ernaast, en één lijst met wat er open staat. Geen nieuwe tools erbij — drie
eruit.

Negentig dagen later ging er 38% meer lead door naar een gesprek. Dezelfde
mensen, dezelfde advertenties.

De vraag die dit oplevert voor jou: hoeveel aanvragen van vorige maand zijn
nooit teruggebeld? Als dat getal nergens staat, is dat het antwoord.

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA

Afmelden: [afmeldlink]
```

### Mail 3 — het aanbod, veertien dagen na mail 1

```
Onderwerp: Wat het kost, en wat het niet belooft

Hoi,

Twee mails lang heb ik laten zien wat er misgaat. Dit is hoe ik eraan werk, en
dan is de reeks klaar.

Dertig dagen. Vaste prijs €2.500 excl. btw. Na afloop ligt er een bouwplan én
draait het eerste onderdeel al.

Wat ik niet beloof: een uitkomst. Ik geef geen garantie op het resultaat, want
die hangt af van dingen in jouw bedrijf waar ik geen controle over heb. Op de
levering geef ik die wel — wat afgesproken is, staat er.

Ik draag drie trajecten tegelijk. Als er nu ruimte is, staat dat op
juandiazllc.com/nl/contact.

Geen reactie is ook een antwoord; dan hoor je hierna alleen nog de gewone mail.

Juan
Juan Diaz LLC · 1111B S Governors Ave STE 92236, Dover, DE 19904, USA

Afmelden: [afmeldlink]
```

---

## §7 — Wat hier bewust niet staat

| niet opgenomen | waarom |
|---|---|
| namen van prospects | die horen in `docs/outreach-register.csv`, niet in de kopij |
| klantnamen | `docs/claims.md`: sector en venster, nooit een naam |
| een cijfer dat niet in `docs/claims.md` staat | regel 1 van dat dossier |
| Duitse of Spaanse versie | koude e-mail naar Duitsland is verboden; NL/BE eerst |
| een vierde spoor voor multi-vestiging operators | het vierde bewijs (€0 extra SaaS) is een kostenargument, geen instap. Hij staat in de broadcast, niet als eigen koud spoor |
| verzendautomatisering | drie trajecten capaciteit. Handmatig is hier geen beperking maar de rem die je wilt |

## §8 — Waar de cijfers vandaan komen

Alles uit `docs/claims.md` en `lib/i18n/dict.ts` (`results.r1..r4`), niet
overgeschreven:

- +38% · Nederlandse zonne-installateur · 90 dagen
- 3.2x · NL/BE energiemakelaar · 6 maanden
- −61% · residentiële batterij-installateur · Q1-uitrol
- €0 · multi-vestiging operator · jaar één
- €2.500 excl. btw, 30 dagen · beslist 2026-08-22
- geen uitkomstgarantie, wel op levering · beslist 2026-08-22
- drie trajecten tegelijk · beslist 2026-08-22

De juridische grens in §1 komt van ICTRecht en een marktoverzicht van de regels
per 2026. Het is geen advies van een jurist. Bij twijfel over één adres: niet
mailen, wel via LinkedIn.
