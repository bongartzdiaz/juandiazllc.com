# Het datastuk — wat er ligt, en wat alleen jij kunt aanleveren

Geschreven 2026-08-28. Dit maakt idee 4 uit `docs/kanalen.md` schrijfklaar:
één stuk eigen data — geanonimiseerd, wat vier operators werkelijk kwijt waren
tussen intake en offerte — als het enige soort artikel waar een vakblad op een
domein zonder autoriteit naar linkt.

**Waarom het stuk er nog niet is.** `docs/claims.md` draagt de vier
eindcijfers (bevestigd 2026-08-19), maar niet het onderliggende verloop: geen
beginwaarden, geen meetbron, geen volumes. Een datastuk schrijven zonder die
data is verzinnen, en dat is hier de hoofdzonde. Dit document maakt het gat
precies: per traject de vragen die alleen jij kunt beantwoorden, plus de
regels waar het stuk aan moet voldoen, plus het skelet dat klaarstaat zodra de
antwoorden er zijn.

**Ik publiceer niets.** Het stuk wordt pas geschreven nadat jouw antwoorden in
`docs/claims.md` staan — en die volgorde is regel 1 hieronder.

## De drie regels, uit `docs/kanalen.md` §2.4

1. **Geen cijfer dat niet in `docs/claims.md` staat.** Jouw antwoorden gaan
   dus éérst die tabel in, daarna pas in kopij. Dat sluit en passant het open
   punt dat `claims.md` zelf noteert sinds 2026-08-19: de per-traject-details
   — welke klant, welke periode, waar gemeten — horen daar te staan, ook al
   bereiken ze nooit een pagina. Eén intake, twee doelen.
2. **"vier is geen steekproef" staat letterlijk in het stuk.** Vier trajecten
   dragen geen statistiek; het stuk zegt wat er gemeten is, niet wat er
   daaruit volgt voor de markt.
3. **Een kop "Wat ik hier niet beweer".** Drie bestaande NL-artikelen dragen
   die kop al (de ETS2- en WPM-stukken in `lib/insights.ts`); dit stuk volgt
   die vorm.

## Wat er al ligt

De vier uitkomsten uit de tabel in `docs/claims.md`, met de sectornamen zoals
`results.r1..r4.sector` in `lib/i18n/dict.ts` ze schrijft:

| metric | traject | venster |
| --- | --- | --- |
| `+38%` | Nederlandse zonne-installateur — conversie lead naar gesprek, na vier losse tools naar één CRM met WhatsApp-flow | 90 dagen |
| `3.2x` | NL/BE energiemakelaar — pijplijnsnelheid toen buitendienst en kantoor dezelfde dealstatus zagen | 6 maanden |
| `−61%` | Residentiële batterij-installateur — doorlooptijd aanvraag naar offerte, na het koppelen van intake, schouw en offerte | Q1-uitrol |
| `€0` | Multi-vestiging operator — extra softwarekosten; de tools die eruit gingen betaalden de herbouw | Jaar één |

Dit zijn relatieve eindcijfers. Voor een datastuk zijn ze het slot, niet het
verhaal: het verhaal is het verloop eronder, en dat staat nergens.

---

## De intake — beantwoord dit per traject

Vijf vaste vragen per traject, plus één die bij dat traject hoort. Schrijf de
antwoorden in de uitkomstensectie van `docs/claims.md` (regel 1); daarna wordt
het stuk geschreven. Wat je niet meer weet of niet meer kunt terugvinden:
schrijf dat óók op — "niet meer te achterhalen" is een eerlijk antwoord en
bepaalt wat het stuk wel en niet kan dragen.

### Traject 1 — de zonne-installateur

- [ ] Beginwaarde: wat was de conversie lead→gesprek vóór de ombouw (absoluut, met eenheid)?
- [ ] Eindwaarde: wat was hij na 90 dagen?
- [ ] Meetbron: uit welk systeem of rapport komen die twee getallen?
- [ ] Periode: welke maanden, welk jaar?
- [ ] Volume: over hoeveel leads gemeten?
- [ ] Specifiek: hoeveel van de winst kwam uit de WhatsApp-flow tegenover het samenvoegen van de vier tools — of is dat niet te scheiden?

