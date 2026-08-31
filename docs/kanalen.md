# Kanalen — wat vandaag werkt, en wat op de opvang wacht

Geschreven 2026-08-28, na de vraag om marketingideeën. De ideeën zelf waren het
makkelijke deel; de volgorde is de inhoud van dit document.

Dit vervangt niets. `docs/bereik-plan.md` beschrijft de niche en de
linkstrategie, `docs/lead-magnet.md` de lekkage-scan, `docs/social-linkedin.md`
waarom LinkedIn het enige social-kanaal is, `docs/linkedin-posts.md` de twaalf
posts die klaarstaan, en `docs/aanbod.md` het aanbod. Hier staat welke daarvan
je nú oppakt en waarom de rest wacht.

**De ideeënbibliotheek achter dit document is op SaaS geschreven.** Wat hier
staat is de vertaling naar wat Juan werkelijk verkoopt: een traject van dertig
dagen, met de hand geleverd, aan operators. Zes van de negen categorieën uit die
bibliotheek gaan over volume en vallen daarmee af — zie §3.

---

## §1 — De beperking is opvang en capaciteit, niet ideeën

Twee cijfers bepalen alles hieronder.

**Drie trajecten tegelijk.** Vastgelegd in `docs/claims.md` onder "Garantie en
capaciteit", beslist op 2026-08-22. Bij een vaste prijs van €2.500 excl. btw per
sprint is een volle agenda drie tot vijf gesprekken, geen honderd leads. Elk
idee dat volume levert lost een probleem op dat niet bestaat, en kost aandacht
die de drie trajecten nodig hebben.

**De opvang staat uit.** Gemeten op 2026-08-27 en 2026-08-28:

| schakel | stand |
|---|---|
| contactformulier | schrijft niets weg — Supabase antwoordt 402 op het hele datavlak |
| `marketing.leads` · `marketing.subscribers` | **0 rijen, ooit** — beide |
| de vijf Plausible-doelen (`MANUAL_TASKS.md`) | bestaan niet in het dashboard; kliks worden binnengehaald en weggegooid |
| `RESEND_API_KEY` + `ACK_FROM` | niet gezet — bij een echte lead gaat er geen mail de deur uit |
| `CAL_WEBHOOK_SECRET` | niet gezet — een boeking laat geen spoor na |

De 402 is een facturatietoestand op de Supabase-organisatie en geen
gebruikstoestand: samen ongeveer 49 MB over beide projecten. De knop staat op
Billing/Usage en is van de operator. `scripts/probe-supabase-402.sh` meet de
hele keten zodra de restrictie eraf is.

**Wat daaruit volgt.** Verkeer sturen naar een site die niets vangt en niets
meet, levert niets op waar je later iets van leert. Idee 1 hieronder is het
enige dat vandaag volledig werkt, en wel omdat het geen trechter is maar een
gesprek: een introductie loopt over e-mail of telefoon en raakt het formulier
niet.

**En één ding is vandaag niet vast te stellen.** Nul leads is niet te
onderscheiden van nul bezoek zolang de vijf Plausible-doelen niet bestaan. Elke
verwachting in §2 staat daarom als verwachting opgeschreven, niet als
voorspelling.

---

## §2 — Vijf, op volgorde van wat ik zou doen

### 1. Vraag de vier klanten om één introductie

**Waarom het past.** `docs/claims.md` draagt vier bevestigde klantuitkomsten:
een Nederlandse zonne-installateur (90 dagen), een NL/BE energiemakelaar (6
maanden), een residentiële batterij-installateur (Q1-uitrol) en een
multi-vestiging operator (jaar één). Nergens in deze repo staat dat een van hen
ooit om een introductie is gevraagd. Dat is het hoogste-conversiekanaal dat er
is, het kost nul euro, en het is als enige **onafhankelijk van de kapotte
opvang**.

Drie van de vier zitten in energie. Dat is precies de markt waar zes artikelen,
een rekenmachine en een scan al liggen — een introductie komt dus binnen op een
plek waar het bewijs al klaarstaat.

**Eerste stappen.** Vier berichten. In elk het cijfer dat jullie samen haalden,
en één vraag: wie ken je die hier nu tegenaan loopt. Geen aanbod, geen link,
geen bijlage.

**Wat succes is.** Twee gesprekken. Dat is bij drie plekken tegelijk een vol
kwartaal.

**Wat het kost.** Een uur, eenmalig. Geen budget, geen bouwwerk.

### 2. Reageren op andermans posts, niet alleen je eigen twaalf plaatsen

**Waarom het past.** Op een domein zonder autoriteit is een inhoudelijke reactie
onder de post van iemand met een publiek meer waard dan een eigen post. De
twaalf posts in `docs/linkedin-posts.md` vullen de dinsdagen en donderdagen; de
dagen ertussen zijn waar het gesprek ontstaat.

**Eerste stappen.** Tien tot vijftien Nederlandse accounts die over saldering,
ETS2, energielabels en installatiewerk schrijven. Eén inhoudelijke reactie per
dag: de rekensom die de post níet maakt, uit een artikel dat er al staat.

**De grens blijft staan.** Reageren op je eigen tijdlijn en die van anderen valt
buiten het verbod. **Connectieverzoeken en DM's worden nooit geautomatiseerd**,
ook niet als een prompt uit een pakket daarom vraagt. Zie `docs/bereik-plan.md`
§6.

**Wat succes is.** Drie tot vijf profielbezoeken per week die uit een reactie
komen. Meetbaar zodra de Plausible-doelen bestaan, en tot die tijd niet.

