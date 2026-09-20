# De leadmagneet — de lekkage-scan

Wat er gebouwd wordt om e-mailadressen op te vangen, waarom dit formaat, en de
zestien vragen woordelijk.

Geschreven 2026-08-22. Alles in §0 is gemeten, niet aangenomen; §8 zegt per
uitspraak waar hij vandaan komt. De vragen in §2 zijn geschreven, niet gemeten —
ze leunen op de vier bevestigde uitkomsten in `docs/claims.md`, maar de
formulering is een keuze en geen bevinding.

---

## §0 — Wat er al staat, en wat het opving

| | stand, gemeten 2026-08-22 |
|---|---|
| nieuwsbriefformulier | bestaat, staat op **één** pagina (`/insights`) |
| `marketing.subscribers` | **0 rijen, ooit** |
| `marketing.leads` | **0 rijen, ooit** |
| dubbele opt-in (`app/actions/newsletter.ts`) | dood — `newsletter_subs` bestaat niet, én geen Resend-sleutel |
| e-maillevering | werkt nergens: `RESEND_API_KEY` ongezet |
| gratis instrument | `/tools/energy-roi` — bestaat, **ongegate**, vangt niets |
| artikelen | 21, waarvan 13 op 2026-07-20, daarna stil |
| bezoekerscijfer | **onbekend** — geen Plausible-doelen, geen sleutel |

Dat laatste is geen detail. **Nul opvang is vandaag niet te onderscheiden van
nul bezoek.** Elke uitspraak in dit document over conversie is daarom een
verwachting, geen voorspelling.

Er is dus geen leadmagneet-probleem maar een opvang-probleem: het aas ligt er
(elf energie-artikelen, een rekentool), er staat alleen geen fuik omheen, en de
enige fuik die er staat hangt aan één pagina en heeft in zijn hele bestaan niets
gevangen.

---

## §1 — De keuze

**"De lekkage-scan" — een scorecard van één pagina.**

| | |
|---|---|
| formaat | assessment, direct op het scherm ingevuld en gescoord |
| koperfase | overweging — hij weet dát het lekt, niet wáár |
| levering | direct zichtbaar; e-mail optioneel voor de PDF-versie — **omgedraaid op 2026-09-20, zie §10** |
| taal | **alleen Nederlands** |
| inspanning | 4-8 uur schrijven, 4-8 uur bouwen op bestaande plumbing |

**Waarom dit formaat.** Het ICP is een installateur of makelaar met een
buitendienst. Die leest geen gids van 25 pagina's; die wil in vier minuten weten
of hij een probleem heeft. Een assessment geeft hem een uitkomst over zichzelf,
en dat is het soort inhoud dat een operator doorstuurt naar zijn compagnon.

**Waarom dit onderwerp.** De vier bevestigde uitkomsten beschrijven allemaal
dezelfde vorm: vier tools waar er één had moeten staan. De scan is een
zelfbedieningsversie van stap 2 van de ladder — de diagnose van één pagina. Dat
is geen toevallige aansluiting op het aanbod, het *is* het aanbod, in het klein.

**Waarom níét een gids of ebook.** Dat kost 1-3 weken en levert een lezer op in
plaats van een gediagnosticeerde. Op een domein zonder autoriteit met nul gemeten
bezoekers is die inzet niet te verantwoorden vóórdat er iemand blijkt te kijken.

**Waarom alleen Nederlands.** Alle vier de bevestigde engagements zijn NL/BE, en
het ICP is dat ook. Dezelfde keuze als bij het saldering-cluster, om dezelfde
reden: een vertaalde versie voor een markt waar geen bewijs uit komt is dunne
inhoud, geen bereik. Zestien vragen × vier talen is bovendien
vierenzestig dict-sleutels voor drie markten die dit niet gevraagd hebben.

---

## §2 — De zestien vragen

Ja/nee. Vier blokken, elk gespiegeld aan een van de vier bevestigde uitkomsten.
Onder elke vraag staat wat een "nee" kost — **in woorden, nooit in een getal.**
Een voorspelde besparing zou een verzonnen cijfer zijn, en `docs/claims.md` is
de enige bron die dat mag dragen.

