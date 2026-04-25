---
slug: features/kanban
lang: en
title: Kanban boards
summary: The Kanban view for deals (and standalone /kanban boards) — drag-drop, columns, cards, keyboard shortcuts, multi-board.
tags: [features, kanban, deals, dnd]
related: [features/deals, features/settings-pipelines]
updated: 2026-04-25
---

# Kanban boards

Two places use the kanban UX:

1. **`/deals` — kanban view**: a kanban over your deals, with
   one column per pipeline stage. Pre-wired to your deal data;
   drag = stage change.
2. **`/kanban` — standalone boards**: free-form boards where you
   define columns + add cards manually. Use this for ad-hoc
   tracking that doesn't fit the deal model (sprints, campaigns,
   to-dos).

Both share the same drag-and-drop engine (`@dnd-kit`).

## Drag-and-drop

- **Click + drag** a card to move it. The drop targets are other
  columns + the slots between cards in the same column.
- **Optimistic update** — the card moves immediately; the API
  call (PATCH) follows. On error, the card snaps back and a
  toast shows the failure.
- **Touch + hold** on mobile: long-press the card, then drag.

The `/deals` board fixes columns to pipeline stages — you can't
add or remove columns from the board itself. To change stages,
use [`/settings/pipelines`](features/settings-pipelines).

The `/kanban` standalone boards let admins/managers add/remove/
reorder columns directly from the board UI.

## Card content

`/deals` cards show:

- Title (bolded)
- Value (right-aligned)
- Owner avatar (small circle)
- Linked contact name (if any)
- Days-in-stage indicator (subtle text — colours red after the
  configured "stale" threshold, default 14d)

`/kanban` standalone cards show whatever fields the admin
defined when creating the board (free-form).

## Keyboard shortcuts

- **Arrow keys** while hovering a card — focus a card without
  clicking.
- **Space** when card is focused — pick it up.
- **Arrow keys** while card is picked up — move between
  drop targets.
- **Space** again — drop the card.
- **Esc** — cancel the drag.

Screen readers announce the move ("Acme deal moved from
Qualified to Negotiation"). Accessibility is a first-class
concern; `@dnd-kit` ships with proper ARIA.

## Multi-board (`/kanban` only)

A free-form board has:

- **Title** + description
- **Columns** — admins can add, rename, reorder, delete
- **Cards** — each card belongs to one column. Operators with
  manager+ role can add/edit/delete cards.

You can have many boards per organisation. The `/kanban` page
lists them; click a board to open. Boards are tenant-scoped —
other organisations never see your boards.

## Filtering & search (deals view only)

The deals kanban toolbar supports the same filter/search/pipeline-
picker controls as the list view. Filters apply across all
columns — a search for `Acme` shows matching cards in whatever
column they're in.

## Performance notes

- Each column virtualises after ~50 cards (only renders what's
  visible). Drag-and-drop still works across the virtual gap.
- Bulk re-orders within a column issue a single PATCH per card,
  not a batched one. For very large boards (1000+ cards), a
  reorder script via the API is more efficient than the UI.
- Real-time: a colleague moving a card in another browser tab
  refreshes your board within ~1 second (via `useEntitySubscription`).

## Common gotchas

- **Card snaps back after drop** — most often a stage-mismatch.
  The deal's pipeline doesn't include the column you tried to
  drop into. Check the pipeline picker.
- **Drag picks up the wrong card** — usually a touch-device
  issue. Long-press until the card highlights, then drag.
- **Missing card after creating a deal** — if the deal's stage
  isn't in the current pipeline-picker selection, switch to
  that pipeline.

## Where to go next

- **[Deals](features/deals)** — full feature reference for the
  deal model.
- **[Pipelines](features/settings-pipelines)** — admin
  configuration of stages.
- **[Automations](features/automations)** — fire automations
  on stage changes.
