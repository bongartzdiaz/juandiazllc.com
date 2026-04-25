---
slug: features/settings-users
lang: en
title: Settings → Users
summary: The team-management page — invite, edit role, edit per-section access, remove. Admin-only mutation.
tags: [features, settings, users, team, admin]
related: [onboarding/invite-team, concepts/roles, features/audit]
updated: 2026-04-25
---

# Settings → Users

`/settings/users` is the team-management page. Admin-only for
mutation; managers + viewers see the user list but every action
button is hidden and the API re-enforces the same.

## Layout

- **+ New user** button (top-right)
- **User table**:
  - Avatar / display name
  - Email
  - Role badge (admin / manager / viewer)
  - Sections badge (full access / N sections / locked)
  - Last login (or "never")
  - Edit button (opens edit drawer)

Tenant-scoped: only users in your `organizationId` appear.
Cross-tenant editing is impossible — both UI and API.

## Inviting a teammate

Click **+ New user**. Drawer opens with:

- **Email** (required) — must be unique across all of Philly.
  A user can only belong to one organisation.
- **Display name** (optional) — defaults to the email's local
  part.
- **Role** — admin / manager / viewer (see
  [concepts/roles](concepts/roles)).
- **Dashboard sections** — leave blank for full access (default
  for new users), or check the specific sections to restrict to.

Submit. Two things happen:

1. A `User` row is created in your org with the chosen role +
   sections + a sentinel password hash (`__supabase_auth__` —
   real auth lives in Supabase).
2. A Supabase invite email goes out to the address.

When the invitee clicks the email, sets a password, and signs
in, the system finds their pre-created Philly row by email and
lands them on the dashboard inside your org. They never see the
`/onboarding` "create your own organisation" flow because their
row already exists.

## Editing a user

Click the user's row → drawer opens with:

- **Role picker** — admin / manager / viewer
- **Section checkboxes** — toggle individual sections; "Select
  all" clears to full-access (`null` in DB)

Save persists to `PATCH /api/users` with the userId.

### Last-admin protection

Demoting the last admin in the org is blocked at the API layer:

```
HTTP 400 — Cannot demote the last admin
```

Promote another user to admin first, then demote.

This is enforced server-side; the UI also disables the role
dropdown when there's only one admin, but the server is the
authoritative check.

### Audit-logged

Every role change + section-list change writes an audit row
with the before/after values. Filter `/audit` to
`entity: user, action: update` to see all team changes.

## Removing a user

Drawer → **Remove user** at the bottom. Confirmation prompt;
admin-only.

Hard-deletes the `User` row. Cascade behaviour:

- `TwoFactorRecoveryCode`, `Account`, `Session` — cascade-delete
- `ContactNote`, `Activity` — preserved (the note exists,
  attributed to the deleted user; FK is `RESTRICT` to keep
  history intact)
- `AuditLog` rows the user wrote — preserved (FK is `RESTRICT`,
  audit is append-only)

Use this for hard offboarding. For "they're on leave but coming
back": change role to `viewer` + clear `dashboardSections` to
none. They keep the seat but can't do anything.

## Sending a password reset

The CRM doesn't manage passwords directly — that's Supabase's
job. To reset:

1. Send the user to the brand login page.
2. They click "Forgot password" → receive a magic-link or
   reset email from Supabase.
3. They sign in, the CRM finds their existing Philly user row,
   no further action needed.

For high-privilege accounts, encourage 2FA setup at the brand
auth provider.

## Bulk operations

Not currently supported via UI. To bulk-invite a list of
teammates, use the API:

```bash
curl -X POST https://your-deployment/api/users \
  -H "Cookie: <admin session cookie>" \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","role":"manager"}'
```

Loop over your CSV. The admin's session cookie scopes everyone
to your organisation.

## Common gotchas

- **Email already exists**: someone with that email is in
  Philly already, possibly in another org. The API refuses to
  silently move them. Coordinate with the original admin.
- **Invite email didn't arrive**: Supabase invite is best-
  effort. The Philly user row was still created. Resend by
  having the invitee request a magic link from the brand login
  page.
- **Restricted user sees a section anyway**: refresh — the
  sidebar caches sections per session. Their existing tab will
  show the cached list until reload.

## Where to go next

- **[Invite your team](onboarding/invite-team)** — the
  walk-through.
- **[Roles & permissions](concepts/roles)** — what each role
  can do.
- **[Audit log](features/audit)** — review every team change.
