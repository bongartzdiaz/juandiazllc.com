/* AES-256-GCM symmetric encryption for secrets at rest.
   Used to encrypt OAuth tokens, API keys, integration credentials,
   and (Bundle N+) Contact.notes.

   Storage format (base64url):  iv.ciphertext.authTag
   All three parts are base64url-encoded and dot-separated.

   ── Key sources & rotation ─────────────────────────────────────
   We support a key list to enable online rotation (Bundle Q). Keys
   are derived from these env vars, in priority order:

     INTEGRATION_SECRET     — primary (and the one used for new writes)
     INTEGRATION_SECRET_V2  — second key, valid for reads
     INTEGRATION_SECRET_V3  — third key, valid for reads
     ... up to V8 ...
     NEXTAUTH_SECRET        — last-resort fallback (legacy alias)

   Writes always use the FIRST key (INTEGRATION_SECRET). Reads try
   each configured key in order and return the first that
   authenticates successfully. This means rotation is a three-step
   procedure with zero downtime:

     1. Set INTEGRATION_SECRET=<NEW>, INTEGRATION_SECRET_V2=<OLD>.
        Deploy. New writes encrypt under <NEW>; old rows still read
        under <OLD>.
     2. Run `npm run pii:rotate` to re-encrypt every row under <NEW>.
     3. Once the rotate CLI confirms 100% coverage, unset
        INTEGRATION_SECRET_V2 and redeploy. The retired key is gone.

   In production INTEGRATION_SECRET (or NEXTAUTH_SECRET) MUST be set
   or the module throws at import so the app refuses to start. */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12 // GCM recommended
const TAG_LEN = 16

const KEY_ENV_VARS = [
  'INTEGRATION_SECRET',
  'INTEGRATION_SECRET_V2',
  'INTEGRATION_SECRET_V3',
  'INTEGRATION_SECRET_V4',
  'INTEGRATION_SECRET_V5',
  'INTEGRATION_SECRET_V6',
  'INTEGRATION_SECRET_V7',
  'INTEGRATION_SECRET_V8',
] as const

function deriveKeys(): Buffer[] {
  const keys: Buffer[] = []
  for (const name of KEY_ENV_VARS) {
    const raw = process.env[name]
    if (raw && raw.length > 0) {
      // Allow raw hex, base64, or any string — hash to 32 bytes.
      keys.push(crypto.createHash('sha256').update(raw).digest())
    }
  }
  if (keys.length === 0) {
    const fallback = process.env.NEXTAUTH_SECRET
    if (fallback) {
      keys.push(crypto.createHash('sha256').update(fallback).digest())
    }
  }
  if (keys.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTEGRATION_SECRET (or NEXTAUTH_SECRET) must be set in production')
    }
    // Dev-only deterministic placeholder so tests/local runs don't crash.
    // WARNING: tokens encrypted with this key are not secret.
    keys.push(crypto.createHash('sha256').update('dev-integration-secret-do-not-use-in-prod').digest())
  }
  return keys
}

// Lazy-init so tests can set env vars before first use. Tests can
// reset via __resetCryptoKeysForTests().
let KEYS: Buffer[] | null = null
function getKeys(): Buffer[] {
  if (!KEYS) KEYS = deriveKeys()
  return KEYS
}

/** Test-only: drop the cached key list so the next call re-reads env. */
export function __resetCryptoKeysForTests(): void {
  KEYS = null
}

/** How many keys are currently configured (read-side). Useful for
 *  diagnostics + the rotate CLI. */
export function configuredKeyCount(): number {
  return getKeys().length
}

/** Encrypt a UTF-8 string with the PRIMARY key. Returns `iv.ct.tag` in base64url. */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null
  const iv = crypto.randomBytes(IV_LEN)
  const primaryKey = getKeys()[0]
  const cipher = crypto.createCipheriv(ALGO, primaryKey, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${ct.toString('base64url')}.${tag.toString('base64url')}`
}

interface DecryptDetailedResult {
  /** Decrypted plaintext, or null if every configured key failed. */
  plaintext: string | null
  /** Index into getKeys() of the key that worked. -1 on failure. */
  keyIndex: number
}

/** Decrypt with each configured key in order. Returns the index of
 *  the key that worked — used by the rotate CLI to identify rows
 *  still under a non-primary key. */
export function decryptSecretDetailed(
  ciphertext: string | null | undefined,
): DecryptDetailedResult {
  if (!ciphertext) return { plaintext: null, keyIndex: -1 }
  const parts = ciphertext.split('.')
  if (parts.length !== 3) return { plaintext: null, keyIndex: -1 }
  let iv: Buffer, ct: Buffer, tag: Buffer
  try {
    iv = Buffer.from(parts[0], 'base64url')
    ct = Buffer.from(parts[1], 'base64url')
    tag = Buffer.from(parts[2], 'base64url')
  } catch {
    return { plaintext: null, keyIndex: -1 }
  }
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    return { plaintext: null, keyIndex: -1 }
  }
  const keys = getKeys()
  for (let i = 0; i < keys.length; i++) {
    try {
      const decipher = crypto.createDecipheriv(ALGO, keys[i], iv)
      decipher.setAuthTag(tag)
      const pt = Buffer.concat([decipher.update(ct), decipher.final()])
      return { plaintext: pt.toString('utf8'), keyIndex: i }
    } catch {
      // Wrong key — try the next one.
    }
  }
  return { plaintext: null, keyIndex: -1 }
}

/** Decrypt a string previously produced by `encryptSecret`. Returns null on any failure
    (tampered tag, every configured key wrong, malformed input). Callers should
    treat null as "missing". */
export function decryptSecret(ciphertext: string | null | undefined): string | null {
  return decryptSecretDetailed(ciphertext).plaintext
}

/** True if the given string matches the encrypted `iv.ct.tag` shape.
    Used to detect legacy plaintext values during migration. */
export function looksEncrypted(s: string | null | undefined): boolean {
  if (!s) return false
  const parts = s.split('.')
  if (parts.length !== 3) return false
  try {
    return (
      Buffer.from(parts[0], 'base64url').length === IV_LEN &&
      Buffer.from(parts[2], 'base64url').length === TAG_LEN &&
      Buffer.from(parts[1], 'base64url').length > 0
    )
  } catch {
    return false
  }
}
