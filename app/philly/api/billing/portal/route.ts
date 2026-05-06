/* POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session so the admin can manage
 * their subscription, payment methods, invoices, and tax info.
 *
 * Returns { url }. Admin-only.
 *
 * Errors:
 *   - 401 unauthenticated
 *   - 403 not admin
 *   - 404 no Stripe customer (no subscription has ever been created)
 *   - 503 Stripe not configured
 */

import { NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { getStripe, isStripeConfigured } from '@/lib/philly/stripe/client'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  if (!isStripeConfigured()) {
    return jsonError('Billing is not configured yet.', 503)
  }

  const limited = enforceRateLimit(`billing-portal:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const prisma = getAuthPrisma()
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: scope.organizationId },
    select: { stripeCustomerId: true },
  })
  if (!sub?.stripeCustomerId) {
    return jsonError('No billing customer yet. Start a subscription first.', 404)
  }

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const trimmed = baseUrl.replace(/\/$/, '')

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${trimmed}/philly/settings/billing`,
  })

  logger.info('[billing] portal session created', {
    orgId: scope.organizationId,
    customerId: sub.stripeCustomerId,
  })

  return NextResponse.json({ data: { url: session.url } })
}
