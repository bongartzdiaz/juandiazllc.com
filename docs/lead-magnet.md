# De leadmagneet — de lekkage-scan

Wat er gebouwd wordt om e-mailadressen op te vangen, waarom dit formaat, en de
vijftien vragen woordelijk.

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
| levering | direct zichtbaar; e-mail optioneel voor de PDF-versie |
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
inhoud, geen bereik. Vijftien vragen × vier talen is bovendien zestig
dict-sleutels voor drie markten die dit niet gevraagd hebben.

---

## §2 — De vijftien vragen

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

**B2. Gaat er een offerte de deur uit zonder dat iemand gegevens overtypt uit
een ander systeem?**
→ Bij nee betaal je twee keer: de tijd van het overtypen, en de fouten die
erin sluipen en pas bij de klant opvallen.

**B3. Krijgt een aanvrager binnen 24 uur een reactie, ook in een weekend of een
vakantieweek?**
→ Bij nee is je reactietijd een functie van wie er toevallig werkt. De
aanvrager belt ondertussen de volgende.

**B4. Kun je zien wélke stap in het traject de meeste tijd kost?**
→ Bij nee verbeter je op gevoel, en gevoel wijst naar de stap die het luidst
klaagt — zelden naar de stap die het langst duurt.

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
2. Blokken met de meeste "nee" komen eerst.
3. Gelijkspel breekt op een **vaste** volgorde: A → B → C → D.

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

Hoort onder elke uitslag, ook een slechte. Vijftien ja/nee-vragen zien geen
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

1. **De vier Plausible-doelen aanmaken** — `Boeking 15min`, `Pricing CTA`,
   `Sector CTA`, `Tool CTA` — plus de drie custom properties. Taggen is af en
   geverifieerd; zonder de doelen wordt alles weggegooid.
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

De vijftien vragen zijn geschreven, niet getest. Of ze de juiste lekken raken
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
