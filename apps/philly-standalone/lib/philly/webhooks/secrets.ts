/* ---------------------------------------------------------------
   Webhook secret helpers — symmetric encryption at rest.
   ---------------------------------------------------------------
   The HMAC secret stored on Webhook.secret needs to be readable so
   the dispatcher can sign outbound deliveries. We encrypt it at
   rest with AES-256-GCM (lib/philly/crypto.ts) and unwrap it on
   read.

   Backwards-compatible: rows written before encryption was wired
   up have plaintext secrets. `looksEncrypted()` distinguishes the
   two so a backfill is not strictly required.
   --------------------------------------------------------------- */

import { decryptSecret, looksEncrypted } from '@/lib/philly/crypto'

/**
 * Decrypt a stored webhook secret, falling back to the raw value if
 * the row predates encryption. Returns null only if decryption fails
 * on an apparently-encrypted value — callers should treat that as
 * "secret unusable, skip this webhook."
 */
export function unwrapWebhookSecret(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (looksEncrypted(stored)) return decryptSecret(stored)
  return stored
}

/**
 * Mask a webhook secret for display in API responses. The input may
 * be encrypted (storage form) or plaintext (just rotated). We unwrap
 * first, then show the leading 8 chars + ellipsis. The full secret
 * is only ever returned to the operator at creation / rotation time.
 */
export function maskWebhookSecret(stored: string | null | undefined): string {
  const plaintext = unwrapWebhookSecret(stored)
  if (!plaintext) return ''
  return plaintext.slice(0, 8) + '...'
}
