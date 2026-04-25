---
slug: features/reports
lang: en
title: Reports
summary: Saved report definitions (entity + filter + grouping + chart) — generate on demand or schedule, share read-only links.
tags: [features, reports, analytics, dashboards]
related: [features/impact, features/audit, features/automations]
updated: 2026-04-25
---

# Reports

`/reports` is the saved-report builder. Define a query once,
re-run on demand, optionally schedule via automations, share
a read-only link with stakeholders.

## The list

Each saved report shows: title, entity (contacts / deals /
projects / etc.), last-run date, owner, share status.

## Creating a report

**+ New report**:

1. Pick the entity (deals, contacts, projects, …)
2. Apply filters (status / pipeline / type / date range / tag)
3. Group by — e.g. group deals by stage
4. Pick chart type — bar / line / pie / table
5. Save

The report is rendered immediately; the saved definition lives
in the `Report` table.

## Running a report

Click any saved report to render. Filters can be tweaked at
run time without saving (URL state). The data preview shows
in-page; "Export CSV" downloads the underlying rows.

## Sharing

Each report has a **Share** button. Generates a public
read-only token URL — pass it to a board member who doesn't
have a CRM seat. The URL renders the report only; no
navigation, no auth needed.

Tokens are scoped to the report (not the organisation) and
expire after 30 days by default. Revoke a token from the
report's edit screen.

## Scheduling

Pair a report with an automation rule:

- Trigger: `cron.weekly` (Mondays 09:00)
- Action: `send_email` with the report's CSV attached

Configure in `/automations`.

## Privacy

Reports themselves are metadata, not PII. The data they
project may contain PII (depending on entity + filters).
Shared report tokens count as a controlled disclosure —
audit who you share with.

## Permissions

- View / run / share: admin + manager
- Edit / delete: admin + manager (only the owner can delete)

## Where to go next

- **[Impact](features/impact)** — purpose-built impact
  dashboard
- **[Audit log](features/audit)** — review every report-share
  action
- **[Automations](features/automations)** — schedule report
  runs
