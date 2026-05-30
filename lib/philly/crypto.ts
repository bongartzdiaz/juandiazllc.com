/* AES-256-GCM symmetric encryption for secrets at rest.
   Used to encrypt OAuth tokens, API keys, and other integration credentials
   before they're stored in the database.

   Storage format (base64url):  iv.ciphertext.authTag
   All three parts are base64url-encoded and dot-separated.

   Key source precedence:
     1. INTEGRATION_SECRET        (preferred: 32-byte random hex or base64)
     2. NEXTAUTH_SECRET           (fallback: reuse NextAuth secret)

   In production both missing → module throws at import so the app refuses to start. */

import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12  // GCM recommended
const TAG_LEN = 16

function deriveKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  if (!raw) {
    // Fail closed everywhere except an explicit local/test context (A-16).
    // The previous guard only threw on NODE_ENV==='production', so a
    // staging/preview box, a container with NODE_ENV unset, or any Vercel
    // deploy would silently encrypt OAuth/calendar/2FA secrets with this
    // public placeholder key. Allow the placeholder ONLY for `test` and
    // `development`, and never on Vercel.
    const env = process.env.NODE_ENV
    const isLocalOrTest = (env === 'test' || env === 'development') && !process.env.VERCEL
    if (!isLocalOrTest) {
      throw new Error('INTEGRATION_SECRET (or NEXTAUTH_SECRET) must be set outside local/test environments')
    }
    // Dev/test-only deterministic placeholder so tests/local runs don't crash.
    // WARNING: tokens encrypted with this key are not secret.
    return crypto.createHash('sha256').update('dev-integration-secret-do-not-use-in-prod').digest()
  }
  // Allow raw hex, base64, or any string — hash to 32 bytes.
  return crypto.createHash('sha256').update(raw).digest()
}

/** Constant-time string comparison (A-29). Returns false on length
    mismatch without leaking timing. Use for comparing secrets/tokens
    (cron secrets, signatures) instead of `===`. */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

// Lazy-init so tests can set env vars before first use.
let KEY: Buffer | null = null
function getKey(): Buffer {
  if (!KEY) KEY = deriveKey()
  return KEY
}

/** Encrypt a UTF-8 string. Returns `iv.ct.tag` in base64url. */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${ct.toString('base64url')}.${tag.toString('base64url')}`
}

/** Decrypt a string previously produced by `encryptSecret`. Returns null on any failure
    (tampered tag, wrong key, malformed input). Callers should treat null as "missing". */
export function decryptSecret(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null
  try {
    const parts = ciphertext.split('.')
    if (parts.length !== 3) return null
    const iv = Buffer.from(parts[0], 'base64url')
    const ct = Buffer.from(parts[1], 'base64url')
    const tag = Buffer.from(parts[2], 'base64url')
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
    decipher.setAuthTag(tag)
    const pt = Buffer.concat([decipher.update(ct), decipher.final()])
    return pt.toString('utf8')
  } catch {
    return null
  }
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
