# Tier-1 pitches — verzendklaar op cijfers na (2026-07)

Vier pitch-drafts per `docs/pitch-template.md`, één per Tier-1-target
uit `SEO.md`. Taal per publicatie. Bodies ≤200 woorden.

**⚠️ Vóór verzenden — harde regel:** elke `[VUL IN: …]` moet een ÉCHT
cijfer worden uit eigen data (Supabase, Plausible zodra live, Voltafy,
HMB). Een field report met verzonnen cijfers is reputatie-zelfmoord bij
precies de redacties die we willen. Geen echt cijfer beschikbaar → die
pitch niet versturen, eerst data verzamelen.

**Verzend-checklist per pitch:**
1. Cijfers ingevuld + zelf gecontroleerd tegen de bron
2. Editor-naam opgezocht (2 min, links hieronder)
3. Verstuurd vanaf juan@juandiazllc.com (persoonlijk, geen nieuwsbrief-tool)
4. Datum in de tracking-tabel onderaan gezet
5. Follow-up na 7 dagen (template onderaan), daarna loslaten

---

## 1. Solar Magazine NL — Nederlands

**Aan:** tip-formulier op solarmagazine.nl ("Tip de redactie") óf
editor-naam via over-ons-pagina — [VUL IN: naam]
**Onderwerp:** `Field report: [VUL IN: N] rekensessies — zo schatten zonneigenaren de saldering-afbouw in`

> Hoi [naam],
>
> Ik run Juan Diaz, LLC — ik bouw software voor energie-operators,
> waaronder salderingsregeling2027.nl (publieke uitleg-site over de
> afbouw) en een ROI-rekentool die drie scenario's doorrekent:
> vóór 2027, ná 2027 zonder batterij, ná 2027 mét. De afgelopen
> [VUL IN: periode] leverde dat [VUL IN: N] rekensessies op van
> echte huiseigenaren — inclusief de aannames waarmee ze rekenen.
>
> Ik wil voor Solar Magazine een stuk schrijven: **"Wat [N]
> rekensessies vertellen over hoe zonneigenaren 2027 inschatten"** —
> waar de inschattingen van eigenaren structureel afwijken van de
> uitkomst, en wat installateurs daarmee moeten in hun adviesgesprek.
>
> Het stuk bevat:
> - [VUL IN: datapunt 1 — bijv. mediaan-eigenverbruik dat mensen invullen vs. realistisch]
> - [VUL IN: datapunt 2 — bijv. % sessies waarin batterij-terugverdientijd verkeerd wordt ingeschat]
> - één tabel uit eigen data ([VUL IN: welke])
> - één ding dat niet werkte: [VUL IN: eerlijke miss, bijv. aanname in het model die ik moest corrigeren]
>
> Ik pitch geen product. Ik vermeld de databron onderaan met één link
> naar mijn werkpagina — geen productvermeldingen in de tekst.
>
> Richtlengte: 1.000-1.200 woorden. Concept binnen 5 werkdagen.
>
> Groet,
> Juan Diaz
> https://juandiazllc.com/nl/about
> https://juandiazllc.com/nl/insights

---

## 2. PV Magazine DE — Duits

**Aan:** redactie via pv-magazine.de/impressum — [VUL IN: naam + adres]
**Betreff:** `Feldbericht: Was das niederländische Saldering-Aus deutsche Installateure lehrt`

