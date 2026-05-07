/* GET /api/calendar/oauth/callback?code=...&state=...
 *
 * Receives the provider's redirect after user consent. We re-verify
 * session (callback URL is open by design), verify the state token's
 * HMAC + freshness, ensure state.sub matches the current user, then
 * exchange the code for tokens, fetch the provider profile, and
 * upsert a CalendarConnection.
 *
 * Errors render as 302 to a status page (?error=<reason>) so users
 * see something coherent instead of a JSON 4xx mid-OAuth-flow.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { verifyState } from '@/lib/philly/calendar/state'
import { exchangeCodeForTokens } from '@/lib/philly/calendar/token-exchange'
import { upsertConnection } from '@/lib/philly/calendar/connection'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_RETURN = '/philly/onboarding/calendar'

function redirect(req: NextRequest, path: string, params: Record<string, string>): NextResponse {
  const u = new URL(path, req.url)
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v)
  }
  return NextResponse.redirect(u)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const errorParam = url.searchParams.get('error')

  // Provider returned an error (user denied, scope rejected, etc.).
  if (errorParam) {
    return redirect(req, DEFAULT_RETURN, { error: errorParam })
  }

  if (!code || !stateParam) {
    return redirect(req, DEFAULT_RETURN, { error: 'missing_params' })
  }

  const stateResult = verifyState(stateParam)
  if (!stateResult.ok || !stateResult.state) {
    return redirect(req, DEFAULT_RETURN, { error: `state_${stateResult.error ?? 'invalid'}` })
  }
  const state = stateResult.state

  // Re-authenticate the current user. The state's `sub` must match —
  // protects against an attacker tricking a different user into
  // completing OAuth (the state was bound to a specific user at
  // /start time).
  const scope = await requireScope()
  if (scope instanceof NextResponse) {
    // No session in callback context — surface a friendly redirect
    // rather than a 401 JSON. User can re-sign-in and try again.
    return redirect(req, '/philly/login', { next: DEFAULT_RETURN, error: 'session_lost' })
  }
  if (scope.userId !== state.sub || scope.organizationId !== state.oid) {
    logger.warn('[calendar oauth] state subject mismatch', {
      stateSub: state.sub,
      currentUser: scope.userId,
    })
    return redirect(req, DEFAULT_RETURN, { error: 'state_subject_mismatch' })
  }

  const exchange = await exchangeCodeForTokens(state.prov, code)
  if (!exchange.ok) {
    logger.warn('[calendar oauth] token exchange failed', {
      provider: state.prov,
      error: exchange.error,
      detail: exchange.detail,
    })
    return redirect(req, state.redirect ?? DEFAULT_RETURN, {
      error: `token_${exchange.error}`,
    })
  }

  await upsertConnection({
    userId: scope.userId,
    organizationId: scope.organizationId,
    provider: state.prov,
    providerAccountId: exchange.providerAccountId,
    providerEmail: exchange.providerEmail,
    accessToken: exchange.accessToken,
    refreshToken: exchange.refreshToken,
    expiresAt: exchange.expiresAt,
    scopes: exchange.scopes,
  })

  logger.info('[calendar oauth] connected', {
    userId: scope.userId,
    provider: state.prov,
    accountId: exchange.providerAccountId,
  })

  // Audit the connection — `integration` entity covers all third-party
  // OAuth grants. providerEmail goes into `changes` so an auditor can
  // see *which* account was connected without joining tables. We do NOT
  // log the providerAccountId or any token/scope material — those are
  // sensitive enough to keep out of a permanent record.
  await logAudit({
    scope: {
      userId: scope.userId,
      organizationId: scope.organizationId,
      role: scope.role,
      email: scope.email,
    },
    action: 'create',
    entity: 'integration',
    entityId: null,
    changes: {
      provider: { old: null, new: state.prov },
      providerEmail: { old: null, new: exchange.providerEmail },
      kind: { old: null, new: 'calendar' },
    },
  })

  return redirect(req, state.redirect ?? DEFAULT_RETURN, {
    connected: state.prov,
  })
}
