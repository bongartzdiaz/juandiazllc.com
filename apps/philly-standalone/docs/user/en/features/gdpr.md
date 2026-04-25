---
slug: features/gdpr
lang: en
title: GDPR admin
summary: The /gdpr page — process data-subject access and erasure requests on behalf of your contacts, view the Records of Processing Activities.
tags: [features, gdpr, admin, privacy, compliance]
related: [concepts/gdpr, concepts/tenancy, features/audit]
updated: 2026-04-25
---

# GDPR admin

`/gdpr` is the admin page for processing GDPR Articles 15
(access) and 17 (erasure) requests on behalf of contacts in
your organisation. **Admin-only.** Also displays the Records of
Processing Activities (Article 30) for review.

For your **own** account data, use the self-service flow at
`/api/me/data-export` and `/api/me/account-deletion`. Those
don't need admin access.

## Layout

Two sections on the page:

1. **Data-subject rights (Art. 15 & 17)** — the form for
   processing inbound requests.
2. **Records of Processing Activities (Art. 30)** — the
   read-only register of every processing activity, served
   from `lib/gdpr/ropa.ts`.

## Processing an access request (DSAR)

A contact / volunteer / guest writes in saying "give me
everything you have about me":

1. Tab: **Access request (export)**.
2. Enter their email.
3. Optional: a reason / ticket reference for your records.
4. Click **Generate export**.

The endpoint `POST /api/admin/gdpr/data-subject-export` finds
every PII row across the database that references the given
email **within your organisation's scope** (cross-tenant data
is never returned). Models searched:

- `Contact` (by email)
- `Reservation` (by guestEmail, scoped via Room → Organization)
- `Volunteer` (by email)
- `OpenHouseVisit` (by email, scoped via OpenHouse → Property → Organization)
- `Message` (by from/to address, scoped via Conversation → Organization)
- `ESignature` (by signerEmail, scoped via Transaction → Organization)
- `GdprConsentRecord` (by hashed email)

Returns JSON, downloaded immediately. The file is named
`dsar-<hash-prefix>-<date>.json` so it doesn't leak the
subject's email in the filename.

Record-keeping (`GdprExportLog`):

- Actor (you), the SHA-256 hash of the subject's email,
  per-model row counts, your IP, timestamp.
- Retained for 6 years (matches standard claim windows).

## Processing an erasure request

A contact writes in saying "delete everything you have about
me":

1. Tab: **Erasure (delete)**.
2. Enter their email.
3. **Reason is mandatory** — Art. 30 record-keeping requires
   the controller to document why an erasure was processed.
   Examples: "subject phone-verified, ticket #1234".
4. Confirm the prompt: "Permanently erase all data for X? This
   cannot be undone."
5. Click **Erase data**.

The endpoint `POST /api/admin/gdpr/data-subject-erasure`
hard-deletes every row referencing the email across the same
PII tables as the export. Cascade deletes handle children
(ContactNote, Activity).

Record-keeping (`GdprErasureLog`):

- Actor, SHA-256 hash of the email, per-model row counts,
  reason text, your IP, timestamp.
- **Retained indefinitely** — the proof outlives the data.
  Hashing means the regulator can verify "you erased X's data"
  by hashing X's email and looking up the row, while we don't
  retain X's email after the erasure.

If the proof-of-erasure log fails to write (DB error), the
endpoint returns 500 instead of 200. Without the log entry,
we'd be unable to prove the erasure to a regulator — itself
a breach.

## Rate limits

- Admin DSAR: 10 per hour per admin
- Admin erasure: 10 per hour per admin

These are generous for normal use; tight enough that a
runaway script can't spray erasures.

## Records of Processing Activities (Article 30)

The lower section of `/gdpr` lists every processing activity
the CRM performs:

- Operator authentication
- Contact / business-relationship management
- Hospitality reservations
- Volunteer roster
- Open-house visitor capture
- Email & SMS correspondence
- Electronic signatures
- Security audit log
- Proof-of-erasure register

Per activity: lawful basis, data subject categories, data
categories, recipients, third-country transfers, retention
period, security measures.

This is the document a regulator would ask for under Art. 30.
The register lives as code at `lib/gdpr/ropa.ts` so it's
reviewed in pull requests alongside the actual implementation
— drift between policy and reality surfaces in code review.

## Common questions

**Q: Can I export my own account data without going through
this page?**
A: Yes — `GET /api/me/data-export`. That's the operator
self-service flow under Article 15.

**Q: What if a contact is in multiple of my organisations
(separate tenants)?**
A: Each org processes its own request. The endpoint is
tenant-scoped — the admin's `organizationId` bounds the search.
A contact in Org A and Org B asks each org separately.

**Q: What about the proof-of-erasure log itself? Isn't the
hash personal data?**
A: SHA-256 of an email is pseudonymous. Brute-forceable given
a known email candidate, but not reversible from the hash
alone. The retention rationale (indefinite) is balanced against
the legitimate interest in proving compliance to regulators —
documented in `docs/legal/PRIVACY-NOTICE.md`.

## Where to go next

- **[GDPR concepts](concepts/gdpr)** — the full policy context.
- **[Tenancy & data isolation](concepts/tenancy)** — why
  cross-tenant DSARs are impossible.
- **[Audit log](features/audit)** — the forensic record that
  underpins all of the above.
- `docs/legal/BREACH-RESPONSE.md` — the 72-hour breach runbook.
