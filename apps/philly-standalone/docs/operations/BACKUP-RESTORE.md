# Backup + restore drill — operator runbook

_GDPR Art. 32(1)(c) requires "the ability to restore the
availability and access to personal data in a timely manner in the
event of a physical or technical incident". A daily backup that has
never been test-restored does not meet the bar. This runbook is the
quarterly drill that does._

## 1. What's backed up automatically

Supabase ships **Point-in-Time Recovery** on the Pro plan and
**daily logical backups** on every plan. Concretely:

| Layer                 | Tool                   | Retention                | Notes                                                          |
| --------------------- | ---------------------- | ------------------------ | -------------------------------------------------------------- |
| Postgres (logical)    | Supabase backups       | 7 days (Pro: 14 days)    | Full `pg_dump` daily at ~04:00 UTC                              |
| Postgres (PITR)       | Supabase WAL streaming | 7 days (Pro tier only)   | Restore to any second within window                             |
| Auth users + sessions | Supabase auth schema   | Same as Postgres backup  | Auth data is in the same DB                                     |
| Object storage        | Supabase Storage       | 30 days versioning       | Enable per-bucket; not on by default                            |
| Audit log             | `AuditLog` table       | Same as Postgres backup  | Hash-chained — chain integrity verified daily by `audit:chain`  |
| Encryption keys       | Vercel env vars        | _operator responsibility_| Stored in `INTEGRATION_SECRET` + `BLIND_INDEX_SECRET`           |

**Encryption keys are not in the database.** A DB restore will hand
you ciphertext rows; without the matching `INTEGRATION_SECRET` +
`BLIND_INDEX_SECRET` from the day of the backup, encrypted columns
(`Contact.email` / `Contact.phone` / `Contact.notes` /
`ContactNote.content`) are unrecoverable. Key rotation history is
the operator's responsibility (1Password / Vault / a sealed
envelope — pick one but commit to it).

## 2. Restore drill — quarterly

Run this drill at least once per quarter. Block 30 minutes on the
calendar; budget 2x for the first run.

### 2.1 Drill goal

Prove that, given today's backup file + today's encryption keys, a
fresh Supabase project can be brought up with the platform running
and at least one encrypted contact decrypted correctly.

### 2.2 Preconditions

- A second Supabase project (`juandiazllc-restore-drill`). Create
  once, reuse forever — pay the $25/mo Pro fee or destroy/recreate
  it per drill.
- A clone of the repository at `claude/restore-drill` or similar
  scratch branch.
- Today's `INTEGRATION_SECRET` and `BLIND_INDEX_SECRET` from
  production env (`vercel env pull`).

### 2.3 Steps

1. **Snapshot production.** Supabase Dashboard → Database →
   Backups → "Download" the most recent daily backup (.dump file).
   Note the timestamp.

2. **Restore into the drill project.**
   ```bash
   PGPASSWORD=<drill-pw> pg_restore \
     --host=db.<drill-ref>.supabase.co \
     --port=5432 \
     --user=postgres \
     --dbname=postgres \
     --clean --if-exists \
     --no-owner \
     ./juandiazllc-2026-MM-DD.dump
   ```
   Time budget: 2-5 min for current data sizes.

3. **Run schema migrations** to confirm the dump matches code:
   ```bash
   cd apps/philly-standalone
   DATABASE_URL=<drill-conn-string> npx prisma migrate deploy
   ```
   Should report "No pending migrations to apply." If it tries to
   apply something, the production DB has drifted from migration
   history and that's a follow-up to fix.

4. **Verify chain integrity** end-to-end:
   ```bash
   DATABASE_URL=<drill-conn-string> npm run audit:chain
   ```
   Every chain should verify clean. A broken chain in the drill
   restore means the underlying DB has a broken chain — a real
   security event.