### Blok A — Overdracht
*Spiegelt: 3,2× pijplijnsnelheid, toen buitendienst en kantoor dezelfde
dealstatus deelden.*

**A1. Kan je buitendienst de status van een lopende aanvraag zien zonder iemand
te bellen?**
→ Bij nee reist elke statuswijziging via een mens. Elke overdracht is een moment
waarop hij kan blijven liggen, en je ziet niet welke dat was.

**A2. Weet kantoor binnen een uur dat een schouw is afgerond?**
→ Bij nee begint de offerte pas als iemand het toevallig hoort. Die wachttijd
staat nergens genoteerd, dus hij wordt ook nooit korter.

**A3. Staat de actuele status van een deal op één plek, en niet in meerdere
systemen naast elkaar?**
→ Bij meerdere is er geen antwoord op "hoe staat het ervoor", alleen meningen.
Wie gelijk had blijkt pas bij de klacht.

**A4. Kan een collega de lopende aanvragen van een zieke monteur overnemen
zonder overdrachtsgesprek?**
→ Bij nee zit de status in een hoofd. Ziekte, vakantie en vertrek zijn dan
hetzelfde risico met een andere naam.

### Blok B — Reactietijd
*Spiegelt: −61% tijd-tot-offerte, na automatisering van intake → schouw →
voorstel.*

**B1. Weet je hoeveel uur er gemiddeld tussen aanvraag en offerte zit?**
→ Bij nee kun je die tijd niet verkorten, want je zou de verbetering niet zien.

> **Meting (optioneel).** Pak je laatste vijf verstuurde offertes. Tel per
> offerte de werkdagen tussen het eerste klantcontact en het moment dat hij de
> deur uit ging.
> Veld: *Gemiddeld aantal werkdagen tot de offerte* · eenheid **werkdagen**.
> **Geen grens.** Er bestaat geen bron voor een doorlooptijd die "goed" is. Het
> getal wordt teruggegeven zoals het is ingevuld, zonder oordeel.

**B2. Gaat er een offerte de deur uit zonder dat iemand gegevens overtypt uit
een ander systeem?**
→ Bij nee betaal je twee keer: de tijd van het overtypen, en de fouten die
erin sluipen en pas bij de klant opvallen.

**B3. Krijgt een aanvrager binnen 24 uur een reactie, ook in een weekend of een
vakantieweek?**
→ Bij nee is je reactietijd een functie van wie er toevallig werkt. De
aanvrager belt ondertussen de volgende.

> **Meting (optioneel).** Zoek je laatste tien aanvragen op die buiten
> kantooruren binnenkwamen. Tel de uren tot het eerste inhoudelijke antwoord van
> een mens — een ontvangstbevestiging telt niet mee.
> Veld: *Gemiddelde uren tot het eerste inhoudelijke antwoord* · eenheid
> **uur** · grens **1 uur**.
> **De enige grens in dit hele instrument met een bron erachter.** Boven een uur
> wordt kwalificeren aantoonbaar moeilijker — Harvard Business Review, 2011,
> audit van 2.241 bedrijven. De volledige onderbouwing en de drie beperkingen
> staan in `docs/claims.md` onder "Reactietijd op leads". Dat is Amerikaans
> onderzoek en het gaat over *kwalificeren*, niet over winnen; beide staan er
> op de pagina bij.

**B4. Kun je zien wélke stap in het traject de meeste tijd kost?**
→ Bij nee verbeter je op gevoel, en gevoel wijst naar de stap die het luidst
klaagt — zelden naar de stap die het langst duurt.

**B5. Kun je een klant binnen een week een tekening of calculatie laten zien,
ook als de collega die dat maakt er niet is?**
→ Bij nee is je doorlooptijd de agenda van één persoon. De klant merkt dat als
stilte, en jij merkt het pas als hij niet terugbelt.

### Blok C — Dubbele invoer
*Spiegelt: +38% lead-naar-gesprek, na vier tools vervangen door één CRM plus een
WhatsApp-flow.*

**C1. Wordt de naam en het adres van een nieuwe aanvraag maar één keer getypt?**
→ Bij nee bestaan er meteen twee versies van dezelfde klant, en niets bepaalt
welke de echte is.

