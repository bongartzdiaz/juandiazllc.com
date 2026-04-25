---
slug: concepts/tenancy
lang: en
title: Tenancy & data isolation
summary: How Philly scopes every record to one organization and proves at compile-time that no API route can leak across tenants.
tags: [concepts, tenancy, security, multi-tenant, organization]
related: [onboarding/create-organization, concepts/roles, concepts/gdpr, features/audit]
updated: 2026-04-25
---

# Tenancy & data isolation

Philly is multi-tenant by design. Each organization is one tenant;
every record carries the organization's id; every API route filters
by it. Two unrelated companies signing up for Philly never see each
other's data.

This page explains the mechanics — useful if you're an admin, a
DPO, or a security reviewer.

## The data layer

Most tables in the database have an `organizationId` column. Some
that don't (`Reservation`, `OpenHouseVisit`, `Message`, `ESignature`)
are scoped via a parent table that does — for example, a `Reservation`
is attached to a `Room`, and the `Room` carries the `organizationId`.

Either way, every query the application makes for org-scoped data
includes an `organizationId` filter. There are no "find this contact
by id alone" queries — they're always "find this contact by id AND
in this organization".

## The auth layer

Every API route starts with one of three guards:

```ts
const scope = await requireScope()       // any authenticated user
const scope = await requireRole(['admin']) // admin only
const scope = await requireSection('deals', ['admin', 'manager'])
```

Each returns an `AuthScope` object containing — among other things
— the caller's `organizationId`. Routes then use that value in
their Prisma queries:

```ts
const contacts = await prisma.contact.findMany({
  where: { organizationId: scope.organizationId, ... }
})
```

If a route forgets to scope, it would expose another tenant's data.
That class of bug is why we...

## The audit layer

`scripts/audit-tenant-isolation.ts` walks every `app/api/**/route.ts`
file and flags any that:

- Don't call `requireScope` / `requireRole` / `requireSection`
- Or query Prisma but never reference `organizationId`

The script is run via `npm run audit:tenant`. It exits 0 if every
route is scoped, and non-zero with a list of offenders if not.
The current state is **clean** — every route either is scoped, or
is in the explicit `EXEMPT_PATHS` list with a one-line justification
(e.g. `/api/log-error` is a public error sink, `/api/cron/*` uses
Bearer-token auth instead).

The audit runs on every CI build via `.github/workflows/security.yml`.
A new route that forgets to scope fails the build.

## What if a user belongs to multiple organizations?

Today, no. `User.organizationId` is 1:1 — a user belongs to exactly
one organization. The data model expects this; the auth flow
enforces it.

If you legitimately need cross-org access (e.g. a consultant working
with several clients), the workaround for now is to create separate
user accounts with different emails — one per organization.

A future "Membership" table that lets one user belong to multiple
orgs is on the roadmap; ask if you need it sooner.

## What about admin-led data-subject requests?

GDPR Art. 15 (access) and Art. 17 (erasure) allow an admin to
process a request for a third party (a contact, a volunteer, a
guest) on their organization's behalf. The endpoints
`/api/admin/gdpr/data-subject-export` and
`/api/admin/gdpr/data-subject-erasure` find rows by email **scoped
to the requesting admin's organizationId**. They cannot reach
into another tenant's data, even with admin role.

See [GDPR self-service](concepts/gdpr) for the full flow.

## Tests that pin the guarantee

`lib/onboarding/create-org.test.ts` includes a test called
"two unrelated signups land in two separate organizations". It
creates two new users with different emails, runs each through
the create-org flow, and asserts the two organizations are
distinct and the two user rows belong to the right ones.

Removing or weakening that test should require security-team
review. It's the load-bearing assertion for our multi-tenancy
claim.

## Where to go next

- **[Roles & permissions](concepts/roles)** — what each role can do
  *within* their organization.
- **[GDPR self-service](concepts/gdpr)** — Articles 15/17 flows for
  operators and contacts.
- **[Audit log](features/audit)** — the tamper-evident record of
  every mutation in your tenant.
