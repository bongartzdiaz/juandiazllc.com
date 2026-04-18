/* GET /api/integrations/oauth/callback?code=...&state=...&provider=...
   Exchanges the auth code for tokens and stores them on Integration. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { exchangeCode, verifyState } from '@/lib/integrations/oauth'
import { encryptSecret } from '@/lib/crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const provider = url.searchParams.get('provider')
  const error = url.searchParams.get('error')

  const base = url.origin
  const redirect = (qs: string) => NextResponse.redirect(`${base}/settings?tab=integrations&${qs}`)

  if (error) return redirect(`oauth_error=${encodeURIComponent(error)}`)
  if (!code || !state || !provider) return redirect('oauth_error=missing_params')

  const payload = verifyState(state)
  if (!payload) return redirect('oauth_error=invalid_state')
  if (payload.provider !== provider) return redirect('oauth_error=provider_mismatch')

  const tokens = await exchangeCode(provider, code)
  if (!tokens) return redirect('oauth_error=exchange_failed')

  const prisma = getAuthPrisma()
  const expiry = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null

  // Encrypt tokens before storing. Metadata stores only non-sensitive fields
  // (scope, token_type, id_token — explicitly stripped of the tokens themselves).
  const encAccess = encryptSecret(tokens.accessToken)
  const encRefresh = encryptSecret(tokens.refreshToken ?? null)
  const rawMeta: Record<string, unknown> = { ...tokens.raw }
  delete rawMeta.access_token
  delete rawMeta.refresh_token
  delete rawMeta.id_token

  await prisma.integration.upsert({
    where: { organizationId_provider: { organizationId: payload.orgId, provider } },
    update: {
      status: 'connected',
      accessToken: encAccess,
      refreshToken: encRefresh,
      tokenExpiry: expiry,
      metadata: JSON.stringify(rawMeta).slice(0, 5000),
    },
    create: {
      organizationId: payload.orgId,
      provider,
      name: provider,
      status: 'connected',
      accessToken: encAccess,
      refreshToken: encRefresh,
      tokenExpiry: expiry,
      metadata: JSON.stringify(rawMeta).slice(0, 5000),
    },
  })

  return redirect(`oauth_success=${provider}`)
}