**C2. Staan WhatsApp-gesprekken met klanten ergens waar een collega ze
terugvindt?**
→ Bij nee staat de klantgeschiedenis op een privételefoon. Bij vertrek gaat hij
mee de deur uit.

**C3. Komt een aanvraag via je website automatisch terecht in het systeem waar
je werkt?**
→ Bij nee bestaat de aanvraag pas zodra iemand hem overneemt, en op die stap
staat geen alarm.

**C4. Weet je bij elke lead waar hij vandaan kwam?**
→ Bij nee is elke uitspraak over wat werkt een gok. Je stopt dan met het
kanaal dat het minst luid is, niet met het kanaal dat het minst oplevert.

### Blok D — Stapelkosten
*Spiegelt: €0 extra SaaS-uitgaven — de uitgezette tools financierden de
herbouw.*

**D1. Weet je uit je hoofd hoeveel softwareabonnementen je hebt en wat ze samen
per maand kosten?**
→ Bij nee groeit die stapel per losse beslissing, en niemand neemt ooit het
besluit om hem te laten groeien.

**D2. Is er een tool waarvoor je betaalt en die minder dan één keer per week
door iemand geopend wordt?**
→ Bij ja betaal je voor een gewoonte die niemand meer heeft. Dat is de
goedkoopste besparing die er is, en de makkelijkste om te vergeten.

**D3. Kun je bij het vertrek van een medewerker binnen een dag al zijn
toegangen intrekken?**
→ Bij nee is je stapel ook een beveiligingsprobleem, niet alleen een kostenpost.

---

## §3 — De uitslag

**Geen cijfer op tien.** De uitkomst is: *de drie dingen die bij jou het eerst
lekken*, in volgorde.

Mechanisme:

1. Tel per blok de "nee"-antwoorden. (Bij A3 telt "meerdere systemen" als nee;
   bij D2 telt "ja" als nee — die vraag staat bewust omgekeerd, zodat het
   invullen aandacht blijft vragen.)
2. Blokken met het hoogste **aandeel** "nee" komen eerst — aantal gedeeld door
   het aantal vragen in dat blok. Dat is sinds B5 een echt verschil: blok B
   heeft er vijf en de rest vier, en op tellen zou het grootste blok
   automatisch winnen. Drie van vijf is minder erg dan drie van vier.
3. Gelijkspel breekt eerst op aantal, daarna op een **vaste** volgorde:
   A → B → C → D.

Punt 3 is een oordeel, geen meting. Ik heb geen bewijs dat overdracht zwaarder
weegt dan stapelkosten; die volgorde staat er zodat de uitslag reproduceerbaar
is in plaats van willekeurig. Verander hem gerust — schrijf dan op waarom.

Per blok één leknaam:

| blok | leknaam in de uitslag |
|---|---|
| A | De status leeft in hoofden |
| B | Je weet niet waar de tijd blijft |
| C | Hetzelfde feit wordt meermaals getypt |
| D | Je betaalt voor overlap |

**Minder dan drie blokken met een "nee"?** Toon er dan minder. Niet aanvullen.

**Nul "nee"?** Dan is de eerlijke uitslag dat deze scan niets ziet lekken, plus
§3.1 hieronder. Een scan die altijd een probleem vindt is een verkoopinstrument,
geen diagnose — en dit publiek merkt dat verschil binnen twee vragen.

### §3.1 — Wat de scan niet kan zien

Hoort onder elke uitslag, ook een slechte. Zestien ja/nee-vragen zien geen
marge per project, geen kwaliteit van de instroom, geen bezetting, en niets over
of de mensen het nieuwe systeem zouden gebruiken. Dat staat er zodat de scan
zijn eigen reikwijdte draagt in plaats van hem te suggereren.

### §3.2 — De uitnodiging

Onder de uitslag, in de bestaande vorm: `/contact?interest=lekkage-scan`.

Dat pad is getest en schrijft naar `marketing.leads`, met `source` in de vorm
`contact_page:interest=lekkage-scan:stage=N`. Daarmee is een lead uit de scan te
onderscheiden van een lead vanaf de homepage of `/services` — wat vandaag de
enige manier is om te weten of dit ding werkt.

