# DEUS — afspraak en meetopstelling voor setters

Opgesteld 2026-08-15. Besluit van Juan diezelfde dag: **setters verkopen DEUS**,
niet Diaz Editor. De Diaz Editor-prijzen blijven ongewijzigd.

Dit stuk legt vast wat je uitbetaalt, waarvoor, en hoe je het telt. Alle
bedragen komen uit `_drafts/pricing/pricing-tiers.csv`, de bron die ook de
`/pricing`-pagina voedt.

---

## 1. Waarom dit voor DEUS wél kan en voor Diaz Editor niet

Een setter verkoopt niet. Een setter boekt een gesprek; jij sluit. Dat verschil
bepaalt de hele afspraak.

Een closer-op-commissie heeft een werkende kassa nodig — anders sluit hij een
deal die het systeem niet afrekent en wacht hij op geld dat niet komt. Een
setter heeft dat niet nodig: jij kunt met de hand factureren, en dat doe je al.

Wat een setter wél nodig heeft is een dealwaarde die zijn werk draagt. Dat is
precies waar Diaz Editor afvalt en DEUS niet.

| product | waarde per klant | 25% daarvan |
|---|---|---|
| Diaz Editor Licentie | €197 eenmalig | €49 |
| DEUS Professional | €4.140 in jaar 1 | €1.035 |

Op €49 houdt niemand het vol die je zou willen houden.

---

## 2. Wat een DEUS-klant waard is

Per tier, bij het minimum aantal zitplaatsen. Maandelijkse facturering:

| tier | per zitplaats | min. zitplaatsen | per maand | jaar 1 |
|---|---|---|---|---|
| Starter | €40 | 3 | €120 | **€1.440** |
| Professional | €69 | 5 | €345 | **€4.140** |
| Business | €99 | 10 | €990 | **€11.880** |
| Enterprise | op aanvraag | 15 | — | — |

Bij jaarlijkse facturering (−20%) ligt jaar 1 lager maar staat het geld meteen
op de rekening: €1.152 / €3.300 / €9.480.

**Richt de setters op Professional.** Starter draagt de acquisitiekost
nauwelijks, Business vraagt een inkooptraject dat een koud gesprek niet opent.

---

## 3. Wat je kunt uitbetalen

Kies eerst je maximale acquisitiekost als deel van jaar 1. Jij noemde 20–25%.
Op Professional is dat €828 tot €1.035 per gewonnen klant — voor de setter, de
chatter en alles eromheen samen.

Verdeel dat over de trechter. Eén getal ken je niet en is niet te raden: hoeveel
nagekomen gesprekken je nodig hebt voor één klant. Vandaar dit als
**startaanname, niet als feit** — met het uitdrukkelijke doel hem in acht weken
door een gemeten cijfer te vervangen:

> aanname: 1 op de 4 nagekomen gesprekken wordt klant

Dan is er per nagekomen gesprek €207 tot €259 beschikbaar. Daarbinnen:

| post | bedrag | wanneer |
|---|---|---|
| per nagekomen gekwalificeerd gesprek | **€60** | einde week |
| bonus bij gewonnen klant | **€350** | bij eerste betaling |

Per klant kost dat, bij de aanname hierboven, 4 × €60 + €350 = **€590**. Dat is
14% van jaar 1 — ruim onder je plafond, met marge voor het geval de aanname te
optimistisch blijkt. Valt de verhouding uit op 1 op 8, dan kom je op €830 en zit
je nog net binnen 20%.

### Waarom niet gewoon een percentage

Drie redenen, alle drie meetbaar vandaag:

1. **`Subscription` in `wbgiouuifqhasedncysw` staat op 0.** DEUS heeft nog nooit
   een betalende klant gehad. Een percentage-afspraak is een belofte over een
   machine die nog niet heeft gedraaid.
