---
slug: features/settings-pipelines
lang: en
title: Settings → Pipelines
summary: Define and customise the deal pipelines + their stages — multiple per org, per-industry defaults, drag-to-reorder.
tags: [features, settings, pipelines, deals, admin]
related: [features/deals, features/kanban, features/automations]
updated: 2026-04-25
---

# Settings → Pipelines

`/settings/pipelines` is the pipeline configurator. Admins
define the funnels deals flow through. Each org gets a default
pipeline on create (industry-specific); add as many more as you
need.

## The page

Sidebar lists pipelines; click one to open. The right pane
shows its stages in order with drag handles.

## Creating a pipeline

**+ New pipeline**: name + (optional) description. Save → empty
pipeline. Add stages.

## Stages

Each stage:

- **Name** (required)
- **Color** — for kanban column tinting
- **Order** — implicit from drag position; persisted on drop
- **Win/lose flag** — marks the terminal stages (used by
  automations to know "this deal is closed")

Drag handles reorder. Save persists the new order; deals already
in the pipeline don't move (their stage assignment is kept by
name).

## Renaming a stage

Edit the name in place → save. Existing deals in that stage
update automatically (the FK is by stage id, not name).

## Deleting a stage

Two-step: confirm prompt warns if any deals are currently in
that stage. If yes, you must move them to another stage first
(the API refuses delete with `409 — N deals in this stage`).

## Multiple pipelines

A deal lives in exactly one pipeline at a time. Use multiple
pipelines for distinct flows:

- "Major gifts" vs "Recurring donors" (philanthropy)
- "Sales" vs "Rentals" (real-estate)
- "Group bookings" vs "Individual reservations" (hospitality)

Move a deal across pipelines from its detail page → "Change
pipeline" → pick the new pipeline + the equivalent stage.

## Default pipelines per industry

| Industry | Default stages |
| --- | --- |
| Philanthropy | Prospect → Engaged → Cultivated → Solicited → Stewarded |
| Real-estate | Lead → Showing → Offer → Under contract → Closed |
| Hospitality | Inquiry → Hold → Confirmed → Checked-in → Checked-out |

You can edit or replace these freely.

## Audit

Every pipeline + stage create/edit/reorder/delete writes an
audit row.

## Where to go next

- **[Deals](features/deals)** — the entities that flow through
  pipelines
- **[Kanban](features/kanban)** — visual drag-and-drop view
- **[Automations](features/automations)** — fire actions on
  stage transitions
