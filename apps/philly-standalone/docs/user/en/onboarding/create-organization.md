---
slug: onboarding/create-organization
lang: en
title: Create your organization
summary: How a brand-new sign-in bootstraps a fresh tenant on /onboarding and lands as its first admin.
tags: [onboarding, organization, admin, tenancy]
related: [onboarding/welcome, onboarding/invite-team, concepts/tenancy, concepts/roles]
updated: 2026-04-25
---

# Create your organization

The first time you sign in to Philly with a fresh email, the CRM
sends you to `/onboarding`. From there you create your own
organization — and become its admin.

## Why this exists

Each organization in Philly is a tenant. Every record — contacts,
deals, projects, audit logs — is scoped to one org and never leaks
across to another. The bootstrap step prevents the situation where
two unrelated companies sign up and accidentally share data.

Before this flow existed, the CRM auto-joined every new user into
a single shared default org. That was a multi-tenancy bug; the
onboarding step is the fix.

## The flow

1. Sign in to the brand site with a Supabase-managed email account.
2. The dashboard layout calls `GET /api/onboarding/status`. If you
   have no Philly user row yet, you're redirected to `/onboarding`.
3. On `/onboarding`, fill in:
   - **Organization name** — required; 2–120 characters. This is
     the public-ish name shown in the topbar.
   - **Display name** — optional; how teammates and reports refer
     to you. Defaults to the part of your email before the `@`.
4. Submit. The server creates an `Organization` row + a `User` row
   (you, with `role: admin`) inside one database transaction. If
   either fails, neither commits — you'll never end up half-created.
5. You're redirected to the dashboard. Your tenant is live.

## What happens automatically

- A unique slug is derived from the organization name. If you
  type `Acme Inc.`, the slug becomes `acme-inc`. If that slug is
  taken, the system appends `-2`, `-3`, etc. until it finds a
  free one.
- Your first user row is created with `role: admin` and full
  dashboard access (`dashboardSections: null`, meaning every section).
- An audit log entry is written — `entity: organization`, `action: create` —
  with you as the actor. This is the genesis row in your tenant's
  hash-chained audit log.

## What happens if I refresh / submit twice?

Idempotent. If the server sees that your email already has a
Philly user row, it returns `409 ALREADY_ONBOARDED` and refuses
to create a second tenant. You can't accidentally duplicate
yourself.

## What if my organization is already in Philly?

If an admin in an existing organization invites you (via
`/settings/users` → New user), they pre-create your Philly user
row. When you then sign in, the system finds your row and lands
you in their organization — you skip `/onboarding` entirely.

So if you expected an invite but ended up on `/onboarding`, the
admin probably hasn't invited you yet. Sign out and ask them to
invite, then sign back in.

## Permissions you have as the bootstrap admin

- All sections of the dashboard
- Invite/edit/remove users in your org
- Process data-subject requests (export, erasure) for contacts
- Configure integrations, automations, webhooks, API keys
- View and verify the audit log

You can hand off the admin role later — see
[Roles & permissions](concepts/roles) — but the system blocks you
from removing the *last* admin in the org. Promote a successor
first.

## Where to go next

- **[Invite your team](onboarding/invite-team)** — get teammates
  into your org with the right roles.
- **[Roles & permissions](concepts/roles)** — what admin / manager
  / viewer can each do.
- **[Set your industry](onboarding/pick-industry)** — choose
  philanthropy / real estate / hospitality so the dashboard adapts.