**Nooit een `mailto:`.** Die slaat de hele leadketen over: geen rij, geen
Telegram, geen bevestiging. Het spoor houdt dan op bij de klik.

---

## §4 — Opvang en levering

| | keuze | reden |
|---|---|---|
| gate | **geen** op de scan; e-mail pas ná de uitslag, voor de PDF | een gate vóór de uitkomst kost je de mensen die nog niet weten of dit voor hen is |
| *sinds 2026-09-20* | *harde gate: naam, bedrijf, e-mail vóór de uitslag* | *§10 — Juans keuze, de afweging hierboven blijft waar* |
| velden | e-mail alleen | elk extra veld kost conversie, en er is geen conversie om weg te geven |
| levering | uitslag direct op het scherm | omzeilt de kapotte e-mailschakel volledig |

**Wat het formulier letterlijk moet zeggen:** dat er nu niets gemaild wordt.
Zolang Resend uit staat is elke andere formulering een belofte die niet
nagekomen wordt — en zoiets staat al één keer te veel in de privacyverklaring,
die in vier talen zegt dat een inzending "direct als e-mail" aankomt.

**Bouw geen tweede opvangtabel.** `marketing.subscribers` bestaat, heeft een
werkende anon-INSERT en een policy, en vangt vandaag niets omdat er maar één
formulier op één pagina naar wijst. Een derde tabel naast `subscribers` en het
dode `newsletter_subs` maakt het probleem niet kleiner.

---

## §5 — Distributie

Vier kanalen liggen er per staande afspraak uit: LinkedIn-connectieverzoeken en
DM's, koude WhatsApp, koude e-mail naar Duitsland, en formulierinzendingen bij
doelbedrijven. Wat overblijft is genoeg, en het is warmer.

