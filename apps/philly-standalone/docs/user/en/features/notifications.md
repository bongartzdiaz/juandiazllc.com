---
slug: features/notifications
lang: en
title: Notifications
summary: In-app notification feed — mentions, assignments, automation alerts, deal moves; mark-read, bulk mark-all-read, settings.
tags: [features, notifications, alerts]
related: [features/automations, features/deals]
updated: 2026-04-25
---

# Notifications

`/notifications` is your personal in-app feed. The bell icon in
the topbar shows the unread count; click → dropdown of recent;
"View all" opens this page.

## What gets a notification

- **You're mentioned** — `@you` in a contact note, deal note,
  or activity entry
- **Assigned to you** — a deal owner change, a task assignment,
  a calendar event invite
- **Automation alert** — any rule with a `notify_user` action
  targeting you
- **Deal moved** — a deal you own changes stage (configurable
  in your prefs)
- **Audit alert** — admins get notified on any 409 from the
  audit chain verifier

## The feed

- Newest first
- Unread items have a coloured dot
- Click an item → navigates to the related entity (the deal,
  the contact, etc.)
- "Mark all read" button at the top — fires
  `POST /api/notifications/mark-all-read`

Each notification carries a deeplink so the destination opens
with the right tab / scroll position.

## Per-item actions

Hover any item:

- **Mark read** — manual single-item mark
- **Snooze** (coming soon) — re-surface in N hours
- **Open** — navigates to the source

## Settings

`/settings` → notifications section:

- Channel toggles: in-app (always on), email, SMS
- Per-trigger granularity: get notified on stage change? on
  task assigned? on @mention only?

Defaults are conservative — most operators only want
@mentions + assignments.

## Permissions

- View own notifications: any user
- Mark own as read: any user
- Cross-user notification CRUD: not exposed (no admin override
  — your notifications are yours)

Tenant + user scoped — the `mark-all-read` endpoint is
double-scoped by both `userId` and `organizationId` for
defense-in-depth (you can't accidentally mark another tenant's
notifications).

## Privacy

Notifications are operator-personal data. Retention: 90 days
from creation. Subject to operator self-service erasure (when
you delete your account, your notifications cascade-delete).

## Where to go next

- **[Automations](features/automations)** — `notify_user`
  action source
- **[Audit log](features/audit)** — admins get audit-chain
  alerts here
