# Introducties — vier berichten, plak-klaar

Geschreven 2026-08-28. Dit voert idee 1 uit `docs/kanalen.md` uit: vraag de vier
klanten om één introductie. Het is het enige idee op die lijst dat vandaag
volledig werkt, omdat een introductie over e-mail of telefoon loopt en de
kapotte opvang (Supabase 402, geen mailsleutel) niet raakt.

**De namen staan niet in deze repo, en dat is opzet.** `docs/claims.md` legt de
vier uitkomsten geanonimiseerd vast — sector en venster, geen namen. Jij weet
wie wie is; elk bericht hieronder is daarom gekoppeld aan sector plus venster,
en `[naam]` vul je zelf in.

**Ik plaats en verstuur niets.** Versturen is jouw handeling, per bericht.

## De vorm

Drie regels, uit `docs/kanalen.md` §2.1, en de poort in
`lib/introducties.test.ts` bewaakt ze waar dat mechanisch kan:

1. **Het cijfer dat jullie samen haalden staat erin, woordelijk uit
   `docs/claims.md`.** Dat is het enige bewijs dat de ontvanger zelf heeft
   meegemaakt, en het is de reden dat dit bericht geen koude mail is.
2. **Eén vraag: wie ken je die hier nu tegenaan loopt.** Eén vraagteken per
   bericht — een tweede vraag maakt van een gunst een lijstje.
3. **Geen aanbod, geen link, geen bijlage.** Geen prijs, geen URL, geen PDF.
   Wie de vraag krijgt hoeft niets te lezen en niets te kopen; een naam is
   genoeg.

Toon: je, kort, concreet. Dezelfde stem als de site en de LinkedIn-wachtrij.

---

## Bericht 1 — Nederlandse zonne-installateur (90 dagen)

```
Hoi [naam],

Korte vraag. Toen we jullie vier losse tools vervingen door één CRM met de
WhatsApp-flow, ging de conversie van lead naar gesprek er in 90 dagen +38% op
vooruit.

Ik vraag dit liever aan iemand die dat resultaat zelf heeft gezien dan aan een
vreemde: wie ken je die hier nu tegenaan loopt — een bedrijf waar de leads wel
binnenkomen maar de opvolging hapert?

Eén naam is genoeg, de rest doe ik zelf. En hoe dan ook: goed om weer even
contact te hebben.

Groet,
Juan
```

## Bericht 2 — NL/BE energiemakelaar (6 maanden)

```
Hoi [naam],

Korte vraag. Toen buitendienst en kantoor bij jullie dezelfde dealstatus
zagen in plaats van elkaar achterna te bellen, ging de pijplijnsnelheid over
6 maanden naar 3.2x.

Wie ken je bij wie binnendienst en buitendienst nu nog langs elkaar heen
werken — ieder met een eigen lijstje, niemand met het overzicht?

Eén naam of een korte intro is genoeg, de rest pak ik zelf op. Los daarvan:
goed om weer van je te horen.

Groet,
Juan
```

## Bericht 3 — Residentiële batterij-installateur (Q1-uitrol)

```
Hoi [naam],

Korte vraag. Toen we intake, schouw en offerte aan elkaar knoopten, ging de
doorlooptijd van aanvraag naar offerte bij jullie −61% omlaag, gemeten over de
Q1-uitrol.

Wie ken je die nu nog elke offerte met de hand in elkaar zet terwijl de
aanvragen zich opstapelen?

Eén naam is genoeg, de rest doe ik zelf. En laat gerust weten hoe het er nu
voorstaat — daar ben ik sowieso benieuwd naar.

Groet,
Juan
```

## Bericht 4 — Multi-vestiging operator (jaar één)

```
Hoi [naam],

Korte vraag. Wat mij van jullie traject het meest is bijgebleven: extra
softwarekosten in jaar één — €0. De tools die eruit gingen, betaalden de
herbouw.

Wie ken je die elke maand een stapel SaaS-facturen betaalt voor tools die
elkaar half overlappen?

Als je iemand weet is een naam genoeg. En hoe dan ook: goed om weer even
contact te hebben.

Groet,
Juan
```

---

## De reageer-routine — idee 2, vijftien minuten per dag

Idee 2 uit `docs/kanalen.md` heeft geen teksten nodig maar een werkwijze. Die
staat hier zodat hij naast de berichten ligt; de twaalf eigen posts staan in
`docs/linkedin-posts.md`.

**Welke accounts.** Tien tot vijftien Nederlandse accounts die schrijven over
saldering, ETS2, energielabels of installatiewerk. Er staat hier bewust geen
lijst met namen: een lijst die ik verzin is geen bron, en accounts vind je in
tien minuten door op die vier termen te zoeken en te kijken wie er deze maand
over publiceerde met reacties eronder. Kies op twee dingen — het publiek is
jouw ICP (operators, geen consumenten), en de auteur reageert zelf onder zijn
eigen posts.

**De reactievorm.** Eén inhoudelijke reactie per dag: de rekensom die de post
níet maakt, uit een artikel dat al op de site staat. Geen link in de reactie —
wie het interessant vindt klikt op je profiel, en daar staat de site. Geen
"goed stuk!", geen emoji-applaus: een reactie zonder eigen inhoud is
onzichtbaar.

**De grens, ongewijzigd.** Reageren op andermans tijdlijn valt buiten elk
verbod. **Connectieverzoeken en DM's worden nooit geautomatiseerd** — zie
`docs/bereik-plan.md` §6.

**Wat het meet.** Drie tot vijf profielbezoeken per week uit reacties — maar
dat is pas te zien als de vijf Plausible-doelen bestaan. Tot die tijd is dit
onmeetbaar, en dat staat hier zodat niemand het als mislukt afschrijft omdat
er geen cijfer is.

---

## Waar de cijfers vandaan komen

Elk cijfer in de vier berichten komt woordelijk uit de uitkomstentabel in
`docs/claims.md` (bevestigd door Juan op 2026-08-19). `lib/introducties.test.ts`
houdt dat zo:

- de vier metrics worden uit die tabel geparst, niet overgeschreven — een
  tweede kopie van hetzelfde getal is precies waarvoor `claims.md` bestaat
- elk bericht draagt precies één metric, en elke metric staat in precies één
  bericht
- geen URL en geen bijlage-verwijzing in een bericht, precies één vraagteken
- geen enkel bedrag behalve de €0 die zelf een uitkomst is — de sprintprijs
  uit `claims.md` mag hier nergens staan
- de vier sectornamen staan er zoals `results.r1..r4.sector` in
  `lib/i18n/dict.ts` ze schrijft

Wat die poort **niet** kan zien: of een bericht klopt bij wat er in dat
traject werkelijk gebeurd is. Dat weet jij alleen — lees elk bericht voordat
je het verstuurt, en pas aan wat niet klopt met hoe jullie het hebben beleefd.
