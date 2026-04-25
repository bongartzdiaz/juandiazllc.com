---
slug: features/audit
lang: en
title: Audit log
summary: The append-only forensic record of every mutation in your tenant — who-did-what, with cryptographic hash-chain tamper-evidence.
tags: [features, audit, security, compliance, gdpr, admin]
related: [concepts/tenancy, concepts/gdpr, features/gdpr]
updated: 2026-04-25
---

# Audit log

`/audit` is your tenant's forensic record. Every create / update
/ delete on an entity writes a row. The page is admin + manager
visible (read-only); admins additionally get the chain
verification button.

## What gets logged

Every mutation across:

- Contacts, deals, projects, properties, reservations, volunteers
- Pipelines, stages, automations, webhooks, integrations, API keys
- Users (role changes, section-list edits)
- GDPR operations (data exports, erasures — the actor + the
  hashed-email of the subject)

The row contains:

- **Actor** — which user did it (or `system` for cron / inbound
  webhooks)
- **Action** — `create` | `update` | `delete`
- **Entity** — what kind of record (`contact`, `deal`, etc.)
- **Entity ID** — the record's id (or hashed email for GDPR
  rows)
- **Changes** — JSON diff `{field: {old, new}}` for updates
- **Timestamp**
- **Hash + previous hash** — the chain pointer (see below)

## Filters

The toolbar has:

- **Date-range** — 1 day / 7 days / 30 days / all time
- **Entity** — dropdown, 37+ types
- **Actor** — pick from your team
- **Action** — create / update / delete

URL state, so a filtered view is shareable.

## Expanding a row

Click any row to expand into the per-row diff view. Shows
old → new for every changed field. Useful for "what did Marco
change on this contact yesterday?".

For high-cardinality changes (e.g. JSON fields), the diff
shows truncated values with a "..." indicator. Full payload is
in the database; query directly via the API if forensics needs
the whole thing.

## Hash chain (tamper-evidence)

Every audit row contains:

- **prevHash** — the hash of the most-recent existing row in
  this tenant at the moment of write
- **hash** — `SHA-256(prevHash || canonical_json(this row))`

Modifying any row breaks `recompute(row) === stored hash`.
Deleting any row leaves the next row's `prevHash` orphaned.
Both are detected by the verifier.

`GET /api/admin/audit/verify` (admin only) walks the chain and
returns a structured report:

```json
{
  "ok": true,
  "totalRows": 1247,
  "hashedRows": 1247,
  "unhashedRows": 0,
  "broken": [],
  "forked": [],
  "lastHash": "9a3f..."
}
```

- **Broken** — row whose stored hash doesn't match its content.
  This is **real tampering** — escalate to security and follow
  the [breach response runbook](../../../../legal/BREACH-RESPONSE.md).
- **Forked** — row whose `prevHash` points to no other row.
  Most often benign (two writes raced for the same predecessor),
  rarely sinister. The verifier reports forks separately so you
  can investigate without panic.
- **Unhashed** — rows pre-dating the hash-chain rollout. Counted
  separately; not a verification failure.

The endpoint returns 200 if `ok: true`, 409 if not. **Wire your
monitoring to alert on 409.** A 409 means somebody (or
something) modified or deleted an audit row out-of-band.

## Recommended cadence

- **Weekly** — admins skim the log filtered to high-risk
  entities (`user`, `apiKey`, `integration`, `automationRule`).
- **Monthly** — run the chain verification.
- **On suspicion** — verifier first, then dig into the diff
  view for the suspicious window.

## Retention

Audit rows are retained **1 year** by default, then auto-purged
by the nightly retention cron (`/api/cron/gdpr-retention`).
Override via `AUDIT_RETENTION_DAYS` env var if you need longer.
The retention cron itself writes an audit row (`entity:
auditLog, action: delete, count: N`) on each sweep.

Lowering this below 1 year may violate Article 30 GDPR
record-keeping; check `docs/legal/PRIVACY-NOTICE.md` first.

## Append-only contract

The CRM exposes no `DELETE /api/audit/[id]` endpoint. Audit rows
are append-only by API contract. The retention cron uses a
direct database call; that path is auth-gated by `CRON_SECRET`
and itself writes an audit entry naming the rows it removed.

If you find a way to delete an audit row through any application
path — that's a security bug. File it.

## Where to go next

- **[Tenancy & data isolation](concepts/tenancy)** — how your
  audit log is scoped.
- **[GDPR concepts](concepts/gdpr)** — Article 30 record-keeping
  context.
- **[GDPR admin page](features/gdpr)** — the page that processes
  data-subject requests, all of which write audit entries.