5. **Verify encryption decrypts.** Pick one Contact row from the
   drill DB and decrypt its email + notes:
   ```bash
   cd apps/philly-standalone
   DATABASE_URL=<drill-conn-string> \
   INTEGRATION_SECRET=<from-prod-env> \
   tsx -e '
     import { PrismaClient } from "@prisma/client"
     import { decryptPii } from "./lib/philly/pii"
     const p = new PrismaClient()
     const c = await p.contact.findFirst({ select: { email: true, notes: true } })
     console.log({ email: decryptPii(c!.email), notes: decryptPii(c!.notes) })
     await p.$disconnect()
   '
   ```
   Both fields should round-trip to plaintext. If they don't, the
   key in env is from a different epoch than the row was encrypted
   under — surface this immediately, the prod data is at risk.

6. **Boot the app against the drill DB.** Locally:
   ```bash
   cd apps/philly-standalone
   DATABASE_URL=<drill-conn-string> \
   INTEGRATION_SECRET=<from-prod-env> \
   BLIND_INDEX_SECRET=<from-prod-env> \
   npm run dev
   ```
   Log in, open `/contacts`, click into one row. Confirm name +
   email + notes render. Confirm `/api/health` returns 200.

7. **Tear down.** Either:
   - Delete the drill project (cheaper, cleaner).
   - Keep it and `DROP SCHEMA public CASCADE` between drills.

### 2.4 Pass / fail criteria

Drill passes if **all** of these hold:

- [ ] `pg_restore` completed in < 15 min with no errors.
- [ ] `prisma migrate deploy` reports no pending migrations.
- [ ] `audit:chain` verifies clean on every org.
- [ ] One Contact's encrypted email + notes decrypt correctly.
- [ ] Logging in to the drill app + viewing one Contact succeeds.

Pass → record the date in the table below + delete drill.
Fail → file an incident, root-cause before the next drill.

### 2.5 Drill log

Keep this list current. The auditor will ask.

| Date       | Operator    | Backup ts             | Outcome  | Notes |
| ---------- | ----------- | --------------------- | -------- | ----- |
| _TBD_      | _TBD_       | _TBD_                 | _TBD_    | First drill — establish baseline |

## 3. Real disaster — what to do

If a real disaster (data corruption, ransomware, dropped table)
happens, the steps above ARE the runbook. Skip the drill-only
items (drill project, scratch branch); instead:

1. Contain — pause writes (kill the pgbouncer at Supabase, or set
   the org's IP allowlist to `0.0.0.0/32`).
2. Choose a target time `T` — the moment **before** the bad write.
   Use Supabase PITR if the window is recent (< 7 days) and the
   plan supports it; otherwise use the most recent daily backup
   from before `T`.
3. Restore into a new Supabase project.
4. Verify integrity via the same checks above.
5. Cut over: update `DATABASE_URL` in Vercel + Supabase env to point
   to the restored project. Redeploy.
6. Audit-log the incident under `BREACH-RESPONSE.md` if personal
   data was lost or rendered inaccessible — Art. 33 may require a
   72h notification even when it's an availability incident.

## 4. Rotating encryption keys without losing data

When rotating `INTEGRATION_SECRET` or `BLIND_INDEX_SECRET`, the
backup taken **after** rotation is encrypted with the new key —
restoring from it requires the new key. Keep at least the most
recent 14 days of keys in your secret store. Existing helpers:

- `pii:rotate` — online key rotation (zero-downtime), Bundle Q.
- `pii:backfill-hashes` — rebuilds blind-index columns from
  decrypted-then-rehashed values (used after a `BLIND_INDEX_SECRET`
  rotation).

After every rotation, run a fresh restore drill within 7 days. The
last thing you want is to discover during a real incident that the
rotated key never made it to the secrets store.

## 5. References

- Supabase backups: <https://supabase.com/docs/guides/platform/backups>
- Supabase PITR: <https://supabase.com/docs/guides/platform/backups#point-in-time-recovery>
- GDPR Art. 32 — Security of processing
- `OBSERVABILITY.md` — health endpoints + alerting paths
- `BREACH-RESPONSE.md` — Art. 33 / 34 incident protocol
- `PII-ENCRYPTION.md` — encryption + key-rotation specifics
