# Doorverwijspartners — drie berichten en één doorstuurtekst

Geschreven 2026-08-28. Dit voert idee 3 uit `docs/kanalen.md` uit:
doorverwijspartners, geen affiliate. De beslissing daar is de vorm hier —
**geen contract en geen percentage om mee te beginnen** — want een partij die
doorverwijst zonder vergoeding doet dat op reputatie, en dat is precies wat
zo'n verwijzing waard maakt.

**De namen kies jij.** Drie tot vijf partijen uit het bestaande netwerk, drie
soorten uit `docs/kanalen.md` §2.3: installateurs, boekhouders en
energie-adviseurs. Zij zien dit ICP wekelijks en kunnen niet leveren wat jij
levert. `[naam]` vul je zelf in, en lees elk bericht voordat je het verstuurt —
of het klopt bij die relatie weet jij alleen.

**Ik plaats en verstuur niets.** Versturen is jouw handeling, per bericht.

## De vorm

Drie regels, en de poort in `lib/partners.test.ts` bewaakt ze waar dat
mechanisch kan:

1. **Eén zin die zegt wanneer ze aan je moeten denken**, in de werkwoorden van
   hún werk — niet in die van het jouwe.
2. **De lekkage-scan als doorstuurbaar ding dat niets belooft.** De enige link
   die erin staat. Vier minuten, vijftien ja/nee-vragen, geen e-mailadres
   nodig — wie hem krijgt hoeft niets te kopen en niets achter te laten.
3. **Geen vergoeding, en dat staat er expliciet in.** Geen klantcijfers, geen
   bedragen: de uitkomsten uit `docs/claims.md` horen bij de klanten die ze
   haalden (`docs/introducties.md`), niet in een partnertekst.

Toon: je, kort, concreet. Dezelfde stem als de site.

---

## Bericht 1 — voor een installateur

```
Hoi [naam],

Korte vraag, geen verkooppraatje. Jij kent vast collega-bedrijven — niet je
concurrenten, gewoon vakgenoten — waar de aanvragen binnenstromen terwijl elke
offerte nog met de hand in elkaar wordt gezet. Als je zo'n verhaal hoort: denk
dan aan mij. De binnenkant van zulke bedrijven bouwen is precies wat ik doe.

Je hoeft niets te beloven. Er staat een gratis zelfscan op mijn site die je zo
kunt doorsturen: https://juandiazllc.com/nl/tools/lekkage-scan — vier minuten,
geen e-mailadres nodig, en ze zien zelf waar het lekt.

Geen vergoeding, geen contract. En het werkt twee kanten op: vraagt iemand mij
om een goede installateur, dan noem ik jou.

Groet,
Juan
```

## Bericht 2 — voor een boekhouder

```
Hoi [naam],

Jij ziet eerder dan wie ook wanneer een bedrijf softwarekosten stapelt: elke
maand facturen voor tools die elkaar half overlappen, terwijl niemand nog kan
zeggen wat er onderaan de streep overblijft. Zie je dat bij een klant: denk
dan aan mij. Ik breng zo'n stapel terug naar één systeem, en de cijfers worden
er ook voor jou leesbaarder van.

Doorsturen kan zonder iets te beloven:
https://juandiazllc.com/nl/tools/lekkage-scan — een gratis zelfscan van vier
minuten, geen e-mailadres nodig.

Geen vergoeding, geen contract. En andersom geldt hetzelfde: vraagt iemand mij
om een boekhouder, dan noem ik jou.

Groet,
Juan
```

## Bericht 3 — voor een energie-adviseur

```
Hoi [naam],

Jij adviseert wát er moet gebeuren; ik bouw de binnenkant van het bedrijf dat
het moet uitvoeren. Kom je een operator tegen waar jouw advies blijft liggen
omdat de opvolging hapert — leads kwijt, offertes te laat, alles in losse
spreadsheets — denk dan aan mij.

Doorsturen kan vrijblijvend: https://juandiazllc.com/nl/tools/lekkage-scan —
een gratis zelfscan van vier minuten, geen e-mailadres nodig.

Geen vergoeding, geen contract. En andersom: vraagt iemand mij om
energie-advies, dan noem ik jou.

Groet,
Juan
```

## De doorstuurtekst — voor de partner zelf

Dit is wat de partner kan doorsturen naar degene die hij op het oog heeft.
Kort genoeg voor WhatsApp, en er staat niets in dat de partner moet
waarmaken.

```
Ken je Juan Diaz? Hij bouwt de systemen achter installatie- en
energiebedrijven — van losse spreadsheets naar één werkend geheel. Op zijn
site staat een gratis zelfscan die in vier minuten laat zien waar omzet
weglekt: https://juandiazllc.com/nl/tools/lekkage-scan. Niets aan vast, geen
e-mailadres nodig.
```

---

## Wat je moet weten voordat je dit verstuurt

**De scan werkt; het formulier erachter niet.** De scanpagina zelf is
statisch en antwoordt gewoon (gemeten 2026-08-28: 200 op `/nl`, 404 op de
andere talen, zoals bedoeld). Maar de uitslag eindigt in een uitnodiging naar
`/contact`, en dat formulier schrijft op dit moment niets weg — het
Supabase-datavlak staat op 402, zie de operator-lijst in `CLAUDE.md`. Wie nu
converteert krijgt een foutmelding. Tot dat is opgelost is de vangnet-zin in
een partnergesprek: "of laat ze me gewoon bellen of mailen" — die weg werkt
altijd. Dit is ook de reden dat `docs/kanalen.md` dit idee ná de introducties
zet.

**Meten kan nog niet.** Of een doorverwijzing ooit een bezoek oplevert is pas
te zien als de vijf Plausible-doelen bestaan. Tot die tijd is het enige
meetpunt de partij zelf: één partij die binnen een kwartaal één keer
doorverwijst is succes, twee die het nooit doen hoort erbij
(`docs/kanalen.md` §2.3).

## Waar de poort op let

`lib/partners.test.ts` bewaakt wat mechanisch kan rotten:

- de enige link in elk blok is de lekkage-scan, en die route bestaat werkelijk
  in het Nederlands — geparst uit `lib/i18n/enkele-taal.ts`, niet overgetypt
- geen enkel bedrag in dit document, en geen enkele klantuitkomst uit de
  tabel in `docs/claims.md` — die horen in `docs/introducties.md`
- elk partnerbericht zegt expliciet dat er geen vergoeding aan vastzit, en de
  beslissing waar dat op rust staat nog woordelijk in `docs/kanalen.md`
- de drie partnersoorten zijn die uit `docs/kanalen.md` §2.3

Wat de poort niet kan zien: of een bericht past bij de relatie, en of
"dan noem ik jou" een belofte is die je bij deze partij wilt doen. Dat weet
jij alleen — pas aan wat niet klopt voordat je het verstuurt.
