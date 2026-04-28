/* ---------------------------------------------------------------
   Blind index — searchable encryption for email + phone (Bundle P)
   ---------------------------------------------------------------
   GDPR Art. 32 wants encryption-at-rest for personal data, but the
   contacts API also needs to search by email. Encrypting with a
   random IV (lib/philly/pii.ts) breaks search. Solution: store the
   ciphertext in the main column AND a deterministic HMAC-SHA-256
   of the normalised value in a parallel `<field>Hash` column.

   Lookups are by hash (exact match, indexed); the actual value is
   served encrypted at rest and decrypted on read. An attacker who
   exfiltrates the database snapshot sees neither plaintext nor a
   way to recover plaintext — the hash is non-reversible without
   the HMAC key.

   ── Key separation ─────────────────────────────────────────────
   We deliberately use a SEPARATE secret (`BLIND_INDEX_SECRET`) from
   the AES key (`INTEGRATION_SECRET`). If one is leaked the other
   still protects its dimension: a leaked HMAC key reveals which
   rows share the same email but not what those emails are; a
   leaked AES key reveals individual values but not which rows
   match each other (every row has a fresh IV). Defence in depth.

   In production BLIND_INDEX_SECRET MUST be set or this module
   refuses to compute hashes (returns null). New writes then store
   only the encrypted value, and lookups by hash will not work
   until the secret is configured + a backfill is run.

   ── Normalisation ──────────────────────────────────────────────
   Same value entered different ways must produce the same hash.
   normaliseEmail:  trim, lowercase, drop dots in the local-part
                    if the domain is gmail.com (Gmail-specific),
                    drop +tags after @gmail.com / +tags everywhere
   normalisePhone:  strip everything except digits and leading +
   --------------------------------------------------------------- */

import crypto from 'crypto'

let HMAC_KEY: Buffer | null = null
let HMAC_KEY_LOADED = false

function loadHmacKey(): Buffer | null {
  if (HMAC_KEY_LOADED) return HMAC_KEY
  HMAC_KEY_LOADED = true
  const raw = process.env.BLIND_INDEX_SECRET
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      // Don't throw — we want the app to start so the operator can
      // see the warning in logs and rotate to add the secret. Fall
      // back to silent-disable: hashes return null, search by hash
      // returns nothing, but writes/reads of ciphertext still work.
      console.warn(
        '[blind-index] BLIND_INDEX_SECRET is not set — email/phone search will not work',
      )
    }
    return null
  }
  HMAC_KEY = crypto.createHash('sha256').update(raw).digest()
  return HMAC_KEY
}

/** Test-only: drop the cached HMAC key so the next call re-reads env. */
export function __resetBlindIndexForTests(): void {
  HMAC_KEY = null
  HMAC_KEY_LOADED = false
}

/** Lower-cases, trims, and applies a Gmail-specific normalisation
 *  (drop dots in local-part, strip `+tag` aliasing) so that
 *  `Foo.Bar+test@gmail.com` and `foobar@gmail.com` produce the
 *  same hash. Non-Gmail emails get trim + lowercase only. */
export function normaliseEmail(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = raw.trim().toLowerCase()
  if (!s) return null
  // Cheap email shape check — not RFC-strict, just to reject
  // obvious non-emails before hashing.
  const at = s.indexOf('@')
  if (at <= 0 || at === s.length - 1) return null
  const local = s.slice(0, at)
  const domain = s.slice(at + 1)
  if (!domain.includes('.')) return null
  // Strip +tag aliasing (e.g. "user+receipts@example.com" → "user@example.com")
  const tagIdx = local.indexOf('+')
  let normLocal = tagIdx === -1 ? local : local.slice(0, tagIdx)
  // Gmail-specific: dots in the local part are insignificant.
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    normLocal = normLocal.replace(/\./g, '')
  }
  if (!normLocal) return null
  return `${normLocal}@${domain}`
}

/** Strip everything except digits and a leading `+`. Returns null
 *  if there are fewer than 7 digits (anything shorter is a tag, not
 *  a real phone number). */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const s = raw.trim()
  if (!s) return null
  const hasPlus = s.startsWith('+')
  const digits = s.replace(/[^0-9]/g, '')
  if (digits.length < 7) return null
  return hasPlus ? `+${digits}` : digits
}

/** Compute the HMAC-SHA-256 hash of a normalised email. Returns
 *  null if the input is null/empty/un-normalisable, OR if the
 *  HMAC key is not configured. The `null` return is deliberate —
 *  callers should write `emailHash: hashEmail(email)` and let the
 *  column be NULL when there's no value or no key. */
export function hashEmail(raw: string | null | undefined): string | null {
  const norm = normaliseEmail(raw)
  if (!norm) return null
  const key = loadHmacKey()
  if (!key) return null
  return hmac(key, `email:${norm}`)
}

/** Same as hashEmail for phone numbers. */
export function hashPhone(raw: string | null | undefined): string | null {
  const norm = normalisePhone(raw)
  if (!norm) return null
  const key = loadHmacKey()
  if (!key) return null
  return hmac(key, `phone:${norm}`)
}

/** True if the search term looks like an email (has an @ and a dot
 *  after it). Used by the contacts list endpoint to decide whether
 *  to do an exact-match lookup by hash or a name/company substring
 *  search. */
export function looksLikeEmailQuery(s: string): boolean {
  const at = s.indexOf('@')
  if (at <= 0 || at === s.length - 1) return false
  return s.slice(at + 1).includes('.')
}

/** True if the search term is plausibly a phone number — at least
 *  7 digits, optionally with separators / a leading +. */
export function looksLikePhoneQuery(s: string): boolean {
  const digits = s.replace(/[^0-9]/g, '')
  return digits.length >= 7 && /^[\d\s+\-().]+$/.test(s.trim())
}

function hmac(key: Buffer, message: string): string {
  return crypto.createHmac('sha256', key).update(message).digest('hex')
}
