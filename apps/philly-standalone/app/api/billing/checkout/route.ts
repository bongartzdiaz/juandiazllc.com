/* POST /api/billing/checkout — create a Stripe Checkout session.
   ─────────────────────────────────────────────────────────────────
   Caller flow:
     1. Marketing-side /pricing CTAs land an authenticated user on
        /signup?plan=<slug> (Bundle CY will wire that route).
     2. Signup completes → user redirected here with the chosen plan.
     3. We create-or-reuse a Stripe Customer for the org, then
        create a Checkout session with that price ID. Stripe redirects
        the user to its hosted page, then back to our success URL.

   Notes:
     * One Stripe Customer per Organization (not per User). Storing
       it on the Subscription row keeps the mapping straightforward.
     * If the org already has an active subscription, we route them
       to the Customer Portal instead of a new Checkout (Stripe
       handles plan upgrades / downgrades / payment-method updates).
     * Rate-limited via PRESET_MUTATION because Stripe charges for
       Customer creation in test mode at scale and we don't want a
       loop to torch our quota.

   Bundle CX — initial implementation. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireScope } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'
import { stripe, isStripeConfigured } from '@/lib/philly/billing/stripe'
import { parseBody } from '@/lib/philly/api/validate'
import {
  isValidPlanSlug,
  stripePriceIdForPlan,
  type PlanSlug,
} from '@/lib/philly/billing/plans'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  plan: z.unknown().optional(),
}).passthrough()

// Bundle DE — resolve the site URL from the incoming request when
// NEXT_PUBLIC_SITE_URL is unset, instead of falling back to a
// hardcoded production URL. A DEUS-SHARED partner deploy that
// forgets to set the env var would otherwise redirect Stripe back
// to juandiazllc.com mid-checkout, dropping the user on the wrong
// domain. `req.nextUrl.origin` resolves to whatever proxy/host
// served the request.
function siteUrlFrom(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin
}

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`billing:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Billing is not configured on this deployment. Contact sales.' },
      { status: 503 },
    )
  }

  const body = await parseBody(req, bodySchema)
  if (body instanceof NextResponse) return body
  const plan = body.plan
  if (!isValidPlanSlug(plan)) return jsonError('Invalid plan', 400)

  const prisma = getAuthPrisma()

  // 1. Look up the org + any existing subscription.
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    include: { subscription: true },
  })
  if (!org) return jsonError('Organization not found', 404)

  try {
    // 2. If the org already has a customer + active subscription, route
    //    to the Customer Portal so the user can change plan there
    //    rather than creating a second subscription. Stripe rejects
    //    duplicate active subscriptions for the same Customer on the
    //    same product anyway.
    if (org.subscription && ['active', 'trialing', 'past_due'].includes(org.subscription.status)) {
      const portal = await stripe().billingPortal.sessions.create({
        customer: org.subscription.stripeCustomerId,
        return_url: `${siteUrlFrom(req)}/philly/settings`,
      })
      return NextResponse.json({ url: portal.url, mode: 'portal' })
    }

    // 3. Create or reuse a Stripe Customer for the org. We key on
    //    Stripe's metadata.organizationId so the dashboard shows
    //    the link cleanly, and so a second checkout from the same
    //    org reuses the customer.
    let customerId = org.subscription?.stripeCustomerId
    if (!customerId) {
      const customer = await stripe().customers.create({
        name: org.name,
        email: scope.email ?? undefined,
        metadata: { organizationId: org.id, plan: plan as PlanSlug },
      })
      customerId = customer.id
    }

    // 4. Create the Checkout session.
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: stripePriceIdForPlan(plan as PlanSlug), quantity: 1 }],
      success_url: `${siteUrlFrom(req)}/philly/welcome?checkout=success&plan=${plan}`,
      cancel_url:  `${siteUrlFrom(req)}/pricing?checkout=cancelled`,
      // 14-day free trial matches the pricing-page FAQ + the lede.
      subscription_data: {
        trial_period_days: 14,
        metadata: { organizationId: org.id, plan: plan as PlanSlug },
      },
      // Tax handled automatically — Stripe Tax must be enabled in the
      // dashboard. If not enabled this is a no-op.
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      metadata: { organizationId: org.id, plan: plan as PlanSlug },
    })

    await logAudit({
      scope,
      action: 'create',
      entity: 'subscription',
      entityId: customerId,
      changes: { plan: { old: null, new: plan } },
    })

    return NextResponse.json({ url: session.url, mode: 'checkout' })
  } catch (err) {
    logger.error('[billing/checkout] failed', {
      err: err instanceof Error ? err.message : String(err),
      organizationId: org.id,
      plan,
    })
    return jsonError('Checkout creation failed', 500)
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}
