/* HMAC-signed OAuth state token for CSRF protection.
   When we redirect a user to Google/Microsoft to authorize, we attach
   a `state` parameter the provider echoes back to our callback. Without
   integrity protection, an attacker could craft a callback URL with a
   state pointing at a different user/org and we'd persist tokens onto
   the wrong account.

   The token format is: <payloadBase64Url>.<hmacSha256Base64Url>
   Payload: JSON-encoded { v, sub, oid, prov, redirect, nonce, exp }
   HMAC key: derived from INTEGRATION_SECRET / NEXTAUTH_SECRET (same
   key as encryptSecret — different domain via a constant prefix to
   prevent cross-protocol reuse).

   `exp` is enforced (10 minutes default). `nonce` lets us reject
   replays if we ever add a one-time-use store. For now we just
   verify integrity + freshness which is sufficient for OAuth state. */

import crypto from 'crypto'

const STATE_VERSION = 1
const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const HMAC_DOMAIN = 'calendar-oauth-state-v1'

export interface CalendarOAuthState {
  /** State format version. Bump on breaking change. */
  v: number
  /** Subject = userId from auth scope. */
  sub: string
  /** Organization id (audit + tenant validation on callback). */
  oid: string
  /** Provider key — must match the callback's `?provider=` param. */
  prov: 'google' | 'microsoft'
  /** Internal path to redirect after success (e.g. /onboarding/calendar). */
  redirect: string
  /** Random nonce. */
  nonce: string
  /** Expiry timestamp (ms since epoch). */
  exp: number
}

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTEGRATION_SECRET (or NEXTAUTH_SECRET) must be set in production')
    }
    return crypto.createHash('sha256').update(`dev-${HMAC_DOMAIN}`).digest()
  }
  return crypto.createHash('sha256').update(`${HMAC_DOMAIN}:${raw}`).digest()
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest()
}

export interface SignStateInput {
  userId: string
  organizationId: string
  provider: 'google' | 'microsoft'
  redirect: string
}

export function signState(input: SignStateInput, now: number = Date.now()): string {
  const payload: CalendarOAuthState = {
    v: STATE_VERSION,
    sub: input.userId,
    oid: input.organizationId,
    prov: input.provider,
    redirect: input.redirect,
    nonce: crypto.randomBytes(12).toString('base64url'),
    exp: now + STATE_TTL_MS,
  }
  const json = JSON.stringify(payload)
  const payloadB64 = b64url(Buffer.from(json, 'utf8'))
  const sig = b64url(hmac(getKey(), payloadB64))
  return `${payloadB64}.${sig}`
}

export interface VerifyStateResult {
  ok: boolean
  state?: CalendarOAuthState
  error?: 'malformed' | 'bad-signature' | 'expired' | 'wrong-version'
}

export function verifyState(token: string | null | undefined, now: number = Date.now()): VerifyStateResult {
  if (!token) return { ok: false, error: 'malformed' }
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, error: 'malformed' }
  const [payloadB64, sig] = parts

  // Constant-time signature compare to defeat timing attacks.
  const expected = b64url(hmac(getKey(), payloadB64))
  // Compare the base64url STRINGS, not their decoded bytes. Decoding
  // first silently drops the 4 unused padding bits in the final
  // character (43 chars × 6 bits = 258 bits for a 256-bit HMAC), so
  // e.g. sig "…Q" and tampered "…X" decode to identical bytes — a
  // signature-malleability quirk that also made the tampered-signature
  // test flake. Our own encoding is canonical; anything else fails.
  // Length guard first: timingSafeEqual throws on unequal lengths.
  const a = Buffer.from(sig, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, error: 'bad-signature' }
  }

  let parsed: CalendarOAuthState
  try {
    parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, error: 'malformed' }
  }

  if (parsed.v !== STATE_VERSION) return { ok: false, error: 'wrong-version' }
  if (typeof parsed.exp !== 'number' || parsed.exp < now) {
    return { ok: false, error: 'expired' }
  }

  return { ok: true, state: parsed }
}
