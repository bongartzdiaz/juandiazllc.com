/* GET /api/integrations/oauth/[provider] — initiate OAuth flow.
   Redirects to provider authorize URL with a signed state parameter. */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { buildAuthorizeUrl, signState } from '@/lib/philly/integrations/oauth'
import { getConnector } from '@/lib/philly/integrations/registry'
import { enforceRateLimit, PRESET_AUTH } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { provider } = await params

  // Rate-limit OAuth initiations per user. Without this, a script with
  // a valid session could spam authorize redirects, churning state
  // tokens and burning the upstream provider's quota.
  const limited = enforceRateLimit(`oauth-init:${scope.userId}`, PRESET_AUTH)
  if (limited) return limited

  const conn = getConnector(provider)
  if (!conn) return jsonError('Unknown provider', 404)
  if (!conn.meta.oauth) return jsonError('Provider does not support OAuth', 400)

  const state = signState({
    orgId: scope.organizationId,
    userId: scope.userId,
    provider,
    ts: Date.now(),
  })

  const url = buildAuthorizeUrl(provider, state)
  if (!url) return jsonError(`Missing client id for ${provider}`, 500)

  return NextResponse.redirect(url)
}