### Traject 2 — de energiemakelaar

- [ ] Beginwaarde: hoe lang deed een deal er vóór de ombouw over (absoluut)?
- [ ] Eindwaarde: en na zes maanden?
- [ ] Meetbron: waar is dealsnelheid in gemeten?
- [ ] Periode: welke maanden, welk jaar?
- [ ] Volume: over hoeveel deals gemeten?
- [ ] Specifiek: wat was het duurste misverstand tussen buitendienst en kantoor vóór de gedeelde dealstatus — één concreet voorbeeld dat geanonimiseerd mag?

### Traject 3 — de batterij-installateur

- [ ] Beginwaarde: hoeveel dagen zat er vóór de ombouw tussen aanvraag en offerte?
- [ ] Eindwaarde: en na de Q1-uitrol?
- [ ] Meetbron: waar komen die doorlooptijden vandaan?
- [ ] Periode: welk kwartaal, welk jaar?
- [ ] Volume: over hoeveel aanvragen gemeten?
- [ ] Specifiek: het verloop per stap — intake, schouw, offerte — in dagen, vóór en na. Dit is de kern van het stuk dat kanalen §2.4 beschrijft ("tussen intake en offerte"); zonder deze rij is dat stuk niet te schrijven.

### Traject 4 — de multi-vestiging operator

- [ ] Beginwaarde: wat kostte de oude stack per maand of per jaar?
- [ ] Eindwaarde: en de nieuwe?
- [ ] Meetbron: facturen, boekhouding, of iets anders?
- [ ] Periode: welk jaar is "jaar één"?
- [ ] Volume: hoeveel tools gingen eruit, hoeveel kwamen erin?
- [ ] Specifiek: mag de lijst van uitgezette tools geanonimiseerd worden benoemd (categorieën, geen merknamen), of is dat herleidbaar?

### De meterdata

`docs/kanalen.md` §2.4 noemt "meterdata uit het werk zelf" als tweede bron
naast de vier trajecten.

- [ ] Welke meterdata bestaat er, uit welk systeem?
- [ ] Van wie is die data juridisch, en mag hij geanonimiseerd gepubliceerd?
- [ ] Is hij herleidbaar tot een klant als sector plus venster erbij staan?

---

## Het skelet

De koppen liggen vast; elk `[ANTWOORD n]` slot wordt gevuld uit de intake
hierboven, nooit uit het hoofd. Het skelet draagt bewust geen enkele
meetwaarde — de vier metrics staan in de tabel hierboven en komen pas in
kopij als de beginwaarden ernaast kunnen staan.

1. **Wat er gemeten is** — vier trajecten, sector plus venster, en de zin
   "vier is geen steekproef" in de eerste alinea.
2. **Tussen intake en offerte** — het verloop per stap uit traject 3
   `[ANTWOORD 3]`, het hart van het stuk.
3. **De andere drie metingen** — beginwaarde, eindwaarde, meetbron, volume
   per traject `[ANTWOORD 1]` `[ANTWOORD 2]` `[ANTWOORD 4]`.
4. **Wat ik hier niet beweer** — geen marktcijfer, geen voorspelling, geen
   garantie dat een vijfde traject hetzelfde oplevert; wat "niet meer te
   achterhalen" bleek staat hier ook.
5. **Hoe dit gemeten is** — de meetbronnen, zodat een vakblad iets heeft om
   naar te verwijzen in plaats van op te vertrouwen.

## Waar de poort op let

`lib/datastuk.test.ts` bewaakt wat mechanisch kan rotten: de vier metrics
staan hier precies één keer en woordelijk zoals `docs/claims.md` ze draagt
(geparst, niet overgetypt); de twee verplichte zinnen uit kanalen §2.4 staan
erin en de grens-regel staat daar nog woordelijk; de sectornamen zijn die van
`dict.ts`; nergens een bedrag dat geen uitkomst is; en de intake telt haar
vragen. Wat de poort niet kan zien: of een antwoord klopt. Dat is precies
waarom de antwoorden van jou moeten komen.
