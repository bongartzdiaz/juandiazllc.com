/* Provider-specific OAuth + API metadata for calendar integrations.
   Centralized so route handlers just say providerConfig(p) and get
   typed config back — keeps Google + Microsoft surface differences
   from leaking into request handlers.

   Adding a new provider:
   1. Add the literal to ProviderKey + PROVIDERS
   2. Define authUrl, tokenUrl, scopes, eventsUrl, userInfoUrl
   3. Implement provider-specific token exchange in token-exchange.ts
   4. Add to PROVIDER_LABELS for UI display

   Env-var driven — if a provider's CLIENT_ID isn't set, isProviderConfigured()
   returns false and the start route refuses to begin OAuth (returns 503
   with a clear "set GOOGLE_OAUTH_CLIENT_ID" message rather than a confusing
   provider-side error). This matches how Resend/Stripe degrade in this
   codebase. */

export type ProviderKey = 'google' | 'microsoft'

export const PROVIDER_KEYS: readonly ProviderKey[] = ['google', 'microsoft'] as const

export interface ProviderConfig {
  key: ProviderKey
  label: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  /** REST endpoint for listing events. Provider-specific query params. */
  eventsUrl: string
  /** User-info / profile endpoint to fetch the connected account email. */
  userInfoUrl: string
  /** Required env var for client id. */
  envClientId: string
  /** Required env var for client secret. */
  envClientSecret: string
}

const GOOGLE: ProviderConfig = {
  key: 'google',
  label: 'Google Calendar',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  // Read-only is enough for MVP. Adding events.create later requires
  // re-consent (Google forces incremental scope re-grants).
  scopes: [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  eventsUrl: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
  userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  envClientId: 'GOOGLE_OAUTH_CLIENT_ID',
  envClientSecret: 'GOOGLE_OAUTH_CLIENT_SECRET',
}

// Microsoft uses the v2.0 endpoint with a tenant segment. `common`
// works for both work/school + personal accounts. Operators can pin
// to a specific tenant via MS_OAUTH_TENANT for org-only sign-in.
function msTenant(): string {
  return process.env.MS_OAUTH_TENANT ?? 'common'
}

function microsoftConfig(): ProviderConfig {
  const tenant = msTenant()
  return {
    key: 'microsoft',
    label: 'Outlook / Microsoft 365',
    authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access', // critical: without this MS won't return a refresh token
      'User.Read',
      'Calendars.Read',
    ],
    eventsUrl: 'https://graph.microsoft.com/v1.0/me/calendar/events',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    envClientId: 'MS_OAUTH_CLIENT_ID',
    envClientSecret: 'MS_OAUTH_CLIENT_SECRET',
  }
}

export function providerConfig(p: ProviderKey): ProviderConfig {
  if (p === 'google') return GOOGLE
  if (p === 'microsoft') return microsoftConfig()
  // Exhaustiveness check at compile-time — the runtime fallback should
  // never fire because ProviderKey is a closed union.
  const _exhaustive: never = p
  void _exhaustive
  throw new Error(`Unknown calendar provider: ${p}`)
}

export function isProviderConfigured(p: ProviderKey): boolean {
  const c = providerConfig(p)
  return Boolean(process.env[c.envClientId] && process.env[c.envClientSecret])
}

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  if (!base) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_APP_URL must be set in production')
    }
    return 'http://localhost:3000/philly/api/calendar/oauth/callback'
  }
  // Trim any trailing slash so we don't double-slash the path.
  const trimmed = base.replace(/\/$/, '')
  return `${trimmed}/philly/api/calendar/oauth/callback`
}

export const PROVIDER_LABELS: Record<ProviderKey, string> = {
  google: 'Google Calendar',
  microsoft: 'Outlook / Microsoft 365',
}
