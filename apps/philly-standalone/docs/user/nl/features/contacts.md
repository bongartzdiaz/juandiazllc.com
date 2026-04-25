---
slug: features/contacts
lang: nl
title: Contacten
summary: De contacten-pagina — grid, zoeken, filterpillen, AI-autoverrijking, de detailpagina met tabs voor activity / notities / projecten / deals.
tags: [features, contacts, crm-core]
related: [onboarding/first-contact, features/ai-attributes, features/deals, concepts/gdpr]
updated: 2026-04-25
---

# Contacten

De pagina `/contacts` is de primaire gids voor iedereen waarmee
je organisatie zaken doet. Het datamodel is hetzelfde over
sectoren heen; alleen de type-pill labels veranderen (donor vs
buyer vs guest enz. — zie [pick-industry](onboarding/pick-industry)).

## De pagina-layout

- **KPI-strip** bovenaan — totaal aantal contacten, plus 3
  sectorspecifieke tellingen (bv. partners / donors / stakeholders
  voor filantropie).
- **Toolbar** met vrije-tekst zoeken + type-filter pillen. Zoeken
  matcht over naam, e-mail en bedrijf. Filter selecties worden
  in de URL gereflecteerd zodat je een gefilterde view kunt
  delen.
- **Grid van contactkaarten** — 3 per rij op desktop, 1 op
  mobiel. Elke kaart toont avatar (initialen), naam, bedrijf,
  e-mail, telefoon en projectaantal.

Het grid rendert synchroon in vastgoed / hospitality modi
(demo data); in filantropie modus haalt het live data en toont
een "Loading contacts…" banner boven het grid terwijl de API
in vlucht is.

## Een contact aanmaken

Klik **+ New contact** in de topbar (alleen admins + managers).
Vul in: naam (verplicht), e-mail, telefoon, type, bedrijf,
notities.

Bij submit:

1. Het contact wordt opgeslagen + verschijnt in het grid.
2. **AI-autoverrijking** start op de achtergrond (als
   `ANTHROPIC_API_KEY` is gezet) — Claude leidt industry, ICP-fit
   score (0–100), en een één-regel summary af van naam +
   bedrijf + e-maildomein. De kaart toont een kleine spinner
   tot de aanroep terugkomt; status flipt van `pending` naar
   `complete`.
3. **Realtime broadcast** — elke andere geopende dashboard-tab
   in je org ververst de contactlijst.
4. **Auditlog-entry** — `entity: contact, action: create`.

## Bulk-import

`/contacts` heeft ook een CSV-upload (alleen admins + managers).
Vereiste kolommen matchen het create-formulier. Elke
geïmporteerde rij doorloopt dezelfde autoverrijking, gethrottled
op ~10/sec om onder de AI-rate limit te blijven.

Validatie: lege e-mails worden geaccepteerd (default `""`); lege
namen weigeren de rij; dubbele e-mails worden geweigerd (de
contacts-tabel behandelt e-mail als soft-uniek binnen een org).

## De contact-detailpagina

Klik op een willekeurige kaart → `/contacts/[id]`. Layout:

- **Header-kaart** — avatar, naam, bedrijf, type-badge,
  edit/save/cancel-knoppen, type-kleur achtergrond.
- **Tabs** — Overview | Activity | Emails | Notes | Projects | Deals
- **Overview-tab** — basisvelden (e-mail, telefoon, bedrijf,
  notities) + AI-attribuut display (industry, ICP-score,
  summary).
- **Activity-tab** — elke interactie gelogd tegen dit contact:
  notities toegevoegd, deals gekoppeld, e-mails verstuurd,
  belletjes gepleegd.
- **Emails-tab** — Gmail-gesyncte berichten waar het e-mailadres
  van dit contact het from- of to-adres is.
- **Notes-tab** — operator-geschreven timestamped notities;
  quick-add formulier bovenaan.
- **Projects-tab** — projecten waarmee dit contact verbonden is.
- **Deals-tab** — deals waar dit contact de gekoppelde
  tegenpartij is.

## Inline editing

In de header, klik **Edit** om te switchen naar inline-edit
modus. Velden worden bewerkbaar; de Save-knop toont een spinner
tijdens de PATCH en is uitgeschakeld om dubbel-versturen te
voorkomen. Cancel maakt ongedaan.

Edit-modus is alleen voor admin + manager; viewers zien de data
maar geen edit-affordance.

## Zoeksemantiek

De vrije-tekst zoekopdracht in de toolbar:

- Matcht contains-stijl (case-insensitive) over naam, e-mail
  en bedrijf
- Debounced (250ms) zodat niet elke toetsaanslag de API raakt
- URL-state — `?q=jane&type=donor` reflecteert de huidige
  filters

Gecombineerde filters werken additief: type-pill `donor` +
zoekopdracht `acme` retourneert donors bij bedrijven die
matchen met "acme".

## Privacy & retentie

Contactdata is PII (zie [concepts/gdpr](concepts/gdpr)):

- Gescoped op je organisatie; andere orgs kunnen het nooit zien.
- Retentie default: 3 jaar vanaf laatste betekenisvolle update —
  configureerbaar per rij's auto-purge in
  `lib/gdpr/pii-registry.ts`.
- Onderhevig aan admin-led data-subject erasure als het contact
  daarom vraagt. De `/gdpr` admin-pagina verwerkt het verzoek —
  vindt elke rij die het e-mailadres refereert over Contact,
  Reservation, Volunteer, CallLog, SmsMessage enz., hard-delete
  ze, en schrijft een proof-of-erasure log entry.

## Waar verder

- **[Voeg je eerste contact toe](onboarding/first-contact)** —
  de walkthrough.
- **[AI contact attributes](features/ai-attributes)** — de
  autoverrijking die draait na create.
- **[Deals](features/deals)** — koppel contacten aan
  opportuniteiten in beweging.
- **[GDPR admin](features/gdpr)** — verwerk
  betrokkenenverzoeken voor contacten.
