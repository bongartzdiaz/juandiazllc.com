---
slug: onboarding/first-deal
lang: en
title: Add your first deal
summary: How to create a deal, attach it to a contact, and move it through pipeline stages on the kanban or list view.
tags: [onboarding, deals, pipeline, kanban, getting-started]
related: [features/deals, features/kanban, onboarding/first-contact, features/automations]
updated: 2026-04-25
---

# Add your first deal

A **deal** is an opportunity in motion — a real-estate transaction,
a donation in negotiation, an event booking. Deals belong to a
**pipeline** and progress through pipeline **stages**.

## Where to do it

`/deals` → click **+ New deal** in the topbar.

## Fields

- **Title** (required) — what you'd call it in conversation.
  E.g. "Acme partnership Q3" or "1234 Elm St — sale".
- **Pipeline** (required) — pick which pipeline this deal lives
  in. New orgs get one default pipeline; admins can create more
  in `/settings/pipelines`.
- **Stage** (required) — the current position. Stages are
  pipeline-specific. The default new-deal stage is the leftmost
  ("Lead", "Inquiry", etc.).
- **Value** (optional) — monetary value in cents. Used for
  pipeline KPIs.
- **Owner** (optional) — which user is the deal-owner. Defaults
  to you.
- **Contact** (optional) — link the deal to an existing contact.
  Recommended; many automations need this link.
- **Project** (optional) — link to a project if relevant.

Submit and the deal lands in the kanban board at the chosen stage.

## Two views: kanban and list

The deals page toggles between:

- **Kanban** — drag-and-drop board, one column per pipeline stage.
  Best for moving deals forward.
- **List** — table view with full filterable columns. Best for
  bulk operations, exports, or sorting by value.

The toggle persists in the URL.

## Moving a deal between stages

In kanban view: drag the card to a new column. The PATCH happens
optimistically — the card moves immediately, then reverts with
a toast if the API fails.

In list or detail view: open the deal, change the stage in the
dropdown, save. The patch is non-optimistic; the button shows
a spinner until it returns.

Every stage change writes an audit log entry with the before/after
stage values and triggers any matching automation rules (see
[Automations](features/automations)).

## Linking a deal to a contact

If you skipped the contact field on creation, you can link later
from the deal detail page → "Related" sidebar → "Link contact".

Once linked:

- The contact's "Deals" tab shows this deal
- Notes you write on the contact appear in the deal's activity
  feed
- Email correspondence with the contact's address auto-attaches
  to both records

## Common automations to set up

`/automations` (admin only) lets you define `trigger → action`
rules. Common ones for deals:

- **Stage = closed-won → create a follow-up task in 30 days** —
  drives renewal conversations
- **Stage = stale (no update in 14 days) → email the owner** —
  prevents deal rot
- **Value > €X → notify Slack** — keeps leadership in the loop

See [Automations](features/automations) for the full builder.

## What about pipelines?

A pipeline is a sequence of stages — the funnel you push deals
through. Default pipeline for a new org has a generic 5-stage
shape; admins customise per industry in `/settings/pipelines`:

- **Real estate**: Lead → Showing → Offer → Under contract → Closed
- **Philanthropy**: Prospect → Engaged → Cultivated → Solicited → Stewarded
- **Hospitality**: Inquiry → Hold → Confirmed → Checked-in → Checked-out

You can run multiple pipelines side-by-side. Each deal lives in
exactly one pipeline at a time, but admins can move a deal across
pipelines if circumstances change.

## Where to go next

- **[Deals page reference](features/deals)** — the full feature
  breakdown including filters, exports, and bulk operations.
- **[Kanban board](features/kanban)** — drag-and-drop UX patterns.
- **[Pipelines & stages](features/settings-pipelines)** — admin
  configuration.
- **[Automations](features/automations)** — automate based on
  deal events.
