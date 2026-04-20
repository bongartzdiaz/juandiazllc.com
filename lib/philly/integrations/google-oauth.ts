/* ---------------------------------------------------------------
   Google OAuth token refresh helper.

   Access tokens expire after ~1 hour. Refresh tokens (issued once,
   when prompt=consent + access_type=offline) let us mint a new
   access token server-side without user interaction.

   Callers:
     - Gmail sync engine (before every sync batch)
     - Any future Calendar / Drive reader

   Strategy: if `tokenExpiry` is < 60s from now, refresh. Otherwise
   reuse the cached access token. The 60s skew covers clock drift +
   the time it takes us to actually make the downstream API call.
   --------------------------------------------------------------- */

import { logger } from '@/lib/philly/logger'

export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** Skew (ms) we treat as "already expired" to avoid races. */
export const REFRESH_SKEW_MS = 60_000

export interface RefreshedToken {
  accessToken: string
  /** Seconds until the new token expires (as returned by Google). */
  expiresIn: number
  /** Google normally does NOT rotate refresh tokens, so this is usually null.
   *  When it IS returned, callers MUST persist it — the old one is revoked. */
  refreshToken: string | null
  /** Scope string Google confirms (space-separated). */
  scope: string | null
  /** The raw JSON body, for debugging / attribute passthrough. */
  raw: Record<string, unknown>
}

export class GoogleRefreshError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.name = 'GoogleRefreshError'
    this.status = status
    this.body = body
  }
}

/** Returns true if the stored token should be refreshed before use. */
export function shouldRefresh(expiry: Date | null | undefined, now: number = Date.now()): boolean {
  if (!expiry) return true // no expiry stored → refresh to be safe
  return expiry.getTime() - now < REFRESH_SKEW_MS
}

export interface RefreshDeps {
  clientId?: string
  clientSecret?: string
  /** Injection seam for tests. Defaults to global fetch. */
  fetchImpl?: typeof fetch
  /** Override token URL for tests. */
  tokenUrl?: string
}

/** Exchange a refresh token for a new access token.
 *
 *  Throws GoogleRefreshError on HTTP !2xx so callers can decide whether to
 *  mark the EmailAccount status='error' (e.g. 400 invalid_grant means the
 *  user revoked access — they have to re-consent). */
export async function refreshGoogleAccessToken(
  refreshToken: string,
  deps: RefreshDeps = {},
): Promise<RefreshedToken> {
  const clientId = deps.clientId ?? process.env.GOOGLE_CLIENT_ID ?? ''
  const clientSecret = deps.clientSecret ?? process.env.GOOGLE_CLIENT_SECRET ?? ''
  if (!clientId || !clientSecret) {
    throw new GoogleRefreshError(0, null, 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured')
  }
  if (!refreshToken) {
    throw new GoogleRefreshError(0, null, 'refreshToken is required')
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const fetchImpl = deps.fetchImpl ?? fetch
  const url = deps.tokenUrl ?? GOOGLE_TOKEN_URL
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null

  if (!res.ok || !json) {
    logger.warn('[google-oauth] refresh failed', { status: res.status, body: json })
    throw new GoogleRefreshError(res.status, json, `Google refresh returned ${res.status}`)
  }

  const access = typeof json.access_token === 'string' ? json.access_token : ''
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 0
  if (!access || !expiresIn) {
    throw new GoogleRefreshError(res.status, json, 'Google refresh response missing access_token/expires_in')
  }

  return {
    accessToken: access,
    expiresIn,
    refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : null,
    scope: typeof json.scope === 'string' ? json.scope : null,
    raw: json,
  }
}

/** Build the new `tokenExpiry` Date for persistence. */
export function expiryFromSeconds(expiresIn: number, now: number = Date.now()): Date {
  return new Date(now + expiresIn * 1000)
}
