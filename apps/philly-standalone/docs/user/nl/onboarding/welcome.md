---
slug: onboarding/welcome
lang: nl
title: Welkom bij Philly CRM
summary: Wat de CRM doet, voor wie het bedoeld is, en het pad in vijf minuten van de eerste login naar een werkende tenant.
tags: [onboarding, getting-started, overview]
related: [onboarding/create-organization, onboarding/invite-team, concepts/tenancy]
updated: 2026-04-25
---

# Welkom bij Philly CRM

Philly is een operator-first CRM. Het centraliseert het werk van een
kleine of middelgrote organisatie — je contacten, je deals, je
projecten, je inbox, je agenda — en voegt de integraties en AI-tools
toe die ruwe data omzetten in actie.

## Voor wie is het

Philly bedient drie sectoren vanuit één codebase:

- **Filantropie** — partners, donateurs, begunstigden, stakeholders, subsidies, impactmetrics.
- **Vastgoed** — kopers, verkopers, panden, listings, transacties, commissies.
- **Hospitality** — gasten, reserveringen, kamers, leveranciers, personeel.

Het dashboard past zich automatisch aan de geselecteerde sector aan.
De meeste pagina's bestaan in alle drie de modi; een handvol is
sector-specifiek.

## Wat krijg je op dag één

- Een multi-tenant database waarin elk record gescoped is op je
  organisatie. Andere organisaties kunnen jouw data nooit zien.
- Rolgebaseerde toegang (admin / manager / viewer) met een
  per-sectie allow-list — je kunt een viewer toegang geven tot
  "deals" maar "auditlog" verbergen.
- Een volledig audit-spoor van wie-wat-deed, met cryptografische
  manipulatiebestendigheid (artikel 30 AVG record-keeping).
- Selfservice AVG-tooling — operators kunnen hun eigen account
  exporteren of verwijderen; admins kunnen
  betrokkenenverzoeken voor contacten verwerken.
- Een complete privacy-houding: geen analytische cookies, geen
  fingerprinting, geen externe trackers. De CRM werkt zonder
  cookie-consent banner.

## Setup in vijf minuten

Een gloednieuwe login doorloopt `/onboarding`:

1. **Log in** met je e-mailadres op de brand-site (Supabase auth).
2. **Maak je organisatie aan** — kies een naam; je wordt admin.
3. **Nodig je team uit** — admin → `/settings/users` → e-mail + rol.
4. **Kies je sector** — instellingen → `industry` (filantropie / vastgoed / hospitality).
5. **Voeg je eerste record toe** — een contact, een deal, een project, een pand — wat je als eerste zou aanpakken.

Dat is het. De rest van deze gids loopt elk van die stappen
gedetailleerd door en linkt naar feature-docs onderweg.

## Waar verder

- **[Maak je organisatie aan](onboarding/create-organization)** — de allereerste stap bij de eerste login.
- **[Nodig je team uit](onboarding/invite-team)** — pre-creëer teamgenoten zodat ze bij hun eerste login in jouw org belanden.
- **[Rollen & rechten](concepts/roles)** — admin vs manager vs viewer, plus de per-sectie allow-list.
- **[Tenancy & data-isolatie](concepts/tenancy)** — hoe de CRM jouw data gescheiden houdt van andere organisaties.
- **[Je privacy & gegevensrechten](concepts/gdpr)** — de selfservice "Exporteer mijn data" en "Verwijder mijn account" flows.

Als je vastloopt, kan de assistent rechtsonder vragen over elke
feature in gewone taal beantwoorden.
