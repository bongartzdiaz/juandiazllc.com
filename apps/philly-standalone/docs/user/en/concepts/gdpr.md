---
slug: concepts/gdpr
lang: en
title: Privacy & your data rights
summary: Self-service export and account deletion for operators, plus the admin-led data-subject flow for contacts.
tags: [concepts, gdpr, privacy, data-rights, security]
related: [onboarding/create-organization, concepts/tenancy, features/gdpr]
updated: 2026-04-25
---

# Privacy & your data rights

Philly ships GDPR-compliant tooling out of the box. Two flows
exist:

1. **Self-service** — for you, the operator. Export your
   account data or schedule deletion of your account. No admin
   needed.
2. **Admin-led** — for contacts/volunteers/guests stored *by* an
   organization. An admin processes the request on the org's
   behalf as the data controller.

## Self-service: export your data

Article 15 GDPR (right of access).

- Endpoint: `GET /api/me/data-export`
- Returns: JSON download of every record the CRM holds about
  you — your `User` row, your authored notes, your activity
  history, your audit log entries, etc. Secret fields
  (`passwordHash`, `twoFactorSecret`, OAuth tokens) are redacted
  for safety; the rest is your data verbatim.
- Rate-limited to 5 exports per month per user.
- Audit-logged: a `GdprExportLog` row records that an export
  happened, with a SHA-256 hash of your email (so the proof
  outlives the eventual deletion of your account, without
  retaining the email itself).

Trigger from the dashboard via your profile menu, or `curl` it
directly with your session cookie.

## Self-service: delete your account

Article 17 GDPR (right to erasure).

- `POST /api/me/account-deletion {confirm: "DELETE"}` schedules
  your account for deletion in **30 days**. During the grace
  window:
  - You can still sign in and use the CRM normally.
  - You can cancel the scheduled deletion any time via
    `DELETE /api/me/account-deletion`.
- After 30 days, the nightly retention cron
  (`/api/cron/gdpr-retention`) hard-deletes your `User` row.
  Cascade delete handles `ContactNote`, `Activity`,
  `TwoFactorRecoveryCode`, and similar children automatically.
- A `GdprErasureLog` row records the erasure with a hash of
  your email — proof for a regulator that we processed the
  request, kept indefinitely.
- **Last-admin protection**: if you're the only admin in your
  organization, the system refuses to schedule your deletion
  with a `409 Conflict`. Promote another teammate to admin
  first, otherwise the org would be orphaned.

## Admin-led: data subject access request (DSAR)

When a contact, volunteer, guest, or other third party in your
organization asks "what data do you have about me?", the admin
processes it via:

- `POST /api/admin/gdpr/data-subject-export` with `{email, reason?}`
- Returns: JSON download of every row across every PII-bearing
  table that references that email — within your organization.
  Cross-tenant data is never returned.

The request is rate-limited (10 per hour per admin) and logged
with the actor and the SHA-256 of the subject's email.

## Admin-led: data subject erasure

When a contact asks "delete everything you have about me":

- `POST /api/admin/gdpr/data-subject-erasure` with
  `{email, reason, confirm: "ERASE"}`
- The reason field is **mandatory** — Article 30 record-keeping
  requires the controller to document why an erasure was
  processed.
- Hard-deletes every PII row referencing that email (Contact,
  Reservation, Volunteer, OpenHouseVisit, Message, ESignature,
  CallLog, SmsMessage). Cascade deletes handle children
  (ContactNote, Activity).
- A `GdprErasureLog` row records the erasure with a SHA-256
  hash of the email and the per-model row counts. **Kept
  indefinitely** — the proof must outlive the data itself.

If the proof-of-erasure log fails to write (DB error, etc.),
the endpoint surfaces a 500 rather than a 200. Without the
log entry, we'd be unable to prove the erasure to a regulator,
which would itself be a breach.

## Records of Processing Activities (Article 30)

The full register of every processing activity Philly performs
lives at `lib/gdpr/ropa.ts` and is rendered for admins at
`/gdpr`. It documents:

- What activities we run (operator authentication, contact
  management, hospitality reservations, etc.)
- The lawful basis for each (Art. 6(1)(b) contract, (1)(f)
  legitimate interest, (1)(c) legal obligation, etc.)
- Data subject categories
- Data category and retention period
- Recipients and any third-country transfers
- Technical and organisational security measures

This is the document a regulator would ask for under Article 30.

## Privacy notice & cookie policy

Both ship in `docs/legal/`:

- `PRIVACY-NOTICE.md` — the Article 13/14 notice template, ready
  to adapt to your legal entity name.
- `COOKIE-POLICY.md` — the audit of every cookie the CRM sets.
  Spoiler: it's strictly-necessary-only, no banner needed.

## Breach response

`docs/legal/BREACH-RESPONSE.md` is the on-call runbook for a
suspected personal-data breach: triage, investigate, notify
the supervisory authority within 72 hours (Art. 33), notify
affected data subjects when the risk is high (Art. 34), and
write a post-incident review.

## Where to go next

- **[GDPR admin page](features/gdpr)** — the UI that admins use
  to process DSARs.
- **[Tenancy & data isolation](concepts/tenancy)** — why
  cross-tenant DSARs are impossible.
- **[Audit log](features/audit)** — the forensic record that
  underpins all of the above.
