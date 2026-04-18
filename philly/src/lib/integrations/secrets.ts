/* ---------------------------------------------------------------
   Integration secret helpers — decrypt tokens at read time.
   ---------------------------------------------------------------
   Tokens are stored encrypted via encryptSecret() when written.
   Anything that USES a token (OAuth refresh, connector.test, revoke)
   must go through decryptIntegration() to unwrap it.

   Backwards-compatible: rows saved before we started encrypting will
   have plaintext tokens that decryptSecret() returns null for — we
   detect that and fall back to the raw value via looksEncrypted().
   --------------------------------------------------------------- */

import { decryptSecret, looksEncrypted } from '@/lib/crypto'

export interface IntegrationLike {
  accessToken?: string | null
  refreshToken?: string | null
}

/**
 * Unwrap the access + refresh tokens for an Integration row.
 * Returns plaintext suitable for passing to the provider SDK.
 *
 * Legacy rows (plaintext) pass through untouched. New rows are AES-256-GCM
 * decrypted. If decryption fails on an apparently-encrypted value, returns
 * null for that field — the caller should treat this as "token missing" and
 * prompt the user to reconnect.
 */
export function decryptIntegration<T extends IntegrationLike>(row: T): T & {
  accessToken: string | null
  refreshToken: string | null
} {
  return {
    ...row,
    accessToken: unwrap(row.accessToken),
    refreshToken: unwrap(row.refreshToken),
  }
}

function unwrap(v: string | null | undefined): string | null {
  if (!v) return null
  if (looksEncrypted(v)) return decryptSecret(v)
  // Legacy plaintext (from before we encrypted)
  return v
}
