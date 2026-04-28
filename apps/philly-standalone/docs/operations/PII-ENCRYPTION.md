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

## Key rotation

Today the platform supports rotation only with downtime, because
the same key encrypts every row.

To rotate cleanly **without** downtime, the path is:

1. Add `lib/philly/crypto.ts` support for a key list, with the
   newest key used for writes and any key in the list valid for
   reads. (Estimate: half a day of focused work.)
2. Generate a new `INTEGRATION_SECRET_V2` env var, deploy with
   *both* set.
3. Run a CLI similar to `pii:backfill` that re-encrypts every row
   under the new key.
4. Once 100% migrated, retire the old key (delete from env, then
   from the code).

Until that's shipped, the practical rotation procedure is:

1. Take the platform offline.
2. Set the new env var.
3. Re-encrypt rows by exporting → decrypting under the old key →
   encrypting under the new → importing.
4. Bring the platform back up.

This is documented as a known gap.

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