2. **De per-zitplaats-prijzen bestaan niet in Stripe** (taak #40). Er is dus
   letterlijk nog geen bedrag om een percentage van te nemen.
3. **De setter bepaalt de boeking, niet de sluiting.** Iemand afrekenen op een
   uitkomst die hij niet in de hand heeft, verplaatst jouw risico naar hem — en
   dan koop je zijn onzekerheid terug in de vorm van verloop.

Het vaste bedrag legt het risico waar het hoort: jij weet nog niet of je aanbod
sluit, dus jij draagt dat.

---

## 4. Wanneer telt een gesprek

Vier voorwaarden, alle vier objectief vast te stellen. Eén ervan open laten is
de garantie op ruzie in week zes.

1. **Nagekomen.** De prospect verscheen. Een no-show telt niet, ook niet bij een
   nette afzegging.
2. **Minimaal 10 minuten.** Voorkomt de beleefde klik-en-weg.
3. **Binnen het ICP.** Vast te leggen vóór dag 1 (zie §6). Een gesprek buiten
   het profiel telt niet, ook al was het aardig.
4. **Nieuw.** Geen bestaand contact, geen lopend gesprek, geen klant.

Geschil? Dan wint de opname of de agenda-rij, niet het geheugen.

---

## 5. Meetopstelling

Vandaag is er één bruikbaar oppervlak: `https://cal.com/juandiazllc/15min`
(vastgelegd in `lib/booking.ts`, met een Plausible-doel `Boeking 15min`).

Dat volstaat voor één setter en een handmatige telling. Zodra het er twee zijn,
is het handwerk duurder dan de bouw. Wat er dan moet staan:

- **een eigen boekingslink per setter** — cal.com routeert per event-type of via
  een verborgen veld, zodat de toewijzing bij de bron ontstaat en niet achteraf
  uit een e-mail wordt gereconstrueerd
- **een tabel `setter_bookings`** met setter, prospect-organisatie, tijdstip,
  nagekomen ja/nee, duur, ICP-oordeel, uitkomst
- **een cal.com-webhook naar een edge function** die die rij wegschrijft, in
  hetzelfde patroon als `lead-notify`
- **uitbetaling die uit een query rolt**, niet uit een gesprek

Dat is een halve dag werk. Bouwen zodra de eerste setter begint, niet eerder —
maar wel vóór de tweede.

**Belangrijk: laat setters niet naar het contactformulier verwijzen.**
`marketing.leads` staat op 0 rijen, ook na de RLS-reparatie van 21 juli. Of er
komt niets binnen, of de keten is nog stuk (taak #36). De boekingslink loopt
buiten dat pad om en is daarmee het enige oppervlak dat je vandaag vertrouwt.

---

## 6. Wat er moet staan vóór dag 1

| # | wat | status |
|---|---|---|
| 1 | Iets om te demonstreren — draait DEUS ergens waar een prospect het ziet? | **onbekend, jij weet dit** |
| 2 | ICP op papier: sector, omvang, functie, land | ontbreekt |
| 3 | Eén zin die zegt wat DEUS is en voor wie | ontbreekt |
| 4 | Boekingslink per setter | cal.com staat, routering nog niet |
| 5 | Lijst om uit te werken | het `li.*`-schema draagt oude campagnes — eerst kijken wat bruikbaar is |
| 6 | Afspraak op papier, ondertekend | dit document |

Nummer 1 is de enige echte blokkade. De rest is een dag werk.

Wat géén dag-1-blokkade is: de per-zitplaats-prijzen in Stripe (taak #40). Je
hebt ze nodig om geld aan te nemen, niet om gesprekken te voeren. Reken op week
drie, niet op week nul — maar laat het niet later worden, want dan sluit je
deals die je met de hand moet afhandelen en herhaal je precies wat er met de zes
Diaz Editor-licenties is gebeurd.

---

## 7. Wat dit niet oplost

Setters vergroten wat er al gebeurt. Ze maken geen aanbod dat sluit uit een
aanbod dat niet sluit — ze zorgen alleen dat je er sneller achter komt welke van
de twee je hebt.

Dat is hier het punt, en het is genoeg reden om te beginnen. Je weet vandaag
niet of iemand voor DEUS wil betalen, want niemand heeft het aangeboden
gekregen. Acht weken met één setter geven je drie dingen die je nu geen van
alle hebt: het aantal gesprekken per afspraak, het aantal afspraken per klant,
en het antwoord op de vraag of dit product te verkopen is.

Begin met één. Een tweede erbij vóór die drie getallen bestaan, is een loonlast
kopen bovenop dezelfde onwetendheid.
