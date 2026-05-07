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
import { getAppBaseUrl } from '@/lib/philly/app-url'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

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
  const base = getAppBaseUrl()
  if (!base.ok) {
    // Same fail-fast as checkout — without a valid base, Stripe rejects
    // a relative return_url with an opaque API error and the user sees
    // a 5xx with no actionable message.
    return jsonError(
      'NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL must be set for return URLs',
      503,
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${base.url}/philly/settings/billing`,
  })

  if (!session.url) {
    logger.error('[billing] portal session has no url', { sessionId: session.id })
    return jsonError('Portal session creation failed', 502)
  }

  logger.info('[billing] portal session created', {
    orgId: scope.organizationId,
    customerId: sub.stripeCustomerId,
  })

  // Audit Customer Portal access. The portal lets the admin cancel the
  // subscription, swap payment methods, change tax IDs, and download
  // invoices — all SOC2 / GDPR-relevant actions. Stripe webhooks fire
  // for the resulting state changes (subscription.deleted, etc.) but
  // those are server-to-server with no userId. This row ties the
  // Stripe-side action back to the admin who opened the portal.
  await logAudit({
    scope,
    action: 'update',
    entity: 'subscription',
    entityId: null,
    changes: {
      action: { old: null, new: 'open_billing_portal' },
      stripeCustomerId: { old: null, new: sub.stripeCustomerId },
      portalSessionId: { old: null, new: session.id },
    },
  })

  return NextResponse.json({ data: { url: session.url } })
}
