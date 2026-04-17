/* ---------------------------------------------------------------
   Generic OAuth 2.0 authorization-code helper
   - buildAuthorizeUrl: constructs the provider's /authorize URL
   - exchangeCode: swaps code → tokens
   - State is an HMAC-signed JSON blob containing orgId + userId so
     we don't need a session on the callback redirect.
   --------------------------------------------------------------- */

import crypto from 'crypto'
import { getConnector } from './registry'

const STATE_SECRET = (() => {
  const s = process.env.NEXTAUTH_SECRET ?? process.env.OAUTH_STATE_SECRET
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET or OAUTH_STATE_SECRET must be set in production')
    }
    // Dev-only placeholder. Tokens signed with this are not trustworthy.
    return 'dev-oauth-secret-do-not-use-in-prod'
  }
  return s
})()

interface StatePayload {
  orgId: string
  userId: string
  provider: string
  ts: number
}

export function signState(p: StatePayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url')
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(state: string): StatePayload | null {
  try {
    const [body, sig] = state.split('.')
    if (!body || !sig) return null
    const expected = crypto.createHmac('sha256', STATE_SECRET).update(body).digest('base64url')
    if (sig !== expected) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as StatePayload
    if (Date.now() - payload.ts > 15 * 60 * 1000) return null // 15 min expiry
    return payload
  } catch {
    return null
  }
}

export function getOAuthRedirectUri(providerId: string): string {
  const base = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3100'
  return `${base.replace(/\/$/, '')}/api/integrations/oauth/callback?provider=${providerId}`
}

export function buildAuthorizeUrl(providerId: string, state: string): string | null {
  const conn = getConnector(providerId)
  if (!conn?.meta.oauth) return null
  const spec = conn.meta.oauth
  const clientId = process.env[spec.clientIdEnv] ?? ''
  if (!clientId) return null

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(providerId),
    response_type: 'code',
    scope: spec.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${spec.authorizeUrl}?${params.toString()}`
}

export interface TokenResult {
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number | null
  raw: Record<string, unknown>
}

export async function exchangeCode(providerId: string, code: string): Promise<TokenResult | null> {
  const conn = getConnector(providerId)
  if (!conn?.meta.oauth) return null
  const spec = conn.meta.oauth
  const clientId = process.env[spec.clientIdEnv] ?? ''
  const clientSecret = process.env[spec.clientSecretEnv] ?? ''
  if (!clientId || !clientSecret) return null

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getOAuthRedirectUri(providerId),
    grant_type: 'authorization_code',
  })

  const res = await fetch(spec.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json) return null

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresIn: json.expires_in ?? null,
    raw: json,
  }
}
