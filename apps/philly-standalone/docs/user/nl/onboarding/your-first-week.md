---
slug: onboarding/your-first-week
lang: nl
title: Je eerste week
summary: Een dag-voor-dag checklist die een gloednieuwe admin in vijf werkdagen van nul naar een volledig ingerichte CRM brengt.
tags: [onboarding, getting-started, admin, checklist]
related: [onboarding/welcome, onboarding/create-organization, onboarding/invite-team, onboarding/first-contact]
updated: 2026-04-25
---

# Je eerste week

Dit is een vijfdaagse checklist. Hij gaat ervan uit dat je de
eerste admin bent in een gloednieuwe organisatie. Niets ervan is
verplicht — maar als je dit volgt, zit je aan het eind in een
positie waarin de CRM echt werk voor je doet in plaats van leeg
te staan.

## Dag 1 — bootstrap de tenant

- [ ] Log in op de brand-site met je admin-e-mailadres.
- [ ] Voltooi `/onboarding` — geef je organisatie een naam, kies
      een weergavenaam. Je wordt admin.
- [ ] Ga naar `/settings` → kies je sector
      ([filantropie / vastgoed / hospitality](onboarding/pick-industry)).
- [ ] Open `/api/health` in de browser. Verwacht 200 + een
      database-check onder 100ms. Krijg je 503, dan zijn de
      DB-env-vars niet gezet — fix dat eerst.

**Eind dag 1**: tenant bestaat, jij bent admin, env is gezond.

## Dag 2 — nodig je team uit

- [ ] `/settings/users` → nodig elke teamgenoot uit per
      e-mailadres. Kies de juiste rol:
      - Admin voor wie gebruikers moet uitnodigen / bewerken
      - Manager voor het operationele team (sales, ops, comms)
      - Viewer voor bestuursleden, auditors, read-only execs
- [ ] Beslis over per-sectie beperkingen waar nuttig — bv.
      bestuursleden hebben meestal alleen `dashboard`,
      `reports`, `impact` nodig. Stel hun `dashboardSections`
      navenant in.
- [ ] Laat ten minste één teamgenoot succesvol inloggen, zodat
      je de uitnodigingsflow end-to-end hebt geverifieerd.

**Eind dag 2**: team kan inloggen. Iedereen ziet de juiste
sidebar.

## Dag 3 — zet je dataschap op

- [ ] `/settings/pipelines` → bekijk de standaard pipeline voor
      je sector. Hernoem stages om te matchen met je werkelijke
      sales-/donor-/booking-proces. Voeg een tweede pipeline toe
      als je verschillende flows hebt (bv. "Major gifts" vs
      "Recurring donors").
- [ ] Als je vastgoed of hospitality bent:
      - `/settings/property-taxonomy` → pas districten,
        property-types en flags aan voor jouw markt.
- [ ] Beslis hoe je taken bijhoudt. De meeste teams gebruiken:
      - `/calendar` voor geplande events + meetings
      - Activity-entries op contacten voor ad-hoc follow-ups
      - `/automations` voor terugkerende "if X then create task"
        regels

**Eind dag 3**: pipelines + taxonomie matchen hoe je team
daadwerkelijk werkt.

## Dag 4 — verbind externe tools

- [ ] `/integrations` → verbind ten minste één van:
      - Google (Gmail + Calendar) — voedt `/email` en `/calendar`
      - Twilio (SMS + WhatsApp) — voedt `/sms`
      - DocuSign / HelloSign — voedt `/e-signatures` en
        `/transactions`
- [ ] Genereer een API-key in `/settings/api-keys` als je
      externe tools hebt die programmatisch CRM-data moeten
      lezen/schrijven (Zapier, n8n, eigen scripts).
- [ ] Stel een webhook in op `/settings/webhooks` als je
      CRM-events naar Slack, Discord of een eigen endpoint wilt
      pushen.

**Eind dag 4**: externe tools zijn aangesloten. Inkomende
e-mail en agenda-events stromen automatisch de CRM in.

## Dag 5 — laad echte data + eerste automatisering

- [ ] Bulk-importeer je contacten via `/contacts` → CSV-upload.
      Match de kolommen aan de formuliervelden; AI-auto-
      verrijking vult industry / ICP-fit / summary op de
      achtergrond.
- [ ] Maak een paar echte deals aan in `/deals` zodat je ze ziet
      stromen op het [kanban-board](features/kanban).
- [ ] Bouw je eerste automatisering in `/automations`. Veel
      voorkomende starter-rules:
      - "Stage = stale (geen update in 14 dagen) → e-mail de
        deal-eigenaar"
      - "Nieuw contact getagd 'donor' → voeg toe aan mailing
        list"
      - "Deal-waarde > €10.000 → notify Slack"

**Eind dag 5**: echte data staat erin. De CRM doet automatisch
werk voor je.

## Voorbij week 1

Eenmaal voorbij de basics:

- **Stel de AI-assistent in** als je dat nog niet hebt gedaan
  — de in-app chat op `/assistant` weet hoe elke feature werkt
  en beantwoordt vragen in gewone taal. Operator-setup staat
  in `docker/ollama/README.md`.
- **Bekijk je auditlog wekelijks** — `/audit` toont elke mutatie
  in je tenant. Verifieer maandelijks dat de
  [hash-chain](features/audit) intact is op
  `/api/admin/audit/verify`.
- **Doe een AVG-oefening** — pak het echte e-mailadres van een
  contact, doorloop de `/gdpr`-admin export + erasure flows op
  een testkopie. Je wilt vertrouwen hebben in de procedure
  voordat een echt verzoek binnenkomt.

## Waar verder

- **[Rollen & rechten](concepts/roles)** — diepe duik in wat
  elke rol kan.
- **[Tenancy & data-isolatie](concepts/tenancy)** — hoe Philly
  jouw data gescheiden houdt van andere organisaties.
- **[AVG selfservice](concepts/gdpr)** — operator- en
  admin-led data-rights flows.
