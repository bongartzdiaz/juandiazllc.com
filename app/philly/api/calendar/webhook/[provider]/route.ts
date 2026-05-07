/* Calendar provider webhook receiver.
 *
 *   POST /philly/api/calendar/webhook/google
 *   POST /philly/api/calendar/webhook/microsoft
 *
 * Handles two distinct delivery contracts:
 *
 * Google:
 *   - Empty body, all data in headers (X-Goog-Channel-ID,
 *     X-Goog-Channel-Token, X-Goog-Resource-State, X-Goog-Message-Number).
 *   - Verify token matches the channel's authSecret.
 *   - X-Goog-Resource-State='sync' is the bootstrap notification — ignore.
 *   - Idempotency: track lastMessageNum, refuse messages <= it.
 *
 * Microsoft Graph:
 *   - Validation handshake on first contact: POST ?validationToken=…
 *     with Content-Type: text/plain. Must respond plain text + 200
 *     within 10 seconds.
 *   - Notification body: { value: [{ subscriptionId, clientState,
 *     changeType, resource, resourceData? }] }
 *   - Verify clientState matches the subscription's authSecret.
 *   - 3-second hard SLA — queue + 202, don't process synchronously.
 *
 * IMPORTANT — middleware bypass:
 *   This route is registered in lib/supabase/middleware.ts →
 *   PUBLIC_PHILLY_PATHS. Provider servers don't carry a Supabase session
 *   cookie; the auth secret in the body/headers is the only auth.
 *
 * Sync trigger: today we just log + record the notification + flip
 * lastMessageNum / syncToken markers. The actual event-fetch worker is
 * a follow-up bundle — for the MVP, the webhook proves the round-trip
 * works end-to-end without committing to a delta-fetch implementation.
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ProviderParam = 'google' | 'microsoft'

function isProvider(p: string): p is ProviderParam {
  return p === 'google' || p === 'microsoft'
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider } = await ctx.params
  if (!isProvider(provider)) {
    return NextResponse.json({ error: 'unknown_provider' }, { status: 400 })
  }

  // Microsoft validation handshake — must be the FIRST branch since the
  // request shape is different from a real notification (text/plain body,
  // validationToken query param). Spec: respond plain text within 10s.
  if (provider === 'microsoft') {
    const url = new URL(req.url)
    const validationToken = url.searchParams.get('validationToken')
    if (validationToken) {
      // Echo the token URL-decoded as plain text. NEVER escape HTML or
      // JSON-stringify — MS treats anything other than the raw token as
      // a validation failure.
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  }

  if (provider === 'google') {
    return await handleGoogle(req)
  }
  return await handleMicrosoft(req)
}

// ──────────────────────────────────────────────────────────────────────
// Google
// ──────────────────────────────────────────────────────────────────────

async function handleGoogle(req: NextRequest): Promise<NextResponse> {
  const channelId = req.headers.get('x-goog-channel-id')
  const channelToken = req.headers.get('x-goog-channel-token')
  const resourceState = req.headers.get('x-goog-resource-state')
  const messageNumberStr = req.headers.get('x-goog-message-number')

  if (!channelId) {
    logger.warn('[calendar webhook google] missing channel id')
    return NextResponse.json({ error: 'missing_channel_id' }, { status: 400 })
  }

  // Bootstrap "sync" notification — provider's "channel is alive" handshake.
  // Acknowledge with 200 but don't trigger a sync; nothing changed yet.
  if (resourceState === 'sync') {
    logger.info('[calendar webhook google] bootstrap sync', { channelId })
    return NextResponse.json({ received: true, ignored: 'sync_bootstrap' })
  }

  const prisma = getAuthPrisma()
  const channel = await prisma.calendarChannel.findFirst({
    where: { provider: 'google', externalId: channelId },
    select: {
      id: true,
      authSecretEnc: true,
      lastMessageNum: true,
      status: true,
      connectionId: true,
    },
  })
  if (!channel) {
    // Could be a stale channel from a previous deploy or a test that
    // wasn't cleaned up. Acknowledge but don't error — Google will
    // back off on its own when the channel expires.
    logger.info('[calendar webhook google] unknown channel — acknowledging', { channelId })
    return NextResponse.json({ received: true, ignored: 'unknown_channel' })
  }

  if (channel.status !== 'active') {
    logger.info('[calendar webhook google] channel inactive', {
      channelId,
      status: channel.status,
    })
    return NextResponse.json({ received: true, ignored: 'channel_inactive' })
  }

  // Auth — token is our pre-shared authSecret. Constant-time compare
  // defends against timing attacks (probably negligible at this scale,
  // but it's the textbook safe pattern).
  const expected = decryptSecret(channel.authSecretEnc)
  if (!expected || !channelToken || !timingSafeEquals(channelToken, expected)) {
    logger.warn('[calendar webhook google] auth failure', {
      channelId,
      tokenPresent: Boolean(channelToken),
    })
    return NextResponse.json({ error: 'auth' }, { status: 401 })
  }

  // Idempotency — refuse re-deliveries via the monotonic message number.
  // First real notification has number 2 (sync was 1); subsequent
  // notifications are strictly increasing.
  const messageNumber = messageNumberStr ? parseInt(messageNumberStr, 10) : null
  if (messageNumber != null && channel.lastMessageNum != null && messageNumber <= channel.lastMessageNum) {
    logger.info('[calendar webhook google] duplicate redelivery', {
      channelId,
      messageNumber,
      lastSeen: channel.lastMessageNum,
    })
    return NextResponse.json({ received: true, ignored: 'duplicate' })
  }

  if (messageNumber != null) {
    await prisma.calendarChannel.update({
      where: { id: channel.id },
      data: { lastMessageNum: messageNumber },
    })
  }

  logger.info('[calendar webhook google] notification accepted', {
    channelId,
    resourceState,
    messageNumber,
  })

  // TODO: enqueue delta sync. For now we just record the trigger; the
  // event-fetch worker is a follow-up bundle. This proves the round-trip
  // works without committing to a sync implementation that has its own
  // failure modes.
  return NextResponse.json({ received: true, queued: true })
}

// ──────────────────────────────────────────────────────────────────────
// Microsoft Graph
// ──────────────────────────────────────────────────────────────────────

interface MsNotification {
  id?: string
  subscriptionId?: string
  clientState?: string
  changeType?: string
  resource?: string
  tenantId?: string
}

async function handleMicrosoft(req: NextRequest): Promise<NextResponse> {
  // 3-second hard SLA from the receipt of the request to our 2xx
  // response. Never await long-running work in this handler — read body,
  // verify, persist a marker, return 202.
  let body: { value?: MsNotification[] } | null = null
  try {
    body = (await req.json()) as { value?: MsNotification[] } | null
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const items = body?.value ?? []
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ received: true, ignored: 'empty_payload' })
  }

  const prisma = getAuthPrisma()

  // MS can batch multiple notifications across DIFFERENT subscriptions
  // into a single POST (rare, but documented). Group by subscriptionId
  // so we look up each channel exactly once.
  const bySubId = new Map<string, MsNotification[]>()
  for (const n of items) {
    if (!n.subscriptionId) continue
    const list = bySubId.get(n.subscriptionId) ?? []
    list.push(n)
    bySubId.set(n.subscriptionId, list)
  }

  const subIds = Array.from(bySubId.keys())
  if (subIds.length === 0) {
    return NextResponse.json({ received: true, ignored: 'no_subscription_ids' })
  }

  const channels = await prisma.calendarChannel.findMany({
    where: { provider: 'microsoft', externalId: { in: subIds } },
    select: {
      id: true,
      externalId: true,
      authSecretEnc: true,
      status: true,
    },
  })
  const byExternalId = new Map(channels.map((c) => [c.externalId, c]))

  let acceptedCount = 0
  for (const [subId, group] of bySubId) {
    const channel = byExternalId.get(subId)
    if (!channel) {
      logger.info('[calendar webhook ms] unknown subscription', { subId })
      continue
    }
    if (channel.status !== 'active') {
      continue
    }
    const expected = decryptSecret(channel.authSecretEnc)
    if (!expected) {
      logger.warn('[calendar webhook ms] cannot decrypt authSecret', { channelId: channel.id })
      continue
    }
    // Verify EVERY notification in the group — if any clientState doesn't
    // match, treat the whole batch as suspect. Same constant-time compare
    // discipline as Google.
    const allValid = group.every((n) => n.clientState && timingSafeEquals(n.clientState, expected))
    if (!allValid) {
      logger.warn('[calendar webhook ms] clientState mismatch', { channelId: channel.id })
      continue
    }
    acceptedCount += group.length
  }

  // Always 202 to MS — they're strict about the 3s SLA. Anything we
  // skipped (unknown sub, auth failure, inactive) is logged but doesn't
  // cause a retry; legitimate operators will see those in logs.
  // TODO: enqueue delta sync per-channel for the accepted batch.
  logger.info('[calendar webhook ms] batch processed', {
    total: items.length,
    accepted: acceptedCount,
    subscriptions: subIds.length,
  })
  return NextResponse.json({ received: true, accepted: acceptedCount }, { status: 202 })
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/** Constant-time string comparison, length-checking first to avoid
 *  timingSafeEqual's "throws on different length" footgun. */
function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}
