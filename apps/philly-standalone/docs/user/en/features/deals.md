---
slug: features/deals
lang: en
title: Deals
summary: The deals page — kanban board + list view, drag-and-drop stage moves, filters, value totals, and how deals link to contacts and projects.
tags: [features, deals, pipeline, kanban]
related: [onboarding/first-deal, features/kanban, features/automations, features/settings-pipelines]
updated: 2026-04-25
---

# Deals

A **deal** is an opportunity in motion. Real-estate transactions,
philanthropy gifts in negotiation, hospitality bookings being
contracted — they all share the same model. Each deal lives in
exactly one **pipeline** at one **stage** at a time.

## Two views

`/deals` toggles between two layouts via a button in the toolbar
(persists in URL):

- **Kanban** — drag-and-drop board; one column per pipeline
  stage. Card stack height = stage count. Best for moving
  deals forward at a glance.
- **List** — table view with sortable columns (title, stage,
  value, owner, contact, updated). Best for bulk operations,
  exports, and filtering.

## Toolbar

- **Pipeline picker** — swap between pipelines if your org has
  more than one. Each pipeline has its own stage set.
- **Status filter** — open / won / lost / all
- **Search** — matches deal titles
- **+ New deal** — opens the create modal (admins + managers)

The deals page also surfaces three KPIs: total open value,
weighted forecast, average days in stage.

## Creating a deal

Required: title, pipeline, stage. Optional: value, owner, contact,
project. Submit creates the deal at the chosen stage; the kanban
card appears immediately.

If the pipeline you pick has no stages yet (rare, fresh org),
the form blocks submit with "no stages — add stages in
`/settings/pipelines` first".

## Moving a deal between stages

**In kanban view**: drag the card to a new column.

- Optimistic update: card moves immediately.
- PATCH happens in the background.
- On error, the card snaps back and a toast shows the failure.
- A `Deal moved` toast confirms success; an audit log entry
  records before/after stage values.

**In list view or detail page**: change the stage in the dropdown,
save. Non-optimistic; button shows a spinner until it returns.

Every stage change writes audit + may trigger automations (see
[automations](features/automations)).

## The deal detail page

`/deals/[id]` shows:

- **Header card** — title (inline-editable), stage picker,
  status, value, owner avatar
- **Inline-editable fields** — title, value, expected close
  date, deal type — click to edit, Tab/Esc to save/cancel
- **Sidebar** — linked contact, linked project, tags
- **Activity feed** — every event on this deal: stage changes,
  notes, emails, calls
- **Files tab** — documents attached to the deal
- **E-signatures tab** — signature requests + their statuses

## Linking a deal to a contact

Two ways:

1. On create — pick a contact in the modal.
2. After create — open the deal → Sidebar → "Link contact" →
   pick from your contacts list.

Once linked:

- The contact's "Deals" tab includes this deal
- Activity flows in both directions — a note on the contact
  appears in the deal feed
- Emails to/from the contact's address auto-attach to the deal

## Status: open / won / lost

Status is **separate** from stage. Stage is the position in the
pipeline; status is the disposition.

- **Open** — deal is active, in some stage. Default for new deals.
- **Won** — deal closed positively. Often paired with the final
  pipeline stage.
- **Lost** — deal closed negatively. Optionally include a "lost
  reason" in the notes for analytics.

Filtering by status is in the toolbar; the kanban shows open
deals by default and dims won/lost.

## Deleting a deal

`/deals/[id]` → menu → Delete. Confirmation prompt; admin or
manager only.

Hard-delete; there's no soft-delete column on `Deal`. Audit log
preserves the entry (FK constraint is `RESTRICT`, so the audit
row keeps the deal id but the deal itself is gone). Use this
sparingly — for testing or hard-correcting data; for "we
didn't get the deal" use status = lost instead.

## Where to go next

- **[Kanban board](features/kanban)** — drag-drop UX details
- **[Pipelines](features/settings-pipelines)** — admin
  configuration of stages
- **[Automations](features/automations)** — automate based on
  stage changes
- **[Contacts](features/contacts)** — link deals to people
