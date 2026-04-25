---
slug: features/automations
lang: nl
title: Automatiseringen
summary: Trigger-gebaseerde regels die afgaan op entity-events — taken aanmaken, e-mails versturen, webhooks posten, velden bijwerken. Alleen-admin configuratie.
tags: [features, automations, rules, admin]
related: [features/deals, features/settings-webhooks, features/integrations]
updated: 2026-04-25
---

# Automatiseringen

Trigger-gebaseerde regels. Wanneer iets gebeurt in de CRM (een
deal verschuift van stage, een contact wordt aangemaakt, een
project bereikt een milestone), evalueert de
automatiseringsengine elke ingeschakelde regel en draait de
matchende acties.

`/automations` — alleen admin. Managers + viewers zien niets.

## De regelvorm

Elke regel is `trigger → voorwaarden → acties`:

- **Trigger** — wat de regel start. Voorbeelden:
  - `deal.stage_changed` — gaat af wanneer de stage van een deal verandert
  - `deal.value_threshold` — gaat af wanneer waarde een drempel overschrijdt
  - `contact.created` — gaat af op nieuw contact
  - `contact.tagged` — gaat af bij tag toevoegen/verwijderen
  - `project.milestone_completed`
  - `task.overdue`
  - `email.received` — wanneer Gmail-sync een matchend bericht ingest
- **Voorwaarden** — optionele filters. AND-gecombineerd. Voorbeelden:
  - `deal.pipeline = "Major Gifts"`
  - `deal.value >= 10000`
  - `contact.type = "donor"`
- **Acties** — wat te doen. Een of meer, in volgorde uitgevoerd:
  - `create_task` — voegt een Activity van type "task" toe aan een record
  - `send_email` — verstuurt vanaf een verbonden e-mailaccount
  - `post_webhook` — POST naar een geregistreerde webhook
  - `update_field` — patcht een veld op het triggerende record
  - `notify_user` — maakt een in-app notificatie
  - `tag_contact` — voegt een tag toe/verwijdert

## Een regel bouwen

`/automations` → **+ New rule**. Modal opent met:

1. **Naam** — vrije tekst; verschijnt in auditlog.
2. **Trigger** — kies uit dropdown.
3. **Voorwaarden** — leeg by default. Klik "+ Condition" om
   field-value paren toe te voegen. Field-opties zijn gescoped
   op de entity van de trigger.
4. **Acties** — minstens één vereist. Elke actie heeft een eigen
   formulier (bv. send_email vraagt om from-account,
   to-template, subject template, body template).
5. **Ingeschakeld** — toggle. Nieuwe regels staan default aan.

Save. De regel verschijnt in de lijst; de engine pikt het op bij
het volgende matchende event.

## Run-historie

Elke regel-rij toont:

- **Total runs** — levensduur
- **Last run** — timestamp
- **Status** — uitkomst van laatste run (ok / partial / failed)

Klik een regel om de run-log uit te klappen: chronologische
lijst van elke afgang, met het triggerende record's id,
voorwaarderesultaten en actie-uitkomsten.

De engine probeert mislukte acties tot 3 keer met exponential
backoff. Na 3 fouten wordt de actie permanent gemarkeerd als
mislukt en gaat de regel verder met volgende acties.

## Templates

Actievelden zoals e-mail subject + body ondersteunen
handlebars-stijl templates met de velden van het triggerende
record:

```
Subject: Deal {{deal.title}} verplaatst naar {{deal.stage}}
Body:    Hi {{deal.owner.name}}, de deal "{{deal.title}}" is
         net verplaatst naar stage {{deal.stage}}. Gekoppeld
         contact: {{deal.contact.name}}.
```

Beschikbare variabelen hangen af van de trigger. De
variable-picker van het formulier (klein `{}` icoon naast het
veld) toont wat beschikbaar is.

## Veelvoorkomende starter-rules

Drie regels die bijna elke org wil:

1. **Stale-deal nudge** — trigger `deal.no_update_in`, dagen = 14,
   actie `notify_user` naar de deal-eigenaar.
2. **High-value Slack ping** — trigger `deal.value_threshold`,
   threshold = €10.000, actie `post_webhook` naar een Slack
   incoming webhook.
3. **New-donor welcome** — trigger `contact.created`,
   voorwaarde `contact.type = "donor"`, actie `send_email`
   met een welkomsttemplate.

## Een regel uitschakelen

Toggle de "Enabled"-switch. De regel blijft in de lijst maar
de engine slaat hem over. Vroegere runs zijn behouden.

## Auditlog

Elke create, edit, enable/disable, en delete op een regel
schrijft een auditlog-entry. Elke regel-afgang schrijft ook een
`automationLog`-rij die zichtbaar is in de run-historie.

## Limieten

- Max 50 ingeschakelde regels per organisatie (zacht plafond;
  in config te verhogen indien nodig).
- Elke regel is rate-limited op 100 runs per uur per
  organisatie. Daarboven worden runs gedropt om weglopen-loops
  te voorkomen (bv. een automatisering die zichzelf triggert).
- Actieketens zijn gemaximaliseerd op 10 acties per regel.

## Waar verder

- **[Deals](features/deals)** — de meest voorkomende
  automatiserings-triggerbron.
- **[Webhooks](features/settings-webhooks)** — outbound
  webhook-configuratie voor de `post_webhook`-actie.
- **[Integraties](features/integrations)** — verbind
  e-mailaccounts zodat `send_email`-acties ergens vandaan
  kunnen versturen.
