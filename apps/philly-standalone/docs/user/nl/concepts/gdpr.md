---
slug: concepts/gdpr
lang: nl
title: Privacy & jouw gegevensrechten
summary: Selfservice export en accountverwijdering voor operators, plus de admin-led betrokkenenflow voor contacten.
tags: [concepts, gdpr, privacy, data-rights, security]
related: [onboarding/create-organization, concepts/tenancy, features/gdpr]
updated: 2026-04-25
---

# Privacy & jouw gegevensrechten

Philly levert AVG-conforme tooling out-of-the-box. Twee flows
bestaan:

1. **Selfservice** — voor jou, de operator. Exporteer je
   accountdata of plan verwijdering van je account. Geen admin
   nodig.
2. **Admin-led** — voor contacten / vrijwilligers / gasten die
   *door* een organisatie zijn opgeslagen. Een admin verwerkt het
   verzoek namens de org als verantwoordelijke.

## Selfservice: exporteer je data

Artikel 15 AVG (recht op inzage).

- Endpoint: `GET /api/me/data-export`
- Retourneert: JSON-download van elk record dat de CRM over jou
  bewaart — je `User`-rij, je geschreven notities, je
  activiteitsgeschiedenis, je auditlog-entries enz. Geheime
  velden (`passwordHash`, `twoFactorSecret`, OAuth-tokens) zijn
  geredigeerd voor de veiligheid; de rest is jouw data verbatim.
- Rate-limited tot 5 exports per maand per gebruiker.
- Audit-logged: een `GdprExportLog`-rij registreert dat een export
  plaatsvond, met een SHA-256 hash van je e-mail (zodat het bewijs
  de eventuele verwijdering van je account overleeft, zonder de
  e-mail zelf te bewaren).

Trigger vanaf het dashboard via je profielmenu, of `curl` direct
met je session cookie.

## Selfservice: verwijder je account

Artikel 17 AVG (recht op gegevenswissing).

- `POST /api/me/account-deletion {confirm: "DELETE"}` plant je
  account voor verwijdering over **30 dagen**. Tijdens de
  bedenktijd:
  - Kun je nog steeds inloggen en de CRM normaal gebruiken.
  - Kun je de geplande verwijdering op elk moment annuleren via
    `DELETE /api/me/account-deletion`.
- Na 30 dagen verwijdert de nachtelijke retention cron
  (`/api/cron/gdpr-retention`) hard je `User`-rij. Cascade-delete
  regelt automatisch `ContactNote`, `Activity`,
  `TwoFactorRecoveryCode` en vergelijkbare children.
- Een `GdprErasureLog`-rij registreert de wissing met een hash
  van je e-mail — bewijs voor een toezichthouder dat we het
  verzoek hebben verwerkt, voor onbepaalde tijd bewaard.
- **Last-admin protectie**: als je de enige admin in je
  organisatie bent, weigert het systeem je verwijdering te
  plannen met `409 Conflict`. Promoot eerst een andere
  teamgenoot, anders zou de org wees-achterblijven.

## Admin-led: betrokkenenverzoek inzage (DSAR)

Wanneer een contact, vrijwilliger, gast of andere derde in je
organisatie vraagt "welke data hebben jullie over mij?", verwerkt
de admin het via:

- `POST /api/admin/gdpr/data-subject-export` met `{email, reason?}`
- Retourneert: JSON-download van elke rij over alle
  PII-bevattende tabellen die naar dat e-mailadres verwijzen —
  binnen jouw organisatie. Cross-tenant data wordt nooit
  geretourneerd.

Het verzoek is rate-limited (10 per uur per admin) en gelogd met
de actor en de SHA-256 van het e-mailadres van de betrokkene.

## Admin-led: betrokkenenwissing

Wanneer een contact vraagt "verwijder alles wat jullie over mij
hebben":

- `POST /api/admin/gdpr/data-subject-erasure` met
  `{email, reason, confirm: "ERASE"}`
- Het reason-veld is **verplicht** — Artikel 30 record-keeping
  vereist dat de verantwoordelijke documenteert waarom een
  wissing is verwerkt.
- Hard-deletes elke PII-rij die naar dat e-mailadres verwijst
  (Contact, Reservation, Volunteer, OpenHouseVisit, Message,
  ESignature, CallLog, SmsMessage). Cascade-deletes regelen
  children (ContactNote, Activity).
- Een `GdprErasureLog`-rij registreert de wissing met een SHA-256
  hash van het e-mailadres en de per-model rij-aantallen. **Voor
  onbepaalde tijd bewaard** — het bewijs moet de data zelf
  overleven.

Als de proof-of-erasure log niet kan worden weggeschreven (DB-fout
enz.), retourneert het endpoint een 500 in plaats van 200. Zonder
die log entry zouden we de wissing niet aan een toezichthouder
kunnen bewijzen, wat zelf een breach zou zijn.

## Verwerkingsregister (Artikel 30)

Het volledige register van elke verwerkingsactiviteit die Philly
uitvoert leeft op `lib/gdpr/ropa.ts` en wordt voor admins
gerenderd op `/gdpr`. Het documenteert:

- Welke activiteiten we draaien (operatorauthenticatie,
  contactbeheer, hospitality-reserveringen, enz.)
- De rechtsgrondslag voor elk (Art. 6(1)(b) overeenkomst, (1)(f)
  gerechtvaardigd belang, (1)(c) wettelijke verplichting, enz.)
- Categorieën van betrokkenen
- Datacategorie en bewaartermijn
- Ontvangers en eventuele doorgiftes naar derde landen
- Technische en organisatorische beveiligingsmaatregelen

Dit is het document dat een toezichthouder zou opvragen onder
Artikel 30.

## Privacyverklaring & cookieverklaring

Beide leven in `docs/legal/`:

- `PRIVACY-NOTICE.md` — de Artikel 13/14 verklaring template, klaar
  om aan te passen aan de naam van je rechtspersoon.
- `COOKIE-POLICY.md` — de audit van elke cookie die de CRM zet.
  Spoiler: alleen strikt-noodzakelijk, geen banner nodig.

## Datalekrespons

`docs/legal/BREACH-RESPONSE.md` is het on-call-runbook voor een
vermoed persoonsgegevenslek: triage, onderzoek, melding aan de
toezichthoudende autoriteit binnen 72 uur (Art. 33), melding aan
betrokken betrokkenen wanneer het risico hoog is (Art. 34), en
schrijven van een post-incident review.

## Waar verder

- **[GDPR-adminpagina](features/gdpr)** — de UI die admins
  gebruiken om DSARs te verwerken.
- **[Tenancy & data-isolatie](concepts/tenancy)** — waarom
  cross-tenant DSARs onmogelijk zijn.
- **[Auditlog](features/audit)** — het forensische record dat
  alles bovenstaand onderbouwt.
