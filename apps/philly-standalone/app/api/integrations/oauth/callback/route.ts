/* GET /api/integrations/oauth/callback?code=...&state=...&provider=...
   Exchanges the auth code for tokens and stores them on Integration. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { exchangeCode, verifyState } from '@/lib/philly/integrations/oauth'
import { encryptSecret } from '@/lib/philly/crypto'
import { enforceRateLimit, clientIp, PRESET_AUTH } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Public-facing endpoint — rate-limit by IP. The state parameter
  // is HMAC-signed, but cycling code+state pairs against a flawed
  // exchangeCode could otherwise be a low-cost amplification vector.
  const limited = enforceRateLimit(`oauth-callback:${clientIp(req)}`, PRESET_AUTH)
  if (limited) return limited

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

  // Bridge: Google integrations double as Gmail email accounts. Upserting
  // an EmailAccount here means the sync engine + Email list UI don't need
  // to know about Integration at all.
  if (provider === 'google') {
    try {
      const userinfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      }).then((r) => (r.ok ? r.json() : null))
      const email = userinfo && typeof userinfo.email === 'string' ? userinfo.email.toLowerCase() : null
      if (email) {
        const existing = await prisma.emailAccount.findFirst({
          where: { organizationId: payload.orgId, email, provider: 'gmail' },
          select: { id: true },
        })
        if (existing) {
          await prisma.emailAccount.update({
            where: { id: existing.id },
            data: {
              accessToken: encAccess,
              refreshToken: encRefresh,
              tokenExpiry: expiry,
              status: 'active',
              displayName: typeof userinfo.name === 'string' ? userinfo.name : '',
            },
          })
        } else {
          await prisma.emailAccount.create({
            data: {
              organizationId: payload.orgId,
              userId: payload.userId,
              provider: 'gmail',
              email,
              displayName: typeof userinfo.name === 'string' ? userinfo.name : '',
              accessToken: encAccess,
              refreshToken: encRefresh,
              tokenExpiry: expiry,
              syncEnabled: true,
              status: 'active',
            },
          })
        }
      }
    } catch (err) {
      // Non-fatal — Integration row is already saved; user can connect Gmail
      // manually in Settings → Email if userinfo lookup failed.
      console.warn('[oauth/callback] gmail account bridge failed', err)
    }
  }

  return redirect(`oauth_success=${provider}`)
}
