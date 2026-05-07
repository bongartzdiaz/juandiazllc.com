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

import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { syncDeltaForChannel } from '@/lib/philly/calendar/delta-sync'
import { logger } from '@/lib/philly/logger'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Per-IP rate-limit for the webhook surface. The route is on the
// PUBLIC_PHILLY_PATHS allowlist (provider servers don't carry our
// session cookie); the per-channel HMAC secret is the only auth.
// Without an IP throttle, an attacker who learns the URL could flood
// the endpoint and burn a DB lookup per request before the auth check.
//
// Generous capacity — Google + MS can legitimately fire dozens of
// notifications in a second on a busy calendar. 300 burst / 10 RPS
// fits real provider traffic with margin and still chokes brute-force
// scanners.
const WEBHOOK_RATE = { capacity: 300, refillPerSec: 10 } as const

/** Length of the base64url-encoded shared secret we generate per
 *  channel (32 random bytes → 43 chars). MS clientState values that
 *  don't match this length cannot match any real secret, so we can
 *  reject them BEFORE the DB lookup. */
const AUTH_SECRET_LEN = 43
const AUTH_SECRET_RE = /^[A-Za-z0-9_-]{43}$/

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

  // Per-IP rate limit. Applied BEFORE the MS validation handshake
  // branch is fine because PRESET_READ-class capacity easily
  // accommodates a one-shot validation request even after a flood.
  const rateLimited = enforceRateLimit(`calendar-webhook:${clientIp(req)}`, WEBHOOK_RATE)
  if (rateLimited) return rateLimited

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

  // Run the delta sync inline. For Google there's no documented response
  // SLA on push notifications, so we can afford to await. The sync hits
  // events.list (one HTTP call, typical p95 <500ms) and updates the
  // channel's syncToken on success. Failures are logged but don't fail
  // the webhook — Google would retry the notification, but our processing
  // is idempotent so a repeat is a no-op.
  //
  // Future: when we add multi-page pagination or persistence, swap to
  // Next.js `after()` (App Router primitive) so the handler returns
  // before the sync finishes.
  const syncResult = await syncDeltaForChannel(channel.id)
  if (!syncResult.ok) {
    logger.warn('[calendar webhook google] sync failed', {
      channelId,
      error: syncResult.error,
      status: syncResult.status,
    })
  } else if (syncResult.processed > 0) {
    logger.info('[calendar webhook google] sync complete', {
      channelId,
      processed: syncResult.processed,
      added: syncResult.added,
      removed: syncResult.removed,
      bootstrapped: syncResult.bootstrapped,
      tokenRotated: syncResult.tokenRotated,
    })
  }

  return NextResponse.json({ received: true, synced: syncResult.ok, processed: syncResult.processed })
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
  //
  // PRE-DB shape filter: if a notification doesn't have a clientState
  // matching the base64url(32-byte) shape we generated at subscribe-time,
  // it cannot match any real secret. Drop the subscription from the
  // lookup set entirely instead of paying for a DB query that will
  // fail the timing-safe compare a millisecond later. This shrinks the
  // attacker's flood-the-DB surface (audit MED F4).
  const bySubId = new Map<string, MsNotification[]>()
  for (const n of items) {
    if (!n.subscriptionId) continue
    if (!n.clientState || !AUTH_SECRET_RE.test(n.clientState)) {
      // Malformed clientState — skip without DB lookup.
      continue
    }
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
    //
    // CONTRIBUTOR NOTE: clientState is a shared HMAC-equivalent secret.
    // Never log its value (or `expected`, or `n.clientState`) — only the
    // channelId, which is non-sensitive. A future "easier debugging"
    // patch that prints these would silently leak credentials into log
    // exports.
    const allValid = group.every((n) => n.clientState && timingSafeEquals(n.clientState, expected))
    if (!allValid) {
      logger.warn('[calendar webhook ms] clientState mismatch', { channelId: channel.id })
      continue
    }
    acceptedCount += group.length
  }

  // Collect channels we will sync AFTER returning the response. MS has
  // a hard 3-second SLA; doing the per-channel calendarView/delta calls
  // inline (each ~500-800ms) blows the budget on batches of 4+.
  // Next.js `after()` lets us return 202 immediately and run the syncs
  // out-of-band — same idempotency posture (the sync writes are
  // dedup'd against the syncToken / deltaLink).
  const channelsToSync = Array.from(byExternalId.values())
    .filter((c) => c.status === 'active')
    .map((c) => c.id)

  after(async () => {
    if (channelsToSync.length === 0) return
    const syncResults = await Promise.allSettled(
      channelsToSync.map((id) => syncDeltaForChannel(id)),
    )
    let syncedOk = 0
    for (const r of syncResults) {
      if (r.status === 'fulfilled' && r.value.ok) syncedOk++
      else if (r.status === 'rejected') {
        logger.warn('[calendar webhook ms] sync rejected', {
          reason: String(r.reason).slice(0, 200),
        })
      } else if (r.status === 'fulfilled' && !r.value.ok) {
        logger.warn('[calendar webhook ms] sync failed', {
          error: r.value.error,
          status: r.value.status,
        })
      }
    }
    logger.info('[calendar webhook ms] post-response sync done', {
      attempted: channelsToSync.length,
      syncedOk,
    })
  })

  logger.info('[calendar webhook ms] batch accepted', {
    total: items.length,
    accepted: acceptedCount,
    subscriptions: subIds.length,
    syncQueued: channelsToSync.length,
  })
  return NextResponse.json(
    { received: true, accepted: acceptedCount, syncQueued: channelsToSync.length },
    { status: 202 },
  )
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
