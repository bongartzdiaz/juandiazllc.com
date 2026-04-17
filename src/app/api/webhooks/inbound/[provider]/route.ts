/* POST /api/webhooks/inbound/[provider] — receive third-party webhooks.
   Generic inbound receiver. Captures payload + provider for later processing.
   Validation per provider (Stripe sig, Mailgun sig, etc.) can be added here.

   Security: callers MUST include BOTH ?org=<orgId>&token=<hmac> in the URL.
   The token is HMAC-SHA256(NEXTAUTH_SECRET, `${orgId}:${provider}`) truncated
   to 32 hex chars. Without this, anyone could spoof webhooks into any org.

   For per-org webhook URLs, use `getInboundWebhookUrl(orgId, provider)`
   from `@/lib/webhooks/inbound-url.ts` when configuring third-party services. */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthPrisma } from '@/lib/auth'
import { enforceRateLimit, clientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function computeInboundToken(orgId: string, provider: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.OAUTH_STATE_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production')
    }
    // Dev fallback — same value as oauth.ts so tokens are deterministic in dev
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

function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  try {
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  // Per-IP rate limit so brute-forcing the token can't hit us indefinitely.
  // 120 req/min/IP is plenty for legitimate retry traffic.
  const limited = enforceRateLimit(`webhook:inbound:${clientIp(req)}`, { capacity: 120, refillPerSec: 2 })
  if (limited) return limited

  const { provider } = await params
  const url = new URL(req.url)
  const orgId = url.searchParams.get('org') ?? ''
  const token = url.searchParams.get('token') ?? ''

  if (!orgId || !token) {
    return NextResponse.json({ error: 'Missing org or token' }, { status: 400 })
  }

  // Verify the signed token before touching the DB — prevents spoofing into any org.
  const expected = computeInboundToken(orgId, provider)
  if (!timingSafeEqualStr(token, expected)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') ?? ''
  let payload: unknown
  let rawText: string | null = null

  try {
    if (ct.includes('application/json')) {
      rawText = await req.text()
      payload = JSON.parse(rawText)
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      rawText = await req.text()
      payload = Object.fromEntries(new URLSearchParams(rawText))
    } else {
      rawText = await req.text()
      payload = rawText
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } })
  if (!org) return NextResponse.json({ error: 'Unknown org' }, { status: 404 })

  // Find any webhook row or synthesize a generic inbound one for this provider
  const inboundLabel = `inbound:${provider}`
  let wh = await prisma.webhook.findFirst({
    where: { organizationId: orgId, url: inboundLabel },
  })
  if (!wh) {
    wh = await prisma.webhook.create({
      data: {
        organizationId: orgId,
        url: inboundLabel,
        events: JSON.stringify([`${provider}.*`]),
        secret: 'inbound',
        enabled: true,
      },
    })
  }

  await prisma.webhookDelivery.create({
    data: {
      webhookId: wh.id,
      event: `${provider}.inbound`,
      payload: (rawText ?? JSON.stringify(payload)).slice(0, 65000),
      statusCode: 200,
    },
  })

  return NextResponse.json({ ok: true })
}
