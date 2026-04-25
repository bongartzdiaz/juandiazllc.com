---
slug: onboarding/invite-team
lang: en
title: Invite your team
summary: How an admin pre-creates teammate accounts in /settings/users so invitees land in the right org on first sign-in.
tags: [onboarding, team, users, invitations, admin]
related: [onboarding/welcome, onboarding/create-organization, concepts/roles, features/settings-users]
updated: 2026-04-25
---

# Invite your team

Once your organization exists, the next step is getting your
teammates in. The CRM uses an **admin-led invite** model:
admins pre-create teammate accounts, then the invitee signs in
with their own credentials and lands directly in your org.

## Where to do it

`/settings/users` — the team management page, admin-only.
Non-admins can see the team list but can't change anything.

## The flow

1. Click **+ New user** at the top of `/settings/users`.
2. Fill in:
   - **Email** — the address the invitee uses to sign in. Must
     be unique across all of Philly; a person can only belong
     to one organization.
   - **Display name** — optional; defaults to the local part of
     the email.
   - **Role** — `admin`, `manager`, or `viewer`. See
     [Roles & permissions](concepts/roles).
   - **Dashboard sections** — leave default (full access) for
     most teammates, or pick specific sections to restrict to.
3. Submit. Two things happen:
   - A row is created in `User` with the email, role, sections,
     and your `organizationId` — so the invitee belongs to your
     org from the moment of creation.
   - A Supabase invite email goes out from the auth system.
4. The invitee clicks the email link, sets a password (and 2FA
   if you require it), and signs in. The system finds their
   pre-created Philly row by email and lands them on the
   dashboard inside your org.

The pre-created row is the trick: without it, a brand-new
sign-in goes to `/onboarding` and creates a new tenant.

## What if the invitee already has an account?

If they have a User row in *any* organization (yours or another),
the create-user form returns `409 — A user with that email
already exists` and refuses to silently move them. This protects
against accidental cross-org transfers.

To move someone, the receiving admin must invite the new email
and the original admin must remove the old row. There's no
auto-merge; data clarity wins over convenience.

## What if I get the role wrong?

You can change a teammate's role at any time from the same page.
Edits are audit-logged. The only guardrail: the system refuses
to demote the **last** admin in your org — promote a successor
first, or you'd lock yourself out of admin functions.

## What if the invite email doesn't arrive?

The Supabase invite is best-effort. If it fails or gets caught
in spam, the User row was still created — the invitee can:

1. Visit the brand login page and request a magic link to the
   same email.
2. Once they sign in, the system still finds their row and
   lands them in your org.

Re-issue the Supabase invite from the same `/settings/users`
form by trying to invite the same email — the existing row
returns the conflict error, but you can also reset their
Supabase password from the auth dashboard.

## Per-section access (advanced)

The default `dashboardSections: null` means full access. For
finer control, set the field to a specific list of section
slugs — e.g. `["dashboard", "contacts", "deals"]` — and the
sidebar will only show those, *and* every API route under
those non-listed sections will return `403`.

Slugs match `lib/philly/sections.ts`. Admins always get every
section regardless of this list (they can't lock themselves
out by accident).

## Removing access

Currently, "remove user" deletes the User row. That cascades:
audit log entries the user wrote stay (they reference the user
ID; the FK is restrict-on-delete in the AuditLog table to
preserve forensic history), but the user can no longer sign in.

Use this for hard offboarding. For "they're on leave but coming
back", change their role to `viewer` and clear `dashboardSections`
to none — they keep the seat but can't do anything.

## Where to go next

- **[Roles & permissions](concepts/roles)** — the full breakdown
  of what each role can do.
- **[Settings → Users page](features/settings-users)** — UI
  reference for the page itself.