1. ~~**Content-upgrade op de elf energie-artikelen.**~~ **Gedaan** (#221, #222).
   Contextuele upgrades converteren volgens de vakbenchmarks 2-5× beter dan een
   generieke zijbalk.

   Het waren er geen elf maar **vijf**. De DE- en ES-clusters tellen mee in dat
   getal, maar de scan bestaat daar niet, dus `ScanCallout` rendert er niets —
   hij poortert op dezelfde `ENKELE_TAAL` waaruit de pagina zijn talen haalt.
   Gemeten op de productiebuild: 1 anchor op elk van de vijf NL-energieposts,
   0 op de DE- en ES-posts, 0 op de niet-energieartikelen.
2. ~~**Op de rekentool.**~~ **Gedaan** (#221). `/tools/energy-roi` is de
   hoogste-intentiepagina van de site en ving zelf niets.
3. **De vier bestaande klanten.** Stuur ze de scan met de vraag of hij klopt
   voor hun situatie. Dat is tegelijk het referral-gesprek, met een aanleiding
   die geen gunst vraagt.
4. **Betaald: nog niet.** Zonder bezoekerscijfer kun je een campagne niet
   beoordelen, alleen betalen.

---

## §6 — Meten

De vakbenchmarks zijn 20-40% conversie op warm verkeer en 5-15% op koud.
**Geen van beide is vandaag meetbaar.** De vier Plausible-doelen bestaan niet in
het dashboard, dus de kliks worden binnengehaald en weggegooid.

Wat er hoe dan ook meetbaar is zodra de scan leeft, zonder Plausible: het aantal
rijen in `marketing.leads` met `source like '%lekkage-scan%'`. Dat is grover dan
een conversiepercentage, maar het is een echt getal.

**Eerste test zodra er wél gemeten wordt: plaatsing, niet tekst.** Upgrade
midden in het artikel tegen onderaan. Dat verschil is groter dan welke
koptekstvariant ook.

---

## §7 — Wat dit blokkeert

Drie operator-acties, in deze volgorde. Alle drie minuten werk.

1. **De vijf Plausible-doelen aanmaken** — `Boeking 15min`, `Pricing CTA`,
   `Sector CTA`, `Tool CTA` en `Contact Submitted` — plus de drie custom
   properties. Taggen is af en geverifieerd; zonder de doelen wordt alles
   weggegooid. Die laatste meet de inzending zelf en niet de klik ernaartoe.
2. **`LEAD_NOTIFY_SECRET`** in Supabase → Edge Functions → Secrets, zelfde
   waarde als `lead_notify_secret` in de Vault.
3. **`RESEND_API_KEY` + `ACK_FROM`** — pas ná 2, anders geef je een publiek
   aanroepbaar endpoint een mailkanaal vanaf het eigen domein. De scan werkt
   zonder; de PDF-variant en elke opvolgmail wachten hierop.

En één beslissing die niet uit de repo af te leiden is: **wat ligt er na de
sprint van dertig dagen op tafel?** De scan eindigt in een uitnodiging, en die
moet een tastbaar ding noemen. Stap 1 van de ladder doet dat al (een diagnose
van één pagina); stap 2 noemt alleen een toestand. Dezelfde openstaande vraag
als in `docs/aanbod.md` §5, en hij komt hier terug omdat elke leadmagneet ergens
naartoe moet leiden.

---

## §8 — Herkomst per uitspraak

| uitspraak | herkomst |
|---|---|
| 0 rijen in `subscribers` en `leads` | `select count(*)` op Supabase `wbgiouuifqhasedncysw`, 2026-08-22 |
| nieuwsbrief staat op één pagina | `grep NewsletterForm app components` → alleen `app/[locale]/insights/page.tsx:77` |
| dubbele opt-in is dood | kopcommentaar `app/actions/newsletter.ts:3-26`, geschreven 2026-07-21 |
| `RESEND_API_KEY` ongezet | edge function meldde `resend: skipped: RESEND_API_KEY unset`, gemeten 2026-08-20 |
| calculator is ongegate | geen e-mail- of formulierlogica in `app/[locale]/tools/energy-roi/page.tsx` |
| 21 artikelen, 13 op één dag | telling over `lib/insights.ts`, deze sessie |
| de vier uitkomsten | `docs/claims.md:379-382` |
| ICP | afgeleid uit diezelfde vier rijen (sector + context), niet uit een persona |
| NL is `je`-vorm | 87× `je`, 0× `u`/`uw` in het `nl`-blok van `lib/i18n/dict.ts` |
| vier verboden kanalen | staande afspraak, vastgelegd als harde regel in `business-os/CLAUDE.md` |
| 2-5× voor content-upgrades, 20-40% / 5-15% conversie | algemene vakbenchmarks uit de `lead-magnets`-skill — **niet op deze site gemeten** |

### Wat hier níet gemeten is

De zestien vragen zijn geschreven, niet getest. Of ze de juiste lekken raken
blijkt pas als de vier bestaande klanten ze invullen — dat is stap 3 van §5, en
het is met opzet de eerste stap en niet de laatste.

---

## Klein defect, onderweg gevonden

`components/NewsletterForm.tsx:7` zegt "Writes to Supabase `newsletter_subs`".
Dat klopt niet: het formulier schrijft sinds 2026-07-21 via
`app/actions/subscribe.ts` naar `subscribers`. Het kopcommentaar van
`newsletter.ts` legt die verhuizing correct uit; de kop van het formulier is
meeverhuisd zonder bijgewerkt te worden.

Precies de klasse waar dit logboek het meest aan overhoudt: een commentaar dat
een gedrag beschrijft dat er niet is. Wie het leest zoekt de opvang in de
verkeerde tabel — en die tabel bestaat niet, dus hij vindt niets en concludeert
dat er niets binnenkomt.

## §9 — Dezelfde scan voor EN en DE (2026-09-20)

Beslist door Juan op 2026-09-20: de lekkage-scan ook voor Engels en Duits, als
tweede leadmagneet naast de ROI-rekenmachine. Route: `/en/tools/leak-scan` en
`/de/tools/leak-scan` — een eigen slug, want "lekkage-scan" op een Engelse
pagina is geen vertaling. Spaans krijgt niets: daar is geen cluster en geen
bewijs. Welke talen de route draagt staat in `lib/i18n/enkele-taal.ts`.

**Wat er níet verandert.** De zestien vragen, de vier blokken, het
scoremechanisme, de ene grens (HBR 2011, één uur) en de opvang zijn dezelfde
als in §2 tot en met §4. De vragen zijn taal- en sectoronafhankelijk: ze gaan
over de vórm van het lek (`docs/bereik-plan.md` §2), en de ene bron eronder is
Amerikaans onderzoek. `lib/lekkage-scan-taal.ts` legt de vertaling over de
Nederlandse structuur heen en `lib/lekkage-scan-taal.test.ts` meet dat de drie
talen dezelfde ids, dezelfde metingen en dezelfde grenswaarde dragen. Wat hier
staat is dezelfde afspraak als voor §2: elke vraag hieronder moet letterlijk
gelijk zijn aan de code, en de test valt om als dat niet zo is.

**Wat wél per taal is.** De kopij om de vragen heen (hero, uitslag, toestemming,
placeholders), de drie mails van de reeks en de bestemming van de afmeldlink.
Een rij in `marketing.subscribers` draagt zijn taal in `metadata.locale`; een rij
zonder taal is Nederlands, zoals elke rij van vóór deze datum. Duits spreekt met
Sie. De consenttekst die bij de rij wordt opgeslagen is die van de taal waarin
hij is aangevinkt (`consent_tekst`).

### §9.1 — De vragen in het Engels

#### Blok A — Handover
*3.2× pipeline velocity, once field and office shared one deal status.*

**A1. Can your field team see the status of an open request without calling someone?**
→ If no, every status change travels through a person. Every handover is a moment it can stall, and you can't see which one it was.

**A2. Does the office know within an hour that a site visit is done?**
→ If no, the quote starts only when someone happens to hear about it. That wait is written down nowhere, so it never gets shorter.

**A3. Is the current status of a deal in one place, and not in several systems side by side?**
→ If several, there is no answer to "where does this stand", only opinions. Who was right shows up at the complaint.

**A4. Can a colleague take over the open requests of a sick technician without a handover meeting?**
→ If no, the status sits in a head. Sickness, holiday and resignation are then the same risk under a different name.


#### Blok B — Response time
*−61% time-to-quote, after automating intake → site visit → proposal.*

**B1. Do you know how many hours, on average, sit between request and quote?**
→ If no, you can't shorten that time, because you wouldn't see the improvement.

**B2. Does a quote go out without someone retyping data from another system?**
→ If no, you pay twice: the time spent retyping, and the errors that creep in and only show at the customer.

**B3. Does an enquirer get a reply within 24 hours, including at weekends and in a holiday week?**
→ If no, your response time is a function of who happens to be working. Meanwhile the enquirer calls the next one.

**B4. Can you see which step in the process takes the most time?**
→ If no, you improve on gut feel, and gut feel points at the step that complains loudest — rarely the step that takes longest.

**B5. Can you show a customer a drawing or calculation within a week, even when the colleague who makes it is away?**
→ If no, your lead time is one person's calendar. The customer experiences that as silence, and you only notice when they don't call back.


#### Blok C — Double entry
*+38% lead-to-conversation, after replacing four tools with one CRM plus a WhatsApp flow.*

**C1. Is the name and address of a new enquiry typed only once?**
→ If no, two versions of the same customer exist immediately, and nothing decides which one is real.

**C2. Are WhatsApp conversations with customers stored somewhere a colleague can find them?**
→ If no, the customer history sits on a private phone. When that person leaves, it walks out the door.

**C3. Does an enquiry from your website land automatically in the system you work in?**
→ If no, the enquiry exists only once someone copies it over, and there is no alarm on that step.

**C4. Do you know, for every lead, where it came from?**
→ If no, every statement about what works is a guess. You then stop the channel that is least loud, not the one that yields least.


#### Blok D — Stacked costs
*€0 extra SaaS spend — the tools switched off paid for the rebuild.*

**D1. Do you know off the top of your head how many software subscriptions you have and what they cost per month together?**
→ If no, that stack grows one loose decision at a time, and nobody ever decides to let it grow.

**D2. Is there a tool you pay for that someone opens less than once a week?**
→ If yes, you pay for a habit nobody has any more. That is the cheapest saving there is, and the easiest to forget.

**D3. When an employee leaves, can you revoke all their access within a day?**
→ If no, your stack is a security problem too, not just a cost line.

### §9.2 — Die Fragen auf Deutsch

#### Blok A — Übergabe
*3,2× Pipeline-Geschwindigkeit, sobald Außendienst und Büro denselben Deal-Status teilten.*

**A1. Kann Ihr Außendienst den Status einer laufenden Anfrage sehen, ohne jemanden anzurufen?**
→ Bei Nein reist jede Statusänderung über einen Menschen. Jede Übergabe ist ein Moment, an dem sie liegen bleiben kann, und Sie sehen nicht, welcher es war.

**A2. Weiß das Büro innerhalb einer Stunde, dass eine Besichtigung abgeschlossen ist?**
→ Bei Nein beginnt das Angebot erst, wenn jemand zufällig davon hört. Diese Wartezeit steht nirgends, also wird sie auch nie kürzer.

**A3. Steht der aktuelle Status eines Deals an einer Stelle, und nicht in mehreren Systemen nebeneinander?**
→ Bei mehreren gibt es keine Antwort auf "wie steht es", nur Meinungen. Wer recht hatte, zeigt sich bei der Beschwerde.

**A4. Kann ein Kollege die laufenden Anfragen eines kranken Monteurs ohne Übergabegespräch übernehmen?**
→ Bei Nein sitzt der Status in einem Kopf. Krankheit, Urlaub und Kündigung sind dann dasselbe Risiko unter anderem Namen.


#### Blok B — Reaktionszeit
*−61 % Zeit bis zum Angebot, nach Automatisierung von Anfrage → Besichtigung → Vorschlag.*

**B1. Wissen Sie, wie viele Stunden im Schnitt zwischen Anfrage und Angebot liegen?**
→ Bei Nein können Sie diese Zeit nicht verkürzen, denn Sie würden die Verbesserung nicht sehen.

**B2. Geht ein Angebot raus, ohne dass jemand Daten aus einem anderen System abtippt?**
→ Bei Nein zahlen Sie doppelt: die Zeit fürs Abtippen, und die Fehler, die sich einschleichen und erst beim Kunden auffallen.

**B3. Bekommt ein Anfragender innerhalb von 24 Stunden eine Antwort, auch am Wochenende oder in einer Urlaubswoche?**
→ Bei Nein ist Ihre Reaktionszeit eine Funktion davon, wer gerade arbeitet. Der Anfragende ruft derweil den Nächsten an.

**B4. Können Sie sehen, welcher Schritt im Ablauf die meiste Zeit kostet?**
→ Bei Nein verbessern Sie nach Gefühl, und das Gefühl zeigt auf den Schritt, der am lautesten klagt — selten auf den, der am längsten dauert.

**B5. Können Sie einem Kunden innerhalb einer Woche eine Zeichnung oder Kalkulation zeigen, auch wenn der Kollege, der sie erstellt, nicht da ist?**
→ Bei Nein ist Ihre Durchlaufzeit der Kalender einer Person. Der Kunde erlebt das als Stille, und Sie merken es erst, wenn er nicht zurückruft.


#### Blok C — Doppelte Eingabe
*+38 % Lead-zu-Gespräch, nachdem vier Tools durch ein CRM plus einen WhatsApp-Flow ersetzt wurden.*

**C1. Werden Name und Adresse einer neuen Anfrage nur einmal getippt?**
→ Bei Nein gibt es sofort zwei Versionen desselben Kunden, und nichts entscheidet, welche die echte ist.

**C2. Liegen WhatsApp-Gespräche mit Kunden dort, wo ein Kollege sie wiederfindet?**
→ Bei Nein liegt die Kundenhistorie auf einem privaten Telefon. Beim Weggang geht sie mit zur Tür hinaus.

**C3. Landet eine Anfrage über Ihre Website automatisch in dem System, in dem Sie arbeiten?**
→ Bei Nein existiert die Anfrage erst, wenn jemand sie überträgt, und auf diesem Schritt steht kein Alarm.

**C4. Wissen Sie bei jedem Lead, woher er kam?**
→ Bei Nein ist jede Aussage darüber, was funktioniert, geraten. Sie stellen dann den Kanal ein, der am leisesten ist, nicht den, der am wenigsten bringt.


#### Blok D — Stapelkosten
*0 € zusätzliche SaaS-Ausgaben — die abgeschalteten Tools finanzierten den Umbau.*

**D1. Wissen Sie aus dem Kopf, wie viele Software-Abos Sie haben und was sie zusammen pro Monat kosten?**
→ Bei Nein wächst dieser Stapel mit jeder Einzelentscheidung, und niemand beschließt je, ihn wachsen zu lassen.

**D2. Gibt es ein Tool, für das Sie zahlen und das seltener als einmal pro Woche von jemandem geöffnet wird?**
→ Bei Ja zahlen Sie für eine Gewohnheit, die niemand mehr hat. Das ist die billigste Einsparung, die es gibt, und die am leichtesten vergessene.

**D3. Können Sie beim Weggang eines Mitarbeiters innerhalb eines Tages alle seine Zugänge entziehen?**
→ Bei Nein ist Ihr Stapel auch ein Sicherheitsproblem, nicht nur ein Kostenpunkt.

## §10 — De gate (2026-09-20, avond): de uitslag is de ruil voor de lead

Dit draait §1 en de tabel in §4 om, en dat staat hier met naam. Juans
opdracht, dezelfde avond als §9: *the results should you get after details* —
*so that you can actually get leads*. Gekozen: een harde gate, met naam,
bedrijf en e-mailadres, in alle drie de talen.

**Wat er verandert.** Na de zestien vragen en de knop komt geen uitslag maar
een kaart: naam, bedrijf, e-mailadres, en daaronder — los, niet
voorgevinkt — het vinkje voor de drie mails. Pas als de server `ok` zegt
rendert de uitslag. De rij die dat oplevert is een **lead** in
`marketing.leads`, met `source = lekkage-scan` en als bericht de uitslag zelf
(drie lekken, per lek de bloknaam, de breuk en de vraag-ids), uitgerekend op
de server uit de meegestuurde antwoorden — niet uit een getal dat de browser
opgaf. De triggers op die tabel doen de rest: Telegram naar Juan
(`lead-notify`) en de ontvangstbevestiging aan de bezoeker
(`lead-acknowledge`, "binnen 24 uur"). De pagina zegt dat laatste nu ook
zelf, zodat de bevestiging geen verrassing is.

**Wat er niet verandert.** De reeks van drie mails blijft een aparte,
ondubbelzinnige toestemming (Tw 11.7). De gate koopt de uitslag, niet de
reeks: zonder vinkje komt er geen rij in `marketing.subscribers`, en de
toestemmingstekst blijft woordelijk dezelfde. De vragen, de score, de ene
grens en de printversie zijn ongewijzigd.

**Wat het kost, en dat is de afweging uit §4 in omgekeerde richting.** Een
gate vóór de uitkomst kost de mensen die nog niet weten of dit voor hen is;
dat stond er en het blijft waar. Wat ertegenover staat is dat er tot vandaag
nul rijen uit de scan zijn gekomen en dat een uitslag zonder naam voor Juan
niets is om op te volgen. Zodra Plausible meet (`Scan Voltooid` tegen
`Uitslag Aangevraagd`) is de afhaak op de gate een getal, en dan is dit een
beslissing die je kunt herzien op cijfers in plaats van op smaak.

**Wat de poorten bewaken.** `app/actions/scan-opvang.test.ts`: zonder naam,
bedrijf, adres of volledige antwoorden bereikt niets de database; met vinkje
twee rijen in de volgorde leads → subscribers; een dubbel adres in de reeks is
geen fout; een kapotte reeks laat de lead staan en toont de uitslag toch.
`lib/scan-opvang.test.ts`: `leesAntwoorden` weigert alles wat geen volledig
booleans-object is, en het Telegram-bericht draagt geen euro en geen procent.

**Eén ding om te weten.** De ontvangstbevestiging is dezelfde als die van het
contactformulier ("je bericht is aangekomen, binnen 24 uur"), terwijl een
scan-lead niets heeft gevraagd. Een eigen tekst per `source` zit in
`lead-acknowledge` en gaat mee met de eerstvolgende uitrol via de MCP.
