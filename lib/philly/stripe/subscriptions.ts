/* Subscription state mirror.

   Stripe holds the billing source-of-truth — we keep a Subscription
   row per Organization that mirrors enough state to make seat-checks
   + UI rendering cheap (no Stripe round-trip on every authorisation).

   Webhook events (customer.subscription.created, .updated, .deleted,
   invoice.payment_failed, invoice.paid) flow through here. Each
   handler is idempotent: safe to replay if Stripe retries.

   Status mapping:
     trialing        → seat limit = subscription.seatCount
     active          → seat limit = subscription.seatCount
     past_due        → seat limit reverts to Organization.seatLimit
                       (don't lock customer out mid-billing-failure;
                        seats.ts handles this fallback)
     unpaid          → same as past_due
     canceled        → row stays for audit, status='canceled'
                       (seats.ts falls back to Organization.seatLimit)
     incomplete      → row stays for audit, status='incomplete'
     incomplete_expired → treat as canceled */

import type Stripe from 'stripe'
import { getAuthPrisma } from '@/lib/philly/auth'
import { planKeyFromPriceId } from './plans'

/** Internal subscription status — mirrors Stripe's set we care about. */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'

const HANDLED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
])

export function isHandledStatus(s: string): s is SubscriptionStatus {
  return HANDLED_STATUSES.has(s as SubscriptionStatus)
}

export interface SubscriptionMirror {
  organizationId: string
  plan: string
  status: SubscriptionStatus
  seatCount: number
  stripeCustomerId: string
  stripeSubId: string
  currentPeriodEnd: Date | null
  cancelAt: Date | null
}

/**
 * Upsert a Subscription row from a Stripe Subscription object.
 * Caller is responsible for resolving the organizationId — typically
 * via metadata.organizationId on the Stripe Customer or Subscription.
 */
export async function upsertFromStripe(
  organizationId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const prisma = getAuthPrisma()

  // Take the first item — we don't ship multi-line subscriptions yet.
  // If Stripe sends a multi-item sub (add-ons, metered usage), the
  // first item is still the seat-billed primary plan.
  const item = sub.items.data[0]
  const priceId = item?.price?.id ?? null
  const planKey = priceId ? planKeyFromPriceId(priceId) : null
  const plan = planKey ?? 'unknown'

  // Stripe quantities default to 1 if not set. We bill per seat, so
  // quantity == seatCount. Floor at 1 to avoid negative seats from
  // a Stripe glitch.
  const seatCount = Math.max(1, item?.quantity ?? 1)

  const status: SubscriptionStatus = isHandledStatus(sub.status)
    ? sub.status
    : 'incomplete'

  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const periodEnd = subscriptionPeriodEnd(sub)
  const cancelAt = sub.cancel_at ? new Date(sub.cancel_at * 1000) : null

  await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan,
      status,
      seatCount,
      stripeCustomerId: customerId,
      stripeSubId: sub.id,
      currentPeriodEnd: periodEnd,
      cancelAt,
    },
    update: {
      plan,
      status,
      seatCount,
      stripeCustomerId: customerId,
      stripeSubId: sub.id,
      currentPeriodEnd: periodEnd,
      cancelAt,
    },
  })
}

/**
 * Stripe's TS types vary across API versions on whether
 * `current_period_end` lives on the Subscription or its items. Read
 * defensively: prefer items[0].current_period_end (newer API),
 * fall back to the top-level field (older API), null if neither.
 */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  type WithPeriodEnd = { current_period_end?: number | null }
  const subAny = sub as unknown as WithPeriodEnd
  const item0 = sub.items.data[0] as unknown as WithPeriodEnd | undefined
  const epoch = item0?.current_period_end ?? subAny.current_period_end ?? null
  return epoch ? new Date(epoch * 1000) : null
}

/**
 * Mark a subscription canceled in our DB. Called from
 * customer.subscription.deleted webhook. Idempotent — if the row is
 * already canceled, noop.
 */
export async function markCanceled(stripeSubId: string): Promise<void> {
  const prisma = getAuthPrisma()
  await prisma.subscription.updateMany({
    where: { stripeSubId },
    data: { status: 'canceled', cancelAt: null },
  })
}

/**
 * On invoice.payment_failed: bump status to past_due so seats.ts
 * falls back to the free-tier limit. Stripe handles dunning; we just
 * mirror the state.
 */
export async function markPastDue(stripeSubId: string): Promise<void> {
  const prisma = getAuthPrisma()
  await prisma.subscription.updateMany({
    where: { stripeSubId },
    data: { status: 'past_due' },
  })
}

/**
 * On invoice.paid: clear past_due if we'd previously set it. Most
 * happy-path renewals come through customer.subscription.updated
 * which already sets status=active, but invoice.paid is the canonical
 * "money landed" signal so we sync here too.
 */
export async function markActive(stripeSubId: string): Promise<void> {
  const prisma = getAuthPrisma()
  await prisma.subscription.updateMany({
    where: { stripeSubId },
    data: { status: 'active' },
  })
}
