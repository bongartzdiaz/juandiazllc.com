/* POST /api/webhooks/stripe — subscription lifecycle sink.
   ─────────────────────────────────────────────────────────────────
   Stripe POSTs events here on every subscription state change.
   We mirror the relevant fields onto the local Subscription row so
   feature gates + plan-limit checks can run without a round-trip to
   Stripe on every request.

   Security:
     * Signature verified via STRIPE_WEBHOOK_SECRET — any payload that
       doesn't verify is rejected with 400 before the parser runs.
     * No rate-limit gate (Stripe's outbound retry would just stack up).
     * Idempotent: every event's effect is a deterministic UPSERT on
       (organizationId), so duplicate events from Stripe's retry queue
       converge to the same state.

   Events handled:
     * checkout.session.completed         — first paid signup
     * customer.subscription.created      — same, redundant safety net
     * customer.subscription.updated      — plan / status changes
     * customer.subscription.deleted      — full cancellation
     * customer.subscription.trial_will_end — 3-day-before-trial-end notice

   Everything else is acknowledged with 200 + ignored. Stripe needs
   200 to stop retrying; logging the unknown type helps spot new
   features we should wire up.

   Bundle CX — initial implementation. */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'
import { stripe, webhookSecret } from '@/lib/philly/billing/stripe'
import { planForStripePriceId, type PlanSlug } from '@/lib/philly/billing/plans'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Bundle CX — Stripe sends the raw body verbatim; Next.js auto-parses
// JSON otherwise and the signature check fails because the bytes
// would be re-serialized. We read req.text() ourselves.

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret())
  } catch (err) {
    logger.warn('[webhooks/stripe] signature verification failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await upsertSubscriptionFromStripe(event.data.object)
        break
      case 'customer.subscription.deleted':
        await markSubscriptionDeleted(event.data.object)
        break
      case 'customer.subscription.trial_will_end':
        // Bundle CX defers email notification — log + fall through.
        // Wire to lib/philly/email/send.ts in a follow-up.
        logger.info('[webhooks/stripe] trial_will_end', {
          subscriptionId: event.data.object.id,
          trialEnd: event.data.object.trial_end,
        })
        break
      default:
        // Unknown event type — log so we know what new Stripe surfaces
        // are reaching us, but 200 so Stripe stops retrying.
        logger.info('[webhooks/stripe] unhandled event', { type: event.type })
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('[webhooks/stripe] handler failed', {
      type: event.type,
      eventId: event.id,
      err: err instanceof Error ? err.message : String(err),
    })
    // Return 500 so Stripe retries with exponential backoff. The
    // alternative — 200 + drop — would silently desync local state.
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId
  if (!organizationId) {
    logger.warn('[webhooks/stripe] checkout.session.completed without organizationId metadata', {
      sessionId: session.id,
    })
    return
  }
  // Pull the subscription expanded so we have all fields the upsert
  // needs without an extra round-trip below.
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id
  if (!subscriptionId) return
  const sub = await stripe().subscriptions.retrieve(subscriptionId)
  await upsertSubscriptionFromStripe(sub)
}

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organizationId
  if (!organizationId) {
    logger.warn('[webhooks/stripe] subscription has no organizationId metadata', { subId: sub.id })
    return
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const priceId = sub.items.data[0]?.price.id ?? null
  const plan: PlanSlug | null = priceId ? planForStripePriceId(priceId) : null
  if (!plan) {
    logger.warn('[webhooks/stripe] no plan match for price id', { priceId, subId: sub.id })
    // Still upsert so we don't lose the row; mark plan as the metadata
    // hint or default to 'operator'. Operator can fix in dashboard.
  }
  const prisma = getAuthPrisma()
  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan: plan ?? (sub.metadata?.plan as PlanSlug | undefined) ?? 'operator',
      status: sub.status,
      currentPeriodStart: periodStart(sub),
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan: plan ?? undefined,
      status: sub.status,
      currentPeriodStart: periodStart(sub),
      currentPeriodEnd: periodEnd(sub),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  })
  // Bundle CX — webhook events are not user-initiated; no AuthScope
  // exists to attach to logAudit(). Stripe Dashboard owns the billing
  // audit log, and the Subscription row's updatedAt + status gives
  // us the local breadcrumb. Log a structured info line for grep-ability.
  logger.info('[webhooks/stripe] subscription synced', {
    organizationId, subscriptionId: sub.id, status: sub.status, plan, priceId,
  })
}

// Bundle CX — Stripe 22 moved current_period_start/end off the
// Subscription object onto each SubscriptionItem. Single-item subs
// (our case — one price per subscription) take the first item's
// values, which matches the legacy behaviour exactly.
function periodStart(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_start
  return typeof ts === 'number' ? new Date(ts * 1000) : null
}
function periodEnd(sub: Stripe.Subscription): Date | null {
  const ts = sub.items.data[0]?.current_period_end
  return typeof ts === 'number' ? new Date(ts * 1000) : null
}

async function markSubscriptionDeleted(sub: Stripe.Subscription) {
  const organizationId = sub.metadata?.organizationId
  if (!organizationId) return
  const prisma = getAuthPrisma()
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: true,
    },
  }).catch((err) => {
    logger.warn('[webhooks/stripe] could not mark subscription deleted', {
      organizationId, err: String(err),
    })
  })
  logger.info('[webhooks/stripe] subscription canceled', {
    organizationId, subscriptionId: sub.id,
  })
}