> Guten Tag [Name],
>
> ich führe Juan Diaz, LLC — wir bauen Software für Energie-Betreiber
> im niederländischen Markt, darunter ein öffentliches Informations-
> portal zum Ende der Saldering-Regelung (des niederländischen
> Net-Metering) zum 1. Januar 2027 und ein Rechenmodell, das
> Haushalte durch drei Szenarien führt. Daraus liegen mir
> [VUL IN: N] reale Berechnungen niederländischer Anlagenbetreiber
> vor — mit ihren Annahmen zu Eigenverbrauch, Einspeisevergütung
> und Speicher-Amortisation.
>
> Ich möchte für pv magazine einen Beitrag schreiben: **„Das
> niederländische Net-Metering endet 2027 — was die Daten für den
> deutschen Residential-Markt bedeuten"** — die Niederlande sind das
> Live-Experiment für eine Frage, die mit sinkender EEG-Vergütung
> auch hier ansteht: Was machen Betreiber, wenn Einspeisen sich
> nicht mehr rechnet?
>
> Der Beitrag enthält:
> - [VUL IN: Datenpunkt 1 — z. B. Verteilung der Eigenverbrauchsquoten]
> - [VUL IN: Datenpunkt 2 — z. B. Speicher-Break-even mit/ohne Saldering]
> - eine Tabelle aus eigenen Daten, klar getrennt nach Residential/Commercial
> - was nicht funktioniert hat: [VUL IN: ehrlicher Fehlschlag]
>
> Ich pitche kein Produkt. Datenquelle wird am Ende offengelegt,
> eine Verlinkung genügt — keine Produktnennungen im Text.
>
> Zielumfang: 1.200-1.600 Wörter. Entwurf innerhalb einer Woche;
> gern auf Englisch zur Übersetzung durch Ihre Redaktion.
>
> Beste Grüße,
> Juan Diaz
> https://juandiazllc.com/de/about

---

## 3. Tweakers.net — Nederlands

> **Angle-wissel (2026-07-15):** de oorspronkelijke omvormer-
> normalisatie-angle is geschrapt na een code-audit — er bestaan géén
> omvormer-merk-API-integraties in de Voltafy/PT-repos (de site-copy
> daarover is aspirationeel). Deze versie draait op het systeem dat
> wél draait: de 2Solar-sync-pipeline van PerformanceTracker.
> Technische feiten hieronder komen uit
> `Mr Diaz - PerformanceTracker/10-Projecten/.../project_2solar_integratie_plan.md`
> en de sync-SOP's — verifieerbaar, niet verzonnen.

**Aan:** redactie@tweakers.net
**Onderwerp:** `Lead-sync bouwen op een CRM-API zonder gedocumenteerde rate limits — architectuur + missers`

> Hoi redactie,
>
> Ik bouw software voor Nederlandse zonne-installateurs, waaronder een
> klantreis-pipeline die leads en projectstatussen synchroniseert met
> 2Solar — het CRM dat een groot deel van de Nederlandse solar-sector
> draait, met een API waarvan de rate limits nergens gedocumenteerd
> staan. De pipeline draait sinds [VUL IN: maand] in productie en
> verwerkte tot nu toe [VUL IN: N] projecten.
>
> Ik wil voor Tweakers een technisch stuk schrijven: **"Betrouwbaar
> syncen met een API die je niet vertrouwt: dead-letter queues en
> gap-detectors op Supabase"**. Geen "wij gebruikten AI"-verhaal; ik
> schreef de code zelf en laat de architectuur zien.
>
> Het stuk bevat:
> - de reliability-laag: uurlijkse sync-cron + gap-detector, retry-cron
>   elke 15 minuten, dagelijkse integriteitscheck en een dead-letter-
>   tabel voor events die na retries blijven falen
> - omgaan met ongedocumenteerde limits: conservatief plafond,
>   monitoren, en een permissie-401 op het person-endpoint die het
>   ontwerp veranderde
> - identity-matching in de praktijk: telefoonnummer-normalisatie naar
>   +31, waarom telefoon wint van e-mail, en de edge-cases daarvan
> - de stack-keuze: Supabase (Postgres + edge functions + pg_cron) in
>   plaats van een aparte queue-service — en waar dat begint te knellen
> - wat niet werkte: [VUL IN: eerlijke miss — bijv. de DLQ-rate of een
>   sync-gap-incident uit de logboeken]
>
> 2Solar wordt feitelijk en neutraal beschreven, geen productpromotie;
> databron onderaan vermeld met één link.
>
> Richtlengte: 1.000-1.400 woorden. Concept binnen een week.
>
> Groet,
> Juan Diaz
> https://juandiazllc.com/nl/about
> https://juandiazllc.com/nl/insights

