/* ---------------------------------------------------------------
   PII encryption-at-rest helpers
   ---------------------------------------------------------------
   Thin wrappers around lib/philly/crypto.ts that:

   - Tag every ciphertext with a versioned prefix `enc:v1:` so the
     read path can tell encrypted from legacy-plaintext values
     during rollout.
   - Are no-ops on null / empty strings so the call sites stay
     readable: `data.notes = encryptPii(input.notes)` even when
     the input is null.
   - Fall back to the original ciphertext string if decryption
     fails. We do NOT silently return null on failure — that would
     mask key-rotation mistakes that need to be visible.

   Used for Contact.notes today (Bundle N). Email + phone are NOT
   yet encrypted because they are searched by the API and need a
   blind-index design (HMAC-SHA-256 in a parallel hash column).
   That's a follow-up bundle — see docs/operations/PII-ENCRYPTION.md.
   --------------------------------------------------------------- */

import { encryptSecret, decryptSecret } from './crypto'

const PII_PREFIX = 'enc:v1:'

/**
 * Returns true if the value carries our PII-encryption prefix.
 * Useful for callers that want to skip a no-op decrypt round-trip.
 */
export function isEncryptedPii(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.startsWith(PII_PREFIX)
}

/**
 * Encrypt a PII string for at-rest storage. Returns:
 *   - null/empty input → null (don't store an empty ciphertext)
 *   - already-prefixed input → returned unchanged (idempotent)
 *   - plaintext → `enc:v1:<iv>.<ct>.<tag>`
 */
export function encryptPii(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null
  if (isEncryptedPii(plaintext)) return plaintext
  const ct = encryptSecret(plaintext)
  if (ct == null) return null
  return `${PII_PREFIX}${ct}`
}

/**
 * Decrypt a value that may or may not be encrypted. Returns:
 *   - null/empty → null
 *   - prefixed value that decrypts cleanly → plaintext
 *   - prefixed value that fails to decrypt → null (logged upstream)
 *   - unprefixed value → returned as-is (legacy plaintext during rollout)
 */
export function decryptPii(value: string | null | undefined): string | null {
  if (value == null || value === '') return null
  if (!isEncryptedPii(value)) return value // legacy plaintext
  const inner = value.slice(PII_PREFIX.length)
  return decryptSecret(inner)
}

/**
 * Decrypt every value of a Record-like object's `notes` field if
 * present. Designed for the GET /api/contacts response — the call
 * site does `mapPiiOnRead(contact, ['notes'])` and gets back a
 * shape-identical object with plaintext fields.
 */
export function mapPiiOnRead<T extends Record<string, unknown>>(
  row: T,
  fields: ReadonlyArray<keyof T>,
): T {
  const out = { ...row }
  for (const f of fields) {
    const v = out[f]
    if (typeof v === 'string') {
      ;(out as Record<string, unknown>)[f as string] = decryptPii(v)
    }
  }
  return out
}
