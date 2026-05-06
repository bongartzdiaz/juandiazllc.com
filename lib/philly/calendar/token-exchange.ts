/* OAuth code → token exchange + provider profile fetch.

   Called from the OAuth callback after we've verified state and have
   a fresh `code`. Returns either a normalized token bundle or a typed
   error so the callback can render a sensible message instead of
   leaking provider-specific failure modes.

   Profile fetch normalises Google's `email` / `sub` and Microsoft's
   `userPrincipalName` / `id` into a single { providerAccountId,
   providerEmail } shape. */

import { providerConfig, getRedirectUri, type ProviderKey } from './providers'

export interface TokenExchangeResult {
  ok: true
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
  providerAccountId: string
  providerEmail: string | null
}

export interface TokenExchangeFailure {
  ok: false
  error:
    | 'provider_not_configured'
    | 'token_request_failed'
    | 'token_response_invalid'
    | 'profile_request_failed'
    | 'profile_response_invalid'
    | 'network_error'
  detail?: string
}

export async function exchangeCodeForTokens(
  provider: ProviderKey,
  code: string,
): Promise<TokenExchangeResult | TokenExchangeFailure> {
  const cfg = providerConfig(provider)
  const clientId = process.env[cfg.envClientId]
  const clientSecret = process.env[cfg.envClientSecret]
  if (!clientId || !clientSecret) return { ok: false, error: 'provider_not_configured' }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    client_secret: clientSecret,
  })

  let tokenRes: Response
  try {
    tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (err) {
    return {
      ok: false,
      error: 'network_error',
      detail: (err as Error).message?.slice(0, 100),
    }
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '')
    return {
      ok: false,
      error: 'token_request_failed',
      detail: `${tokenRes.status} ${text.slice(0, 200)}`,
    }
  }

  const tokens = (await tokenRes.json().catch(() => null)) as
    | {
        access_token?: string
        refresh_token?: string
        expires_in?: number
        scope?: string
      }
    | null
  if (!tokens?.access_token) {
    return { ok: false, error: 'token_response_invalid' }
  }

  // Profile fetch — uses the just-issued access token.
  let profileRes: Response
  try {
    profileRes = await fetch(cfg.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
  } catch (err) {
    return {
      ok: false,
      error: 'network_error',
      detail: (err as Error).message?.slice(0, 100),
    }
  }
  if (!profileRes.ok) {
    return {
      ok: false,
      error: 'profile_request_failed',
      detail: `${profileRes.status}`,
    }
  }
  const profile = (await profileRes.json().catch(() => null)) as Record<string, unknown> | null
  if (!profile) return { ok: false, error: 'profile_response_invalid' }

  // Provider-specific identity normalization.
  let providerAccountId: string | undefined
  let providerEmail: string | null = null
  if (provider === 'google') {
    providerAccountId = (profile.sub as string | undefined) ?? (profile.email as string | undefined)
    providerEmail = (profile.email as string | null | undefined) ?? null
  } else if (provider === 'microsoft') {
    providerAccountId =
      (profile.id as string | undefined) ?? (profile.userPrincipalName as string | undefined)
    providerEmail =
      (profile.mail as string | null | undefined) ??
      (profile.userPrincipalName as string | null | undefined) ??
      null
  }
  if (!providerAccountId) return { ok: false, error: 'profile_response_invalid' }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null
  // Token endpoint returns `scope` as a space-separated string. If
  // missing, fall back to the requested scopes — these match in
  // practice since neither provider strips scopes silently.
  const scopes = (tokens.scope ?? cfg.scopes.join(' '))
    .split(/\s+/)
    .filter(Boolean)

  return {
    ok: true,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
    scopes,
    providerAccountId,
    providerEmail,
  }
}
