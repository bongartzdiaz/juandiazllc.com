---
slug: features/projects
lang: en
title: Projects (philanthropy)
summary: CSR initiatives with budget, milestones, SDG alignment, impact metrics, contact links, kanban + grid + list views.
tags: [features, projects, philanthropy, csr, impact, sdg]
related: [features/contacts, features/grants, features/impact, features/timeline]
updated: 2026-04-25
---

# Projects

`/projects` is the project tracker. Default for philanthropy
mode; in real-estate mode it becomes "Properties", in
hospitality mode it becomes "Venues" — same database, different
labels.

## The grid

KPIs: total / active / total-budget / budget-used. Card grid
of projects with cover, title, progress bar, status badge,
SDG icons.

View toggle: grid / list. URL-state.

## Creating a project

**+ New project**:

- Title (required) + description
- Category (free-text or pick from your taxonomy)
- Status: planned / active / paused / completed
- Start / end dates
- Budget (in local currency, stored in cents)
- SDG goals — pick from the 17 UN goals (multi-select)
- Linked contacts — partners, donors, beneficiaries

## Project detail

`/projects/[id]`:

- Header: title (inline-edit), status, dates, progress
- Tabs: Overview | Milestones | Impact | Contacts | Documents
- Sidebar: linked deals, total spent vs budget, key dates

## Milestones

Add via the Milestones tab. Each has title, due date, status
(`pending` / `completed` / `overdue`). Marking a milestone
complete:

- Bumps the project's progress % automatically
- Writes audit
- May trigger a `project.milestone_completed` automation

## Impact metrics

The Impact tab tracks numeric outcomes — people-helped,
trees-planted, CO2-reduced, money-donated. Each metric:

- Name + unit
- Target + actual
- Visualised as a fill-bar

Aggregated org-wide on `/impact` for board reports.

## SDG alignment

The 17 UN Sustainable Development Goals are tagged on each
project. The dashboard's "SDG Coverage" KPI counts unique SDGs
across all active projects. Used for impact reporting.

## Privacy

Projects themselves don't carry PII (the contacts linked to
them do). The retention policy is operationally driven — projects
stay until manually archived.

## Permissions

- View: any user
- Create / edit: admin + manager
- Edit milestones: admin + manager (assignees may also tick
  off their own)

## Where to go next

- **[Timeline](features/timeline)** — Gantt view across all
  projects
- **[Impact](features/impact)** — org-wide aggregated metrics
- **[Grants](features/grants)** — funding sources for
  projects
