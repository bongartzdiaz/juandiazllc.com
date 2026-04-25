---
slug: features/automations
lang: en
title: Automations
summary: Trigger-based rules that fire on entity events — create tasks, send emails, post webhooks, update fields. Admin-only configuration.
tags: [features, automations, rules, admin]
related: [features/deals, features/settings-webhooks, features/integrations]
updated: 2026-04-25
---

# Automations

Trigger-based rules. When a thing happens in the CRM (a deal
moves stage, a contact is created, a project hits a milestone),
the automation engine evaluates every enabled rule and runs the
matching actions.

`/automations` — admin-only. Managers + viewers see nothing.

## The rule shape

Every rule is `trigger → conditions → actions`:

- **Trigger** — what kicks the rule off. Examples:
  - `deal.stage_changed` — fires whenever a deal's stage updates
  - `deal.value_threshold` — fires when value crosses a number
  - `contact.created` — fires on new contact
  - `contact.tagged` — fires when a tag is added/removed
  - `project.milestone_completed`
  - `task.overdue`
  - `email.received` — when Gmail-sync ingests a matching message
- **Conditions** — optional filters. AND-combined. Examples:
  - `deal.pipeline = "Major Gifts"`
  - `deal.value >= 10000`
  - `contact.type = "donor"`
- **Actions** — what to do. One or more, run in order:
  - `create_task` — adds an Activity of type "task" on a record
  - `send_email` — sends from a connected email account
  - `post_webhook` — POSTs to a registered webhook
  - `update_field` — patches a field on the triggering record
  - `notify_user` — creates an in-app notification
  - `tag_contact` — adds/removes a tag

## Building a rule

`/automations` → **+ New rule**. Modal opens with:

1. **Name** — free-text; surfaced in the audit log.
2. **Trigger** — pick from dropdown.
3. **Conditions** — empty by default. Click "+ Condition" to add
   field-value pairs. Field options are scoped to the trigger's
   entity (e.g. deal-trigger conditions only let you filter on
   deal fields).
4. **Actions** — at least one required. Each action has its own
   form (e.g. send_email asks for from-account, to-template,
   subject template, body template).
5. **Enabled** — toggle. New rules default to enabled.

Save. The rule appears in the list; the engine picks it up on
the next matching event.

## Run history

Each rule's row shows:

- **Total runs** — lifetime
- **Last run** — timestamp
- **Status** — last run's outcome (ok / partial / failed)

Click a rule to expand its run log: chronological list of every
firing, with the triggering record's id, condition results, and
action outcomes.

The engine retries failed actions up to 3 times with exponential
backoff. After 3 failures the action is marked permanently failed
and the rule continues with subsequent actions.

## Templates

Action fields like email subject + body support handlebars-style
templates with the triggering record's fields:

```
Subject: Deal {{deal.title}} moved to {{deal.stage}}
Body:    Hi {{deal.owner.name}}, the deal "{{deal.title}}" just
         moved to stage {{deal.stage}}. Linked contact:
         {{deal.contact.name}}.
```

Available variables depend on the trigger. The form's variable
picker (small `{}` icon next to the field) lists what's available.

## Common starter rules

Three rules that almost every org wants:

1. **Stale-deal nudge** — trigger `deal.no_update_in`, days = 14,
   action `notify_user` to the deal owner.
2. **High-value Slack ping** — trigger `deal.value_threshold`,
   threshold = €10,000, action `post_webhook` to a Slack
   incoming webhook.
3. **New-donor welcome** — trigger `contact.created`,
   condition `contact.type = "donor"`, action `send_email`
   with a welcome template.

## Disabling a rule

Toggle the "Enabled" switch. The rule stays in the list but the
engine skips it. Past runs are preserved.

## Audit trail

Every create, edit, enable/disable, and delete on a rule writes
an audit log entry. Every rule firing also writes an
`automationLog` row that's visible in the rule's run history.

## Limits

- Max 50 enabled rules per organisation (soft cap; raise in
  config if needed).
- Each rule is rate-limited to 100 runs per hour per
  organisation. Beyond that, runs are dropped to prevent runaway
  loops (e.g. an automation that triggers itself).
- Action chains are capped at 10 actions per rule.

## Where to go next

- **[Deals](features/deals)** — the most common automation
  trigger source.
- **[Webhooks](features/settings-webhooks)** — outbound
  webhook configuration for the `post_webhook` action.
- **[Integrations](features/integrations)** — connect email
  accounts so `send_email` actions have somewhere to send from.