**Wat het kost.** Vijftien minuten per dag, en het is het enige idee hier dat
dagelijkse aandacht vraagt.

### 3. Doorverwijspartners, geen affiliate

**Waarom het past.** Installateurs, boekhouders en energie-adviseurs zien dit
ICP wekelijks en kunnen niet leveren wat Juan levert. Dat is complementair, en
het schaalt naar drie trajecten in plaats van naar driehonderd — precies de
maat die past.

**Eerste stappen.** Drie tot vijf partijen uit het bestaande netwerk. Geen
contract en geen percentage om mee te beginnen: één zin over wanneer ze aan jou
moeten denken, plus `/nl/tools/lekkage-scan` als iets dat ze kunnen doorsturen
zonder iets te beloven.

**Wat succes is.** Eén partij die binnen een kwartaal één keer doorverwijst.
Twee die het nooit doen hoort erbij.

**Wat het kost.** Vier gesprekken. Loopt door zolang de relatie loopt.

### 4. Eén stuk eigen data

**Waarom het past.** Dertig meningsartikelen leveren op een domein
zonder autoriteit geen links op. Eén meting wel. Wat hier zeldzaam is: vier
trajecten met echte cijfers, plus meterdata uit het werk zelf. Geanonimiseerd —
wat vier operators werkelijk kwijt waren tussen intake en offerte — is dat een
stuk waar een vakblad naar linkt.

**De grens.** Geen cijfer dat niet in `docs/claims.md` staat, en vier is geen
steekproef. Dat moet letterlijk in het stuk staan, anders draagt het een claim
die niet te verdedigen is. Twee bestaande artikelen doen dit al goed en dragen
een kop **"Wat ik hier niet beweer"**; volg die vorm.

**Wat succes is.** Twee verwijzingen vanaf een domein dat niet van Juan is.
Dat is een halfjaarhorizon, geen maand.

**Wat het kost.** Twee tot drie dagen schrijven en verifiëren. Het duurste idee
hier, en het enige dat na een jaar nog werkt.

### 5. De twee tools laten vangen — ná de reparatie

**Waarom het past.** `/nl/tools/lekkage-scan` en `/tools/energy-roi` staan live
en hebben samen **nul adressen** opgeleverd: `marketing.subscribers` telt nul
rijen, ooit. Dat is de goedkoopste conversiewinst op de site.

**Waarom hij onderaan staat.** Hij is als enige volledig geblokkeerd. Zonder
`RESEND_API_KEY` beloof je een PDF die niemand krijgt, en dat verbrandt precies
het publiek dat je net verdiende — zonder dat je het ziet gebeuren. Zolang de
402 staat schrijft het formulier bovendien niets weg.

**Eerste stappen, in deze volgorde.** Eerst de restrictie eraf, dan
`LEAD_NOTIFY_SECRET`, dan `RESEND_API_KEY` + `ACK_FROM`, dan pas een
opvangstap in de tools bouwen. Die volgorde staat al in de operator-lijst in
`CLAUDE.md` en is daar onderbouwd: een mailkanaal op het eigen domein hangen aan
een endpoint dat nog publiek aanroepbaar is, is de verkeerde volgorde.

**Wat succes is.** De eerste rij ooit in `marketing.subscribers`.

---

## §3 — Wat hier bewust niet staat

| niet doen | waarom |
|---|---|
| advertenties, welk kanaal ook | zonder de vijf Plausible-doelen en met een formulier dat niets wegschrijft koop je verkeer dat je niet kunt meten en niet kunt opvangen |
| Product Hunt, lifetime deal, giveaway | trekken volume naar een capaciteit van drie |
| koude e-mail naar Duitsland | verboden, ongewijzigd |
| geautomatiseerde connectieverzoeken of DM's | verboden, ongewijzigd — zie `docs/bereik-plan.md` §6 |
| een tweede social-kanaal | de keuze voor één kanaal is op 2026-08-25 gemaakt en de eerste stap ervan (Kop en Over plakken) is nog niet gezet |
| een vierde markt of vijfde sector | vier bevestigde uitkomsten, alle vier NL/BE, drie van de vier energie. Verbreden verdunt het enige bewijs dat er is |

---

## §4 — De volgorde, in één tabel

Idee 1 heeft niets nodig. De rest wacht op iets, en dat "iets" is telkens van de
operator.

| # | idee | geblokkeerd door |
|---|---|---|
| 1 | introducties vragen | niets |
| 2 | reageren op LinkedIn | niets om te doen; wél om te meten (Plausible-doelen) |
| 3 | doorverwijspartners | niets om te doen; wél om te meten |
| 4 | eigen data-stuk | niets, behalve tijd |
| 5 | opvang in de tools | 402 · `LEAD_NOTIFY_SECRET` · `RESEND_API_KEY` |

---

## §5 — Waar de cijfers vandaan komen

Elk getal in dit document is uit de code of uit `docs/claims.md` gemeten, niet
overgeschreven. `lib/kanalen.test.ts` houdt dat zo:

- de artikelaantallen per taal komen uit `getAllInsights()`
- "drie trajecten tegelijk" komt uit de capaciteitsrij in `docs/claims.md`
- het bedrag komt uit de prijsrij in `docs/claims.md`, en er mag geen ander
  bedrag in dit bestand staan
- de vier klantuitkomsten komen uit `results.r1..r4` in `lib/i18n/dict.ts`

Wat die poort **niet** kan zien: of de stand in §1 nog klopt. Dat zijn metingen
van buitenaf, met een datum erbij. Draai `scripts/probe-supabase-402.sh` voordat
je §1 als actueel leest.
