/* POST /api/billing/webhook
 *
 * Stripe webhook receiver. Verifies the signature, dispatches the
 * event to the right subscription/invoice handler, and ack's 200.
 *
 * IMPORTANT — middleware bypass:
 *   This route is registered in `lib/supabase/middleware.ts` →
 *   PUBLIC_PHILLY_PATHS so the auth gate doesn't block Stripe's
 *   server-to-server callbacks. Stripe doesn't carry a Supabase
 *   session cookie; the signature header is the only auth.
 *
 * Why a soft-fail policy:
 *   - 200 with handled:false on unknown event types → Stripe stops
 *     retrying junk we don't care about
 *   - 200 with warning on missing metadata → these are usually manual
 *     dashboard-created subs that won't fix themselves on retry
 *   - 400 only on signature failure → tells Stripe the body is bad,
 *     don't retry until they fix the signing setup
 *   - 500 reserved for our own DB / runtime failures — Stripe WILL
 *     retry these and the next attempt should succeed
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, dispatchEvent } from '@/lib/philly/stripe/webhook'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    logger.error('[billing webhook] STRIPE_WEBHOOK_SECRET not set — rejecting')
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature')
  // Stripe signs the raw bytes — read as text, do NOT JSON.parse first.
  const rawBody = await req.text()

  const verified = verifyWebhook(rawBody, sig, secret)
  if (!verified.ok || !verified.event) {
    logger.warn('[billing webhook] verification failed', { error: verified.error })
    return NextResponse.json({ error: verified.error ?? 'invalid' }, { status: 400 })
  }

  const event = verified.event

  try {
    const result = await dispatchEvent(event)
    if (result.warning) {
      logger.warn('[billing webhook] handled with warning', {
        eventId: event.id,
        type: event.type,
        warning: result.warning,
      })
    } else if (result.handled) {
      logger.info('[billing webhook] handled', {
        eventId: event.id,
        type: event.type,
      })
    }
    return NextResponse.json({ received: true, handled: result.handled })
  } catch (err) {
    // Real failure — log + 500 so Stripe retries. Don't leak the
    // error message back over the wire (could contain DB internals).
    logger.error('[billing webhook] dispatch failed', {
      eventId: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'dispatch_failed' }, { status: 500 })
  }
}
