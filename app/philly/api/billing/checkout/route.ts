/* POST /api/billing/checkout
 *
 * Body: { plan: 'starter' | 'professional', seatCount?: number }
 *
 * Creates a Stripe Checkout Session for the current org's admin
 * to start a paid subscription. Trial = 14 days, no card-up-front
 * abuse-mitigation as a follow-up if needed.
 *
 * Returns { url } — client redirects to Stripe-hosted checkout.
 *
 * Admin-only: viewer + manager get 403. Customer ID is created
 * lazily — first checkout for an org provisions the customer.
 *
 * Errors:
 *   - 401 unauthenticated
 *   - 403 not admin
 *   - 400 unknown plan / seatCount out of range
 *   - 503 Stripe not configured (missing STRIPE_SECRET_KEY or price ID)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { validateBody } from '@/lib/philly/validation'
import { getStripe, isStripeConfigured } from '@/lib/philly/stripe/client'
import { planFromKey, getPriceId, TRIAL_DAYS } from '@/lib/philly/stripe/plans'
import { ensureStripeCustomer } from '@/lib/philly/stripe/customer'
import { getSeatStatus } from '@/lib/philly/seats'
import { getAppBaseUrl } from '@/lib/philly/app-url'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'professional']),
  // Default to current seat usage so they buy "what we already have"
  // without thinking. Bounded so a typo doesn't trigger an absurd charge.
  seatCount: z.number().int().min(1).max(500).optional(),
})

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  if (!isStripeConfigured()) {
    return jsonError(
      'Billing is not configured yet. Operator: set STRIPE_SECRET_KEY ' +
        'and STRIPE_PRICE_* env vars.',
      503,
    )
  }

  const limited = enforceRateLimit(`billing-checkout:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, checkoutSchema)
  if (!parsed.success) return parsed.response

  const plan = planFromKey(parsed.data.plan)
  if (!plan) return jsonError(`Unknown plan: ${parsed.data.plan}`, 400)
  const priceId = getPriceId(plan)
  if (!priceId) {
    return jsonError(
      `Plan "${plan.key}" has no Stripe Price ID. Operator: set ${plan.envPriceId}.`,
      503,
    )
  }

  // Default seat count = current usage so the math is honest from the
  // customer's perspective. They can change it in the Stripe Customer
  // Portal afterwards.
  const seats = await getSeatStatus(scope.organizationId)
  const seatCount = parsed.data.seatCount ?? Math.max(1, seats.used)

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { id: true, name: true },
  })
  if (!org) return jsonError('Organization not found', 404)

  const billingEmail = scope.email ?? `admin-${org.id}@example.invalid`
  const customerId = await ensureStripeCustomer(org, billingEmail)

  const stripe = getStripe()
  const base = getAppBaseUrl()
  if (!base.ok) {
    return jsonError(
      'NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL must be set for return URLs',
      503,
    )
  }
  const trimmed = base.url

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: seatCount,
      },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: {
        organizationId: org.id,
        plan: plan.key,
      },
    },
    metadata: {
      organizationId: org.id,
      plan: plan.key,
    },
    // Allow the customer to update tax id / billing address inside
    // Checkout. Required for EU VAT on B2B invoices.
    tax_id_collection: { enabled: true },
    billing_address_collection: 'required',
    success_url: `${trimmed}/philly/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${trimmed}/philly/settings/billing?canceled=1`,
  })

  if (!session.url) {
    logger.error('[billing] checkout session has no url', { sessionId: session.id })
    return jsonError('Checkout session creation failed', 502)
  }

  logger.info('[billing] checkout session created', {
    orgId: org.id,
    plan: plan.key,
    seatCount,
    sessionId: session.id,
  })

  // Audit the *intent* — the actual Subscription row gets created later
  // via webhook (customer.subscription.created). Capturing the intent
  // here gives auditors a who-clicked-what trail even if the customer
  // never completes Checkout (drops off, declines card, etc.). The
  // entityId is null because no Subscription exists yet; we record the
  // Stripe customer + session ids in `changes` for cross-reference.
  await logAudit({
    scope,
    action: 'create',
    entity: 'subscription',
    entityId: null,
    changes: {
      plan: { old: null, new: plan.key },
      seatCount: { old: null, new: seatCount },
      stripeCustomerId: { old: null, new: customerId },
      stripeCheckoutSessionId: { old: null, new: session.id },
    },
  })

  return NextResponse.json({ data: { url: session.url } })
}
