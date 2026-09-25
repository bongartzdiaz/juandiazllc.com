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
| J2 | Refresh: salderingsregeling-cluster nalopen op actualiteit (5 artikelen, datum 1-1-2027 nadert) | nl | Energy | Rijksoverheid + ACM ConsuWijzer + Eerste Kamer 36.611; laatst gedraaid 2026-08-31 (PR #300): "afbouw" eruit, de wettelijke bodem onder de terugleververgoeding erin, bewaakt door `lib/saldering.test.ts`. Ronde 2026-09-08: de elf bestaande rijen in `docs/claims.md` hielden alle stand — er is niets gecorrigeerd. De vondst zat in wat ontbrak: **het woord "overstappen" kwam in het hele cluster nul keer voor**, terwijl vier artikelen de terugleverkosten noemen en alleen zeggen dát ze bestaan. Twee handvatten die de uitvoerder zelf noemt zijn erbij gekomen — de grens op die kosten (Rijksoverheid: alleen verwerkingskosten) en het kosteloze overstaprecht bij gewijzigde voorwaarden (ACM), inclusief de voorwaarde die eronder hangt — plus vier nieuwe claim-rijen en drie poortregels | klaar |
| J3 | WPM jaar twee: je cijfer wordt vergeleken met je eigen cijfer | nl | Logistics | RVO WPM-documentatie (FAQ + Engelse pagina); eigen WPM-artikel. Het onderwerp is bijgesteld: over *wat de eerste landelijke rapportageronde opleverde* bestaat geen nagetrokken cijfer, en `docs/claims.md` verbiedt er een te noemen. PR #301, gemerged 2026-08-31 | live |
| J4 | Solarpflicht: welke plicht als eerste grijpt, de bondsstaffel of je Bundesland | de | Energy | BGBl. 2026 I Nr. 226 (§ 106 GModG, in werking 1-1-2027) + Umweltministerium Baden-Württemberg. Het onderwerp is bijgesteld: sinds 29 juli 2026 ligt er een bondslaag over het landesrecht, dus het is geen puur landesrechtelijk lappendeken meer. Één Land nagetrokken; de overige vijftien staan als niet-nagetrokken in `docs/claims.md`, net als Bußgeld en kWp. Bewaakt door `lib/solarpflicht.test.ts`. PR #303, gemerged 2026-08-31 | live |
| J5 | Refresh: DE Heimspeicher-cluster (Einspeisevergütung-degressie halfjaarlijks — cijfers verifiëren) | de | Energy | Bundesnetzagentur voor de sätze en het ritme; `gesetze-im-internet.de` voor § 51 en § 100 EEG en § 14a en § 41a EnWG. Laatst gedraaid 2026-09-01 (PR #320): het verouderde vergoedingscijfer eruit, de gemeten 7,70 ct/kWh erin, het niet na te trekken Cent-bereik voor de eindprijs geschrapt, en § 51 EEG toegevoegd — die stond in het hele cluster niet, terwijl hij de rekensom van beide stukken raakt. Bewaakt door `lib/einspeiseverguetung.test.ts`. Ronde 2026-09-24 (PR #435): 7,70/12,22 ct en § 51 hielden stand, maar de Bundesnetzagentur publiceert de sätze nu voor inbedrijfname **t/m 31. Dezember 2026** (was 31. Januar 2027) en schrijft dat het EEG 2023 tot die dag anwendbar is, met een Nachfolgeregelung in het parlement. De "volgende stap op 1. Februar 2027" is daarom uit de kopij. Twee vondsten erbij: het installateursstuk zei tegen Bestandskunden dat hun vergoeding elk halfjaar daalt (onjuist: de satz hangt aan de inbedrijfname, § 25 EEG zahlt 20 jaar), en § 51a EEG beantwoordt de verlengingsvraag die het Heimspeicher-stuk openliet. Poort uitgebreid | klaar |
| J6 | Refresh: ES autoconsumo-cluster (RD 244/2019 ongewijzigd? compensatie-plafond) | es | Energy | `boe.es` voor de geconsolideerde tekst van RD 244/2019 (lees de gedateerde variant, `&p=<jjjjmmdd>&tn=1#a<artikel>`, want de geconsolideerde pagina wordt stil bijgewerkt); CNMC voor de vraag of er een gepubliceerd compensatietarief bestaat. Laatst gedraaid 2026-09-01 (PR #322): het antwoord op "ongewijzigd?" is nee — RD 244/2019 is per 22/03/2026 gewijzigd via RDL 7/2026 df 14, maar niet op de leden waar dit cluster op steunt, en dat is zelf de publiceerbare bevinding. Verder: de kernclaim dat je je overschot in Spanje niet verkoopt is onjuist (art. 13.4 plus art. 4.2.b: de andere modaliteit is een vrijwillige keuze), en de twee €/kWh-bereiken zijn bij de uitvoerder niet na te trekken. Bewaakt door `lib/autoconsumo.test.ts` | klaar |
| J7 | ETS2 stand van zaken: veiling gepland, eerste inlevering 2029 — wat je dit jaar wél moet regelen | nl | Logistics | NEa via `docs/claims.md`; de twee bestaande ETS2-artikelen. Het onderwerp hield stand zoals bedacht — anders dan bij J2, J3 en J4 was er geen bijstelling nodig. Bewaakt door `lib/ets2.test.ts`. PR #306, gemerged 2026-09-01 | live |
| J8 | EPBD IV: de trapsgewijze eisen na label D per 2030 | nl | Real estate | Rijksoverheid/RVO; bestaand EPBD-artikel | wacht |
| J9 | Vierde hospitality-artikel: nachtaudit als datamoment | en+de/es | Hospitality | sectorpagina-leaks; geen klantcijfers | wacht |
| J10 | Datastuk "tussen intake en offerte" | nl | Systems | `docs/datastuk.md` — **geblokkeerd tot de 27 intakevragen beantwoord zijn** | wacht |

## diazatlas.com — pillars/help/vs (bongartzdiaz/diaz-editor, alleen PR — mergen doet Juan)

| # | onderwerp | taal | soort | haak/bron | status |
| --- | --- | --- | --- | --- | --- |
| D1 | Refresh: prijsvermeldingen en meta's na de Founding-prijssweep (PR #651) nalopen met `landing/_check-seo-consistency.py` | alle | onderhoud | de poort zelf; ronde 2026-09-02: 820 paginas, 819 titels, 0 schendingen op vijf controles. Cross-pagina-controle erbij (geen twee pagina's delen een titel of description) die op zijn eerste run zes onvertaalde meta-descriptions vond; die zijn vertaald. Gemerged als bongartzdiaz/diaz-editor#658 (cfa2b65b, 2026-09-02 12:18 UTC). De pre-push-poort die hem tegenhield -- verify-edge-fn-slug-match las een verweesde .claude/worktrees-map van 2026-08-03 mee -- is gerepareerd in #657 (385e09b7, 12:05 UTC). Nagemeten op 2026-09-03, niet overgeschreven. Ronde 2026-09-14: 830 paginas, 829 titels, 2 schendingen meta-prijs op nl/blog/meterkast-schema-tekenen-offline.html (meta zei het Founding-bedrag, de cta-bar sinds #659 het Licentie-bedrag; de pagina sprak zichzelf tegen). Twee regels terug naar Founding, conform index.html, claims.md en B-07; daarna 0 schendingen. PR bongartzdiaz/diaz-editor#660, gemerged 2026-09-19. Pre-push-poort daar rood op verify-dependency-audit-budget (54 tegen budget 36, dependency-advisories, staat ook op main) -- niet van deze wijziging. Ronde 2026-09-25: 836 paginas, 835 titels, 21 schendingen index-url op nl/de/es index.html: canonical, og:url en hreflang wezen weer naar /nl/index enz. (308 naar /nl), live op productie. #651 had dat alleen in de uitvoer gerepareerd; de generator plakte de slug 'index' achter de taal en #695 (2026-09-23) zette de fout terug. Generator gerepareerd (_pagina_urls) en de drie bestanden terug naar de stand van 499c500c^; daarna 0 schendingen. PR bongartzdiaz/diaz-editor#710 | wachtrij |
| D2 | Pillar: van aanvraag naar offerte in 15 minuten — de werkvoorbereidings-workflow stap voor stap | nl | pillar | bestaande "15 minutes"-claim + help-artikelen; PR bongartzdiaz/diaz-editor#652, gemerged 2026-09-04 | live |
| D3 | Help-reeks: DXF aanleveren aan onderaannemers (lagen, schaal, wat er misgaat) | nl+en | help | bestaande DXF-export-docs in de repo; PR bongartzdiaz/diaz-editor#653, gemerged 2026-09-22 (a9195a7d7) | live |
| D4 | Pillar: thuisbatterij intekenen na saldering — kruisverwijzing met het juandiazllc-cluster | nl | pillar | bestaand pillar thuisbatterij-ontwerp-saldering-2027; PR bongartzdiaz/diaz-editor#654, gemerged 2026-09-04 | live |
| D5 | Nieuwe vs-pagina (welke concurrent?) | en+3 | vs | **eerst kiezen welke — bestaande 14 dekken de grote namen al** | wacht |
| D6 | Blog: NEN 1010-symbolenpack v0.4.22 uitgelegd met voorbeelden | nl | blog | de release zelf (v0.4.22 + v0.4.23); de NEN 1010-pillar noemt symbolen 0x, dus de tweede bron werd de bestaande EN-post + NL-elektro-posts; PR bongartzdiaz/diaz-editor#655, gemerged 2026-09-04 | live |

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
