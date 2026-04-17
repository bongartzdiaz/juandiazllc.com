/* Build signed inbound-webhook URLs for third-party providers.
   Pair with /api/webhooks/inbound/[provider] — the route verifies the token
   before accepting any payload so attackers can't spoof deliveries into a
   victim organization. */

import crypto from 'crypto'

export function computeInboundToken(orgId: string, provider: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.OAUTH_STATE_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production')
    }
    return crypto
      .createHmac('sha256', 'dev-oauth-secret-do-not-use-in-prod')
      .update(`${orgId}:${provider}`)
      .digest('hex')
      .slice(0, 32)
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${orgId}:${provider}`)
    .digest('hex')
    .slice(0, 32)
}

export function getInboundWebhookUrl(orgId: string, provider: string): string {
  const base = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'http://localhost:3100'
  const token = computeInboundToken(orgId, provider)
  return `${base.replace(/\/$/, '')}/api/webhooks/inbound/${encodeURIComponent(provider)}?org=${encodeURIComponent(orgId)}&token=${token}`
}
