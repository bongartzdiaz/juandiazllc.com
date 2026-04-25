---
slug: features/timeline
lang: en
title: Timeline (Gantt)
summary: Gantt-chart view across projects/properties, with milestone dots, today line, status filters, drawer detail.
tags: [features, timeline, gantt, projects]
related: [features/projects, features/properties, features/calendar]
updated: 2026-04-25
---

# Timeline

`/timeline` renders your projects (or properties in real-estate
mode) as a Gantt chart. Each row is one project; the bar spans
its start → end date; milestones inside the project show as
dots on the bar.

## Layout

- **Stats strip** at the top — total / active / completed /
  avg progress / on-track % / milestones done.
- **Toolbar** — status filter pills + zoom (Weeks / Months /
  Quarters) + Today button.
- **Two-pane Gantt**:
  - Left panel: project list with title, category, dates,
    progress bar, status badge.
  - Right panel: scrollable timeline. Today is a vertical red
    line; milestones are coloured circles (filled = done,
    hollow = pending).

## Drag-to-zoom

The zoom buttons cycle through three densities. Each zoom level
defines a `dayWidth` (px per day); the timeline width auto-fits.

The Today button scrolls the right pane to the current day.

## Live data

In philanthropy mode, the timeline pulls projects from the
`/api/projects` endpoint. Hospitality / real-estate modes show
hand-curated demo data (the model is the same; the demo data
demonstrates the feature without seed-loading the DB).

When the live API is in flight, a loading banner appears at
the top. If the API errors, an error banner shows and the
page falls back to the demo data so the layout doesn't
collapse.

## Click a row

Opens the **Task Detail Drawer** on the right:

- Progress bar with percentage
- Start / end / duration / days-left
- Per-milestone list with done/pending state
- Category + ID

Esc to close.

## Permissions

Read: any user. Mutation: admins + managers via the
`/projects/[id]` page (timeline is read-only — edit projects in
their own page).

## Where to go next

- **[Projects](features/projects)** — the source-of-truth
  page for what the timeline visualises
- **[Calendar](features/calendar)** — for time-based events,
  not date-spanning projects
