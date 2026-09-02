# Diaz Atlas — de volgorde

Uitvoerbaar vervolg op de sectie *"Diaz Atlas — de trechter, de installer en
de betaalketen"* in `docs/claims.md`. **Elk cijfer hier komt daaruit; er staat
niets in dat daar niet gemeten is.** `lib/diaz-atlas.test.ts` dwingt dat af.

Deze lijst is niet op impact gesorteerd maar op **afhankelijkheid**. Distributie
staat onderaan, niet omdat het onbelangrijk is maar omdat de meting eronder
vandaag niet werkt — verkeer dat je niet kunt toeschrijven leert je niets, en
dan heb je het bezoek uitgegeven zonder er iets voor terug te krijgen.

---

## 1. Bewijs de betaalketen met één echte aankoop

De keten `checkout.session.completed` → licentie → mail heeft in productie
nooit gedraaid. Alle bestaande licenties zijn met de hand uitgegeven;
25 checkout-sessies zijn er geweest en geen enkele is betaald.

Zolang dat zo is, is elke euro aan distributie een gok op een mechaniek dat
nog nooit heeft gewerkt. Een campagne die slaagt levert dan een koper op die
betaalt en niets ontvangt — en dat is duurder dan geen campagne.

**Blokkade:** geen. Dit is jouw handeling en hij kost één aankoop.
**Wat het afsluit:** een aankoop van €197 vanaf een account dat niet het jouwe
is, die eindigt in een sleutel in een inbox. Als er iets breekt, breekt het op
een moment dat je kijkt in plaats van bij een vreemde die je nooit spreekt.

---

## 2. Zet ondertekening aan

De installer is onondertekend, maar de pijplijn eromheen staat al: drie paden
in de release-workflow, een dagelijkse wachter op het verlopen van het
certificaat, en de uitgeversnaam ingevuld. Wat ontbreekt is één secret.

**Niet EV.** `electron-builder.yml` noteert zelf, met bronvermelding naar
Microsoft Learn, dat EV sinds 2024 geen SmartScreen-voordeel meer geeft en dat
een goedkoop OV-certificaat of Azure Trusted Signing (~$10/mnd) hetzelfde doet
voor een fractie. **Dat is een becommentarieerde bewering en geen meting** — hij
noemt zijn bron en is in minuten na te trekken. Doe dat vóór je koopt; het
scheelt honderden euro's per jaar als het klopt, en één avond als het niet klopt.

**Blokkade:** een aankoopbeslissing, en die is van jou.
**Wat het afsluit:** `CSC_LINK` + `CSC_KEY_PASSWORD`, óf de drie `AZURE_*`.
Daarna `verifyUpdateCodeSignature` terug op `true` en één release waarvan het
log de waarschuwing over een onondertekende build niet meer draagt.

Let op wat dit **niet** oplost. De proefperiode staat vóór de kassa, dus
SmartScreen kan de nul betalingen niet verklaren; iedereen die een checkout
bereikte was er al langs. Bijna de helft van de ~84 downloads is bovendien
Linux, en die helft ziet SmartScreen nooit. Dit verlaagt de drempel vóór de
proefperiode. Dat is echt, en het is iets anders dan een verkoopprobleem.

---

## 3. Verplaats het EULA-forum naar Nederlands recht

Delaware staat op twee plekken in de kopij: in de JSON-LD en in de EULA, waar
het forum de rechtbank van Delaware is. Dat tweede is wat een Europese
zakelijke koper leest vlak voordat hij afrekent.

De entiteit hoeft daar niet voor te veranderen. Een LLC mag Nederlands recht en
een Nederlands forum aanwijzen; dat is een contractclausule, geen herstructurering.

**Blokkade:** een juridische keuze, en die is van jou.
**Wat het afsluit:** de forumclausule in de EULA op de landingspagina's. De
JSON-LD kan blijven zoals hij is — dat is het feitelijke adres van de
rechtspersoon en dat klopt.

---

## 4. Dán pas distributie

**Blokkade:** de CHECK-constraint op
`checkout_session.tier_requested` accepteert alleen `light`, `pro`, `agency` en
`enterprise`. Licentie (€197) en Pro (€247) landen daardoor allebei op `'pro'`.
Draai je vandaag een campagne, dan kan de database achteraf niet zeggen welk
product de mensen wilden die je hebt binnengehaald.

Daar komt bij dat de bezoekerskant even blind is: de Plausible-doelen
bestaan nog niet in het dashboard, en het contactformulier op juandiazllc.com
schrijft niets weg zolang Supabase 402 geeft. Alle drie staan op de
operator-lijst bovenaan `CLAUDE.md`.

**Wat het afsluit:** de constraint verruimen zodat elk verkocht tier zijn eigen
waarde krijgt, en de Plausible-doelen aanmaken. Pas daarna is een campagne een meting
in plaats van een uitgave.

---

## Wat hier bewust niet in staat

**Een tweede entiteit.** De LLC blijft; de KvK-registratie en de btw-afdracht
lopen, en Stripe doet de reverse-charge. Wat aan die kant open ligt is stap 3,
en dat is een clausule.

**Een socialplan.** Er is er al een — `docs/kanalen.md` zet vijf kanalen op
volgorde en `docs/linkedin-posts.md` draagt twaalf plak-klare posts. Dit
document vervangt dat niet; het zegt in welke volgorde die kanalen zin hebben.

**Een schatting van wat elke stap oplevert.** Er is nul conversiedata, dus elk
getal daarover zou verzonnen zijn.

## Wat de meting niet kon zien

Het Supabase-datavlak staat op 402 en er is van hieruit geen Stripe-toegang. De
rijen over licenties, betalingen en downloads in `docs/claims.md` dragen daarom
de datum van hun eigen oorspronkelijke meting. Een groen vinkje op de poort
hierboven betekent dat dit document klopt met dat register — niet dat het
register nog klopt met de werkelijkheid.
