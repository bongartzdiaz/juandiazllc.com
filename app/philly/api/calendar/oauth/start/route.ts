/* GET /api/calendar/oauth/start?provider=google|microsoft&redirect=<path>
 *
 * Kicks off the OAuth flow for the signed-in user. Builds the
 * authorize URL with a signed `state` token (HMAC, 10-min TTL,
 * verified on callback) and 302-redirects.
 *
 * Errors:
 *   - 401 if no session
 *   - 400 if provider missing/unknown
 *   - 503 if provider not configured (CLIENT_ID env var unset)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import {
  PROVIDER_KEYS,
  providerConfig,
  isProviderConfigured,
  getRedirectUri,
  type ProviderKey,
} from '@/lib/philly/calendar/providers'
import { signState } from '@/lib/philly/calendar/state'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_REDIRECT = '/philly/onboarding/calendar'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const providerParam = url.searchParams.get('provider')
  const redirectParam = url.searchParams.get('redirect') ?? DEFAULT_REDIRECT

  if (!providerParam || !PROVIDER_KEYS.includes(providerParam as ProviderKey)) {
    return jsonError(`provider must be one of: ${PROVIDER_KEYS.join(', ')}`, 400)
  }
  const provider = providerParam as ProviderKey

  if (!isProviderConfigured(provider)) {
    const cfg = providerConfig(provider)
    return jsonError(
      `Calendar provider "${provider}" is not configured. ` +
        `Operator: set ${cfg.envClientId} and ${cfg.envClientSecret} env vars.`,
      503,
    )
  }

  // Only allow internal redirects to prevent open-redirect attacks.
  // Provider re-routes us to /api/calendar/oauth/callback, then we
  // bounce to the redirectParam — so an attacker who tampered with
  // ?redirect= could exfiltrate to an external site post-auth. Reject
  // anything that isn't a same-origin path.
  const safeRedirect = redirectParam.startsWith('/') && !redirectParam.startsWith('//')
    ? redirectParam
    : DEFAULT_REDIRECT

  const cfg = providerConfig(provider)
  const state = signState({
    userId: scope.userId,
    organizationId: scope.organizationId,
    provider,
    redirect: safeRedirect,
  })

  const authParams = new URLSearchParams({
    client_id: process.env[cfg.envClientId]!,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: cfg.scopes.join(' '),
    state,
    access_type: 'offline', // Google: required for refresh_token
    prompt: 'consent', // Google: force re-consent so we always get refresh_token
  })

  return NextResponse.redirect(`${cfg.authUrl}?${authParams.toString()}`)
}
