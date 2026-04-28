---
slug: concepts/multi-org
lang: en
title: Multi-organization membership
summary: How a single user can belong to several organizations, switch between them, and what each org's admins control.
tags: [concepts, tenancy, multi-org, organization, membership]
related: [concepts/tenancy, concepts/roles, onboarding/create-organization]
updated: 2026-04-28
---

# Multi-organization membership

Bundle G turned Philly's "one user → one organization" rule into a
true many-to-many: a single account can be a viewer in one org, a
manager in another, and an admin in a third — without juggling
separate logins. Every existing tenant kept their data exactly where
it was; nothing about tenancy isolation changed.

This page explains the moving parts so you know what to expect as an
admin, an operator, or a security reviewer.

## The pieces

**`Membership` table.** Each row is one (user, organization, role)
tuple. Composite-unique on `(userId, organizationId)`, so a user
can't hold two membership rows in the same org. Every user has at
least one Membership: their **home org** — the one they signed up
under, recorded on `User.organizationId`. The home-org Membership is
created automatically by the onboarding flow and by every invite,
so the table is the single source of truth for "who can administer
org X".

**Active-org cookie.** Browsers send a `philly-active-org` cookie
(httpOnly, sameSite=lax, 30-day max-age) carrying the org id the
user last switched to. The auth resolver reads it, looks up the
caller's Membership in that org, and sets `scope.role` and
`scope.dashboardSections` from the Membership row. If the cookie is
missing, points at an org the user no longer has a Membership in,
or matches the home org, the resolver falls back to the home-org
values cached on the User row. There's nothing magical about the
cookie — it's a per-request preference, not a credential.

**Top-bar org-switcher.** The `OrgSwitcher` component at the top of
the dashboard appears for any user with two or more memberships. It
calls `GET /api/me/orgs` to list the caller's memberships, and
`POST /api/me/active-org` to set the cookie. Switching to the home
org clears the cookie rather than setting it, so the resolver path
goes back to its fast-path.

## How invites work

`POST /api/users` is the single entry point for adding a teammate.
The body is the same as before: `email`, optional `name`, `role`,
optional `dashboardSections`. The route now branches on whether
the email already has a `User` row in any tenant.

- **New email.** Creates the `User` row anchored to the caller's
  org as its home, plus a mirrored `Membership` row, plus a
  Supabase invite email. Identical to the pre-Bundle-G behaviour.
- **Existing email, same org.** Returns 409 — they're already on
  this team.
- **Existing email, different org.** Adds (upserts) a `Membership`
  row attaching the existing user to the caller's org with the
  specified role. The user keeps their home org and any other
  memberships untouched. The next time they sign in, the
  org-switcher will show this org as a destination they can
  switch to.

This means a consultant working with three clients no longer needs
three separate logins — each client's admin invites the same email,
and each invite produces a Membership.

## Removing a user from an org

`DELETE /api/users/[id]/membership` removes the target user's
Membership in the caller's active org. Two guards:

- **Cannot remove a home-org membership.** That would orphan the
  user. Deleting the User row is a separate operation (and isn't
  wired up to a route yet — for now, do it via SQL with care).
- **Cannot remove the last admin of an org.** The check counts
  Memberships with `role='admin'` in the org; if removing this one
  would drop the count to zero, the request returns 400.

The `User` row, the user's other memberships, and any data the user
authored stay in place. It's strictly an access-revocation operation.

## What stayed the same

- **Tenancy isolation.** Every API route still scopes Prisma queries
  by `scope.organizationId`. The audit script
  (`npm run audit:tenant`) is unchanged, and it still passes.
- **The role model.** The three roles (admin / manager / viewer) and
  the dashboard-section allow-list mean the same things they did
  before. The only difference is that a single user can now hold
  different roles in different orgs.
- **GDPR scope.** Admin-led data-subject requests still find rows
  by email scoped to the admin's `organizationId`. A user with
  memberships in three orgs is three separate "data subjects in this
  controller" from each of those tenants' perspectives.

## Known limitations (today)

- **No UI to change a Membership role.** The home-org role is
  editable via the existing user-settings page; non-home memberships
  can be created (POST /api/users) and removed (DELETE
  /api/users/[id]/membership), but there's no surface yet for
  promoting a viewer-in-org-X to admin-in-org-X without removing
  and re-inviting.
- **No "leave organization" self-service.** Only admins can revoke
  a Membership today. Users who want to leave an org should ask the
  org's admin.
- **No cross-org data move.** Switching active org changes what you
  see; it doesn't migrate any data. Records stay in the org they
  were created in.

## Tests that pin the guarantee

- `lib/philly/auth-helpers.test.ts` — five tests covering the
  active-org cookie path: cookie unset → home org; cookie pointing
  at a valid Membership → that org's role/sections; cookie pointing
  at a stale Membership → silent fallback to home; cookie set to the
  home org → indistinguishable from unset; non-admin in another org
  cannot escalate by setting the cookie.
- `lib/onboarding/create-org.test.ts` — eight tests including the
  cross-tenant signup test (two unrelated signups land in two
  organizations) and the home-org Membership invariant.
- `lib/membership/remove.test.ts` — seven tests on the per-org
  last-admin guard and the home-org refusal.

These together are the load-bearing assertions for the multi-org
behaviour. Weakening any of them should require security-team
review.

## Where to go next

- **[Tenancy & data isolation](concepts/tenancy)** — the per-tenant
  data model and the route-audit script.
- **[Roles & permissions](concepts/roles)** — what each role can do
  *within* an organization.
