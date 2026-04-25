---
slug: concepts/roles
lang: en
title: Roles & permissions
summary: What admin, manager, and viewer can each do, plus how the per-section allow-list narrows access further.
tags: [concepts, roles, permissions, security, admin]
related: [onboarding/invite-team, concepts/tenancy, features/settings-users]
updated: 2026-04-25
---

# Roles & permissions

Philly has three roles. Within each role, an optional **per-section
allow-list** narrows access further. The two layers compose:
a user can do something only if their role permits it AND the
section is in their allow-list.

## The three roles

### Admin

Can do everything in their organization:

- Invite, edit, and remove users
- Change anyone else's role (except they can't demote the last
  admin)
- Configure integrations, automations, webhooks, and API keys
- Process data-subject requests (export, erasure) on contacts
- View and verify the audit log
- Set the industry mode for the org
- Access every dashboard section regardless of the allow-list

Admins exist to administer. Most operators don't need to be one.

### Manager

Can mutate the day-to-day data of their organization but not
the organization itself:

- Create, edit, and delete contacts, deals, projects, properties,
  reservations, calendar events
- Send emails and SMS
- Run AI tools (command-bar, scoring, contact attributes)
- Cannot invite users, cannot change roles, cannot access settings
  pages, cannot configure integrations or automations

Most CRM users are managers.

### Viewer

Read-only across whatever sections their allow-list includes:

- Browse contacts, deals, projects, etc.
- View dashboards and reports
- Cannot create, edit, or delete anything
- Cannot send anything (no email, no SMS, no AI mutations)

Use this for board members, auditors, or read-only exec dashboards.

## The per-section allow-list

Every user has a `dashboardSections` field. It can be:

- **`null`** — full access. The user sees every section their
  role permits. New users default here.
- **A list of section slugs** — strict allow-list. The user only
  sees the sections in the list. Sidebar items outside the list
  are hidden, and any API route under them returns 403.

Example: a viewer with `dashboardSections: ["dashboard", "contacts", "reports"]`
sees only those three sections — no deals, no kanban, no settings.

**Admins are exempt.** An admin with a restricted allow-list still
gets every section. This prevents an admin from accidentally
locking themselves out of admin functions.

Slugs are defined in `lib/philly/sections.ts`. Common ones:
`dashboard`, `contacts`, `deals`, `projects`, `kanban`, `calendar`,
`timeline`, `email`, `sms`, `ai`, `settings`, `audit`, `notifications`.

## Where role checks happen

Every API route under `/api/` calls one of three guards at the
top:

- `requireScope()` — must be signed in and have a Philly user.
  Returns the auth scope (userId, organizationId, role, allow-list).
- `requireRole(['admin', 'manager'])` — additionally requires
  the role be in the allowed list. Returns 403 otherwise.
- `requireSection('contacts', ['admin', 'manager'])` — guards
  by both section slug and (optionally) role. The default for
  most CRM mutation routes.

If you build new API routes, use one of these. The
[tenant-isolation audit script](features/audit-tenancy)
verifies on each commit that no route slips through without a guard.

## Common role changes

### Promoting a manager to admin

`/settings/users` → click the user → change role → save. Audit-logged.

### Restricting a manager to specific sections

`/settings/users` → click the user → expand "Dashboard sections" →
uncheck the sections they shouldn't see → save. Their existing
sessions are unaffected; on their next request the API picks up
the new list.

### Demoting an admin

Allowed unless they're the last admin. The system blocks the change
with a 400 error if you try; promote another user first.

## Audit trail

Every role and section-list change writes an entry to the
[audit log](features/audit) with the before/after values. You
can filter the audit page to `entity: user` to see all role
changes in your org.

## Where to go next

- **[Tenancy & data isolation](concepts/tenancy)** — how the org
  scope works at the database layer.
- **[Settings → Users page](features/settings-users)** — UI
  reference for managing the team.
- **[Audit log page](features/audit)** — review every mutation
  in your org, including role changes.