**Resterende [VUL IN]'s — waar te vinden (2 min, HMB-Supabase dashboard):**
- productie-sinds: eerste run van `sync-twosolar-hourly` (cron-historie of oudste rij)
- N projecten: `select count(*) from solar_requests` (of de synced-projects-tabel)
- eerlijke miss: DLQ-aantal (`client_events_dlq`) of een incident uit de sync-logboeken in de PT-vault

---

## 4. El Confidencial (tecnología) — Spaans

**Aan:** tecnologia@elconfidencial.com
**Asunto:** `El fin del net metering holandés: datos reales de [VUL IN: N] hogares con placas`

> Hola [nombre],
>
> Dirijo Juan Diaz, LLC — construimos software para operadores de
> energía en el mercado holandés, incluida una web pública que explica
> el fin del "saldering" (el net metering holandés) el 1 de enero de
> 2027, y una calculadora que compara tres escenarios para hogares con
> placas. Eso me deja [VUL IN: N] cálculos reales de propietarios
> holandeses, con sus supuestos de autoconsumo y amortización de
> baterías.
>
> Me gustaría escribir para El Confidencial: **"Holanda apaga su net
> metering en 2027: qué pasa cuando desaparece la compensación"** —
> un experimento en vivo relevante para el debate español sobre
> autoconsumo y compensación de excedentes, con datos en vez de
> opiniones.
>
> La pieza incluiría:
> - [VUL IN: dato 1 — p. ej. distribución de autoconsumo real vs. supuesto]
> - [VUL IN: dato 2 — p. ej. amortización de batería con y sin compensación]
> - una tabla construida con datos propios
> - algo que no funcionó: [VUL IN: fallo honesto del modelo]
>
> No es un pitch de producto: la fuente de los datos se indica al
> final con un solo enlace, sin menciones comerciales en el texto.
>
> Extensión: 1.200-1.500 palabras. Borrador en una semana.
>
> Un saludo,
> Juan Diaz
> https://juandiazllc.com/es/about

**NB bij deze pitch:** El Confidencial prefereert Spaanse installatie-
data (zie cheat sheet). De NL-als-experiment-framing ondervangt dat,
maar dit is de zwakste van de vier. Optie: bewaren tot er échte
ES-datapunten zijn (Iberische netwerk-contacten), of expliciet als
buitenland-analyse laten staan.

---

## Follow-up (na 7 kalenderdagen, één keer)

NL:
> Hoi [naam], korte follow-up op de field-report-pitch van [datum].
> Geen fit? Ook prima — dan weet ik dat hij is aangekomen. Groet, Juan

DE:
> Guten Tag [Name], kurzes Nachfassen zum Feldbericht-Pitch vom
> [Datum]. Falls es nicht passt, genügt ein kurzes Nein. Beste Grüße, Juan

ES:
> Hola [nombre], un breve seguimiento sobre la propuesta del [fecha].
> Si no encaja, con saberlo me vale. Un saludo, Juan

---

## Tracking

| Publicatie | Pitch verstuurd | Follow-up | Reactie | Status |
|---|---|---|---|---|
| Solar Magazine NL | — | — | — | cijfers nodig |
| PV Magazine DE | — | — | — | cijfers nodig |
| Tweakers.net | — | — | — | angle herschreven op 2Solar-pipeline; 3 cijfers uit HMB-Supabase nodig |
| El Confidencial | — | — | — | zwakste — evt. bewaren |

**Data-bronnen om de `[VUL IN]`-cijfers te halen:**
- ROI-calculator-sessies: Plausible events zodra `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` live is (zie master-todo) — tot die tijd is er géén sessie-telling, dus pitches 1/2/4 kunnen pas ná die env-var + een paar weken data
- Voltafy: omvormer-integraties + installatie-aantallen uit eigen administratie
- HMB: huishoudens-intakes uit Supabase
- salderingsregeling2027.nl: bezoek/gebruik zodra analytics daar meet
