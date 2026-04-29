# Field-level PII encryption at rest

## Status

| Field | Status | Notes |
| ---- | ---- | ---- |
| `Contact.notes` | ✅ encrypted | Bundle N — AES-256-GCM, versioned `enc:v1:` prefix |
| `Contact.email` | ✅ encrypted + blind-index | Bundle P — AES-256-GCM at rest, HMAC-SHA-256 in `emailHash` for search |
| `Contact.phone` | ✅ encrypted + blind-index | Bundle P — same approach as email |
| `ContactNote.content` | ✅ encrypted | Bundle U — AES-256-GCM, same `enc:v1:` envelope as `Contact.notes` |
| `User.twoFactorSecret` | ✅ encrypted | Pre-existing, via `lib/philly/crypto.ts` |
| OAuth tokens (`Integration.accessToken`, etc.) | ✅ encrypted | Pre-existing |

## Blind-index — searchable fields (Bundle P)

`Contact.email` and `Contact.phone` are encrypted at rest with a
fresh IV per row, the same as notes. To keep them searchable we
also store a deterministic HMAC-SHA-256 hash of the **normalised**
value in a parallel column (`emailHash`, `phoneHash`).

The contact list endpoint (`GET /api/contacts?q=…`) routes the
query intelligently:

- `q` looks like an email → exact-match by `emailHash`
- `q` looks like a phone → exact-match by `phoneHash`
- otherwise → name + company substring search only

**Substring search on email or phone is no longer possible** — that
was the explicit GDPR-Art.32 trade. Operators search by full email
they have, or by name/company fragments.

### Key separation

We use a **separate** secret (`BLIND_INDEX_SECRET`) for the HMAC,
distinct from `INTEGRATION_SECRET` used for AES. If one leaks, the
other still protects its dimension. Both must be set in production.

### Email normalisation

Same email entered different ways → same hash:
- `Foo.Bar@gmail.com`, `foobar@gmail.com`, `foobar+receipts@gmail.com`
  all hash to the same value (Gmail-specific dots-don't-matter rule
  + `+tag` aliasing stripped)
- For non-Gmail domains, only `+tag` is stripped; dots are preserved

### Phone normalisation

Strip every char except digits and a leading `+`:
- `+31 6 1234 5678`, `+31-6-1234-5678`, `+31612345678` → same hash
- A leading `+` is significant (`+15551234567` ≠ `15551234567`)
- Numbers shorter than 7 digits are rejected (anything that short
  is a tag, not a real phone)

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

For a brand-new environment, run all three CLIs once. For an
existing environment with legacy plaintext data, run them in this
order:

1. **Deploy** Bundle N + Bundle P. New writes are encrypted /
   hashed; reads transparently handle both legacy and new shapes.

2. **Set both secrets** in production env:
   ```bash
   INTEGRATION_SECRET=<32+ bytes of entropy>
   BLIND_INDEX_SECRET=<32+ bytes of entropy, different from above>
   ```

3. **Backfill `Contact.notes` encryption** (Bundle N):
   ```bash
   npm run pii:backfill -- --dry
   npm run pii:backfill
   # per-tenant:
   npm run pii:backfill -- --org=<organizationId>
   ```

4. **Backfill `Contact.email` + `Contact.phone` encryption + hashes**
   (Bundle P):
   ```bash
   npm run pii:backfill-hashes -- --dry
   npm run pii:backfill-hashes
   ```

5. **Backfill `ContactNote.content` encryption** (Bundle U):
   ```bash
   npm run pii:backfill-notes -- --dry
   npm run pii:backfill-notes
   # per-tenant:
   npm run pii:backfill-notes -- --org=<organizationId>
   ```

6. **Verify** by sampling:

   ```sql
   -- notes should all be enc:v1:* after step 3
   SELECT id, LEFT(notes, 7) AS prefix FROM Contact
   WHERE notes IS NOT NULL LIMIT 20;

   -- email/phone should all be enc:v1:* and have hashes after step 4
   SELECT id,
          LEFT(email, 7) AS email_prefix,
          (emailHash IS NOT NULL) AS has_email_hash,
          LEFT(phone, 7) AS phone_prefix,
          (phoneHash IS NOT NULL) AS has_phone_hash
   FROM Contact LIMIT 20;

   -- ContactNote.content should all be enc:v1:* after step 5
   SELECT id, LEFT(content, 7) AS prefix FROM ContactNote
   WHERE content IS NOT NULL AND content <> '' LIMIT 20;
   ```

All four backfills are idempotent and per-row safe — re-running
them skips already-migrated rows and continues past per-row errors.
Exit code
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
- Backfill CLIs:
  - `scripts/encrypt-contact-notes.ts` → `npm run pii:backfill` (Contact.notes)
  - `scripts/encrypt-contact-note-content.ts` → `npm run pii:backfill-notes` (ContactNote.content)
  - `scripts/backfill-contact-blind-index.ts` → `npm run pii:backfill-hashes` (email/phone hashes)
- Rotation CLI: `scripts/rotate-pii-key.ts` → `npm run pii:rotate` (rotates Contact.notes + ContactNote.content together)
- Tests: `lib/philly/pii.test.ts`
