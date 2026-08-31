# Content-kalender — de enige bron waar de dagelijkse machine uit mag werken

Aangemaakt 2026-08-31. Dit is de onderwerpenlijst voor de dagelijkse
content-taak (`content-machine-dagelijks` op Juans machine). De regel is
dezelfde als overal in deze repo: **de machine mag alleen schrijven wat hier
staat, met de bron die erbij staat.** Een onderwerp dat hier niet staat wordt
niet geschreven; een cijfer dat niet in `docs/claims.md` of de genoemde bron
staat wordt niet gepubliceerd.

**Zoekvolumes zijn op dit moment niet meetbaar** — DataForSEO-inloggegevens
staan niet gezet en Ahrefs weigert elke aanroep ("Insufficient plan", laatst
gemeten 2026-08-31). De prioritering hieronder leunt daarom op de
regelgevings-haak (een datum die de rekensom van de lezer breekt) en op de
bestaande clusters, niet op volumecijfers. Herprioriteer zodra de meting
bestaat.

## Statussen

| status | betekenis |
| --- | --- |
| `klaar` | verlenging van een bestaand, gevalideerd cluster — de machine mag dit schrijven zonder verdere goedkeuring |
| `wacht` | nieuwe richting — wacht op akkoord van Juan; de machine raakt dit niet aan |
| `wachtrij` | geschreven, PR open, nog niet gemerged |
| `live` | gepubliceerd; datum erbij |

## juandiazllc.com — artikelen (lib/insights.ts, via PR)

