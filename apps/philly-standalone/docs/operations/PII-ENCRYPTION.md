# Field-level PII encryption at rest

## Status

| Field | Status | Notes |
| ---- | ---- | ---- |
| `Contact.notes` | ✅ encrypted | Bundle N — AES-256-GCM, versioned `enc:v1:` prefix |
| `Contact.email` | ⏳ planned | Needs blind-index (HMAC-SHA-256) for search |
| `Contact.phone` | ⏳ planned | Same |
| `ContactNote.content` | ⏳ planned | Same approach as `Contact.notes` |
| `User.twoFactorSecret` | ✅ encrypted | Pre-existing, via `lib/philly/crypto.ts` |
| OAuth tokens (`Integration.accessToken`, etc.) | ✅ encrypted | Pre-existing |

## Why these fields, not all of them?

GDPR Art. 32 requires encryption "as appropriate". Free-text notes are
the highest-risk field on the platform — they routinely accumulate
personal opinions, financial figures, occasional health/legal context
the data subject did not knowingly disclose. Encrypting them at rest
costs nothing (no search needed) and removes a whole class of "data
accidentally exposed in a database backup" incident.

`email` and `phone` are deliberately deferred because the API does
search them (see the `OR: [{ email: { contains } }, { phone: { contains } } ]`
in `app/api/contacts/route.ts`). Encrypting with a random IV
breaks that. The follow-up bundle adds a blind-index column
(`emailHash` = HMAC-SHA-256(email, KEY_HMAC)) and rewrites the
queries to look up by hash; the actual value stays encrypted.

## Key management

Encryption key is derived from `INTEGRATION_SECRET` (preferred) or
`NEXTAUTH_SECRET` (fallback) via SHA-256 — see `lib/philly/crypto.ts`.

- **Production:** `INTEGRATION_SECRET` MUST be set or the app
  refuses to start. 32+ bytes of entropy. Rotate via the procedure
  below.
- **Dev:** A deterministic placeholder is used so tests/local
  runs work, with a clear "do not use in prod" warning. Never run
  the platform in front of real customers without setting the env
  var.

## Storage format

```
enc:v1:<iv>.<ct>.<tag>
```

- `enc:v1:` — versioned prefix so we can introduce v2 (longer key,
  different algorithm) without ambiguity.
- `<iv>` — 12 random bytes (GCM-recommended), base64url.
- `<ct>` — ciphertext, base64url.
- `<tag>` — 16-byte AES-GCM authentication tag, base64url.

Values without the `enc:v1:` prefix are treated as legacy plaintext
on read — `decryptPii(s)` returns them unchanged. This lets the
rollout be online: the migration runs at any time, and queries
keep working before, during, and after.

## Rollout / backfill

1. **Deploy Bundle N.** New writes are encrypted; reads transparently
   handle both shapes.
2. **Run the backfill once per environment.**

   ```bash
   # Dry-run first — counts what would change.
   npm run pii:backfill -- --dry

   # Then for real, all orgs:
   npm run pii:backfill

   # Or per-tenant:
   npm run pii:backfill -- --org=<organizationId>
   ```

3. **Verify** by sampling rows:

   ```sql
   SELECT id, LEFT(notes, 7) AS prefix
   FROM Contact
   WHERE notes IS NOT NULL
   LIMIT 20;
   ```

   Every prefix should be `enc:v1:` after the backfill completes.

The backfill is idempotent and per-row safe — re-running it skips
already-encrypted rows and continues past per-row errors. Exit code
1 = at least one row failed (printed at the end with the row id).

## Key rotation (online — Bundle Q)

`lib/philly/crypto.ts` supports a key list. Writes use the **first**
configured key; reads try every configured key in order. A standard
rotation is a three-phase deploy with **zero downtime**:

### Phase 1 — deploy with both keys

Set both env vars. The NEW key takes the primary slot, the OLD key
moves to the V2 slot:

```bash
INTEGRATION_SECRET=<NEW>
INTEGRATION_SECRET_V2=<OLD>
```

Deploy. From this point new writes encrypt under `<NEW>`, and old
rows continue to decrypt under `<OLD>` — both flows work.

### Phase 2 — re-encrypt every row under the new key

```bash
# Dry-run first — counts what would change.
npm run pii:rotate -- --dry

# Then for real:
npm run pii:rotate

# Or per-tenant (useful for staged rollouts):
npm run pii:rotate -- --org=<organizationId>
```

The CLI is idempotent and per-row safe. It reads each encrypted
row, identifies which key opened it (returns `keyIndex`), and if the
match was anything other than the primary key (index 0), re-encrypts
under primary and writes back. Exit codes:

- `0` — every non-primary row re-encrypted (or dry-run completed)
- `1` — at least one row failed (errors listed at the end)
- `2` — only one key configured; nothing to rotate from
- `3` — transient error

Run it multiple times during the rotation window if you want — once
all rows show up as `keyIndex 0`, the work is done.

### Phase 3 — retire the old key

Once `npm run pii:rotate -- --dry` reports `rotated=0` and
`already-primary=<all rows>`, you can remove `INTEGRATION_SECRET_V2`
from production env and redeploy. The OLD key is now unused.

> **Why not auto-rotate on every read?** We could re-encrypt-on-read
> opportunistically, but that turns idempotent reads into writes
> (lock contention, audit-log bloat, breaks `prisma migrate deploy`
> on a read-heavy host). Better to do it explicitly via the CLI.

### Multi-step rotation

Up to 8 keys (`INTEGRATION_SECRET` plus `INTEGRATION_SECRET_V2…V8`)
can be active simultaneously. This is mostly useful when staging
many short-lived keys for compliance attestations — the common case
is just primary + one previous key.

## What this protects against

- A leaked database backup. Rows are useless without the key.
- A read-only DB snapshot a sub-processor accidentally retains
  past the contractual window.
- A junior operator who runs `SELECT * FROM Contact` against
  prod and pastes the result into a Slack DM. They see ciphertext.

## What this does NOT protect against

- A compromised application server with both DB access and the
  key in env. Use OS-level secrets isolation + audit logs (already
  in place).
- A SQL-injection vulnerability that runs the API's own decrypt
  path. Continue to validate input via Zod and parameterize via
  Prisma (already in place).
- A malicious operator with admin-level CRM access — they can
  read decrypted notes through the normal UI. This is by design;
  defence is the audit log + RBAC.

## Reference

- Helpers: `lib/philly/pii.ts`
- AES-256-GCM core: `lib/philly/crypto.ts`
- Backfill CLI: `scripts/encrypt-contact-notes.ts` (`npm run pii:backfill`)
- Tests: `lib/philly/pii.test.ts`