| # | onderwerp | taal | tag | haak/bron | status |
| --- | --- | --- | --- | --- | --- |
| J1 | Netcongestie: wat een vol net betekent voor je installatiebedrijf (wachttijden, planning, klantcommunicatie) | nl | Energy | Netbeheer Nederland capaciteitskaart; geen bedragen; PR #293, gemerged 2026-08-31 | live |
| J2 | Refresh: salderingsregeling-cluster nalopen op actualiteit (5 artikelen, datum 1-1-2027 nadert) | nl | Energy | Rijksoverheid + ACM ConsuWijzer + Eerste Kamer 36.611; laatst gedraaid 2026-08-31 (PR #300): "afbouw" eruit, de wettelijke bodem onder de terugleververgoeding erin, bewaakt door `lib/saldering.test.ts` | klaar |
| J3 | WPM jaar twee: wat de eerste rapportageronde leerde over datakwaliteit | nl | Logistics | RVO WPM-documentatie; eigen WPM-artikel | klaar |
| J4 | Solarpflicht per Bundesland: wat de bouwplicht betekent voor Betreiber | de | Energy | landesrechtliche Solarpflichten (per land verifiëren) | klaar |
| J5 | Refresh: DE Heimspeicher-cluster (Einspeisevergütung-degressie halfjaarlijks — cijfers verifiëren) | de | Energy | Bundesnetzagentur | klaar |
| J6 | Refresh: ES autoconsumo-cluster (RD 244/2019 ongewijzigd? compensatie-plafond) | es | Energy | BOE / CNMC | klaar |
| J7 | ETS2 stand van zaken: veiling gepland, eerste inlevering 2029 — wat je dit jaar wél moet regelen | nl | Logistics | NEa; bestaand ETS2-artikel | klaar |
| J8 | EPBD IV: de trapsgewijze eisen na label D per 2030 | nl | Real estate | Rijksoverheid/RVO; bestaand EPBD-artikel | wacht |
| J9 | Vierde hospitality-artikel: nachtaudit als datamoment | en+de/es | Hospitality | sectorpagina-leaks; geen klantcijfers | wacht |
| J10 | Datastuk "tussen intake en offerte" | nl | Systems | `docs/datastuk.md` — **geblokkeerd tot de 27 intakevragen beantwoord zijn** | wacht |

## diazatlas.com — pillars/help/vs (bongartzdiaz/diaz-editor, alleen PR — mergen doet Juan)

| # | onderwerp | taal | soort | haak/bron | status |
| --- | --- | --- | --- | --- | --- |
| D1 | Refresh: prijsvermeldingen en meta's na de Founding-prijssweep (PR #651) nalopen met `landing/_check-seo-consistency.py` | alle | onderhoud | de poort zelf; laatst gedraaid 2026-08-31: 820 paginas, 0 schendingen | klaar |
| D2 | Pillar: van aanvraag naar offerte in 15 minuten — de werkvoorbereidings-workflow stap voor stap | nl | pillar | bestaande "15 minutes"-claim + help-artikelen; PR bongartzdiaz/diaz-editor#652, wacht op merge door Juan | wachtrij |
| D3 | Help-reeks: DXF aanleveren aan onderaannemers (lagen, schaal, wat er misgaat) | nl+en | help | bestaande DXF-export-docs in de repo; PR bongartzdiaz/diaz-editor#653, wacht op merge door Juan | wachtrij |
| D4 | Pillar: thuisbatterij intekenen na saldering — kruisverwijzing met het juandiazllc-cluster | nl | pillar | bestaand pillar thuisbatterij-ontwerp-saldering-2027; PR bongartzdiaz/diaz-editor#654, wacht op merge door Juan | wachtrij |
| D5 | Nieuwe vs-pagina (welke concurrent?) | en+3 | vs | **eerst kiezen welke — bestaande 14 dekken de grote namen al** | wacht |
| D6 | Blog: NEN 1010-symbolenpack v0.4.22 uitgelegd met voorbeelden | nl | blog | de release zelf (v0.4.22 + v0.4.23); de NEN 1010-pillar noemt symbolen 0x, dus de tweede bron werd de bestaande EN-post + NL-elektro-posts; PR bongartzdiaz/diaz-editor#655, wacht op merge door Juan | wachtrij |

## Vaste regels voor elke run (de machine leest dit mee)

1. **Schrijf-stack:** NL → `stop-slop-nl`; EN → `copywriting` + `ai-check`,
   daarna `humanizer` als tweede pas. Nooit beide humanize-varianten op
   dezelfde tekst. DE/ES volgen de registerregels die de taalpoorten in
   `lib/i18n/*.test.ts` afdwingen (Sie / tú).
2. **Feiten:** elk cijfer uit `docs/claims.md` of uit de bron in de rij;
   regelgeving vóór publicatie verifiëren bij de uitvoerder (RVO, NEa,
   Bundesnetzagentur, BOE), niet bij een samenvatting. "Wat ik hier niet
   beweer" is verplicht bij elk artikel met een regelgevings-haak.
3. **Interne links:** elk nieuw stuk linkt naar minstens één bestaand stuk
   in zijn cluster én wordt vanaf minstens één bestaande pagina gelinkt —
   een wees in de sitemap is geparkeerd, niet gebouwd (`seo-audit`
   waarschuwt hierop).
4. **Publicatieweg:** juandiazllc via PR in deze repo met alle poorten
   groen; diazatlas via PR in `bongartzdiaz/diaz-editor` — daar blijft de
   PR open voor Juan (mergen is daar geblokkeerd voor de machine) en draait
   `landing/_check-seo-consistency.py` lokaal vóór de commit.
5. **Geen socials.** De machine plaatst niets op LinkedIn of elders; hij mag
   wél een post toevoegen aan `docs/linkedin-posts.md` (met de poort
   `lib/linkedin-posts.test.ts` groen). Plaatsen is Juans handeling.
6. **Logboek:** elke publicatie zet de rij hier op `wachtrij` of `live` met
   datum en PR-nummer. Dit bestand is het publicatielog.

## Wat dit document niet beslist

De `wacht`-rijen zijn van Juan. En de kalender zegt niets over kwaliteit —
daar zijn de poorten en de schrijf-stack voor. Raakt de `klaar`-voorraad
leeg, dan stopt de machine met nieuwbouw en doet hij alleen nog refreshes
(J2/J5/J6/D1) tot er nieuwe rijen zijn goedgekeurd; hij verzint geen
onderwerpen bij.
