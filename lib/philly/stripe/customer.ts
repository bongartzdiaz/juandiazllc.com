/* Stripe Customer creation + lookup, scoped per Organization.

   We map 1:1 — one Organization → one Stripe Customer. The customer
   is created lazily on the first checkout request. We persist the
   resulting `cus_…` id on Subscription.stripeCustomerId so subsequent
   Customer Portal sessions go to the same customer.

   Why not on Organization directly? The Subscription row is the
   billing-relationship record; the Organization is the tenant. Some
   tenants (free tier) never get a Stripe Customer at all. Putting
   the id on Subscription scopes "Stripe state" cleanly. */

import { getStripe } from './client'
import { getAuthPrisma } from '@/lib/philly/auth'

export interface OrgForCustomer {
  id: string
  name: string
}

/**
 * Find or create a Stripe Customer for an organization. The
 * `email` is the operator-provided billing contact (typically the
 * inviting admin). Stripe lets us update this later via the portal.
 *
 * Idempotent: if a Subscription row already has stripeCustomerId,
 * we reuse it. Otherwise we create a new Customer. The function does
 * NOT persist the new id — caller stitches it into a Subscription
 * upsert on Checkout completion.
 */
export async function ensureStripeCustomer(
  org: OrgForCustomer,
  billingEmail: string,
): Promise<string> {
  const prisma = getAuthPrisma()
  const existing = await prisma.subscription.findUnique({
    where: { organizationId: org.id },
    select: { stripeCustomerId: true },
  })
  if (existing?.stripeCustomerId) return existing.stripeCustomerId

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email: billingEmail,
    name: org.name,
    metadata: {
      organizationId: org.id,
    },
  })
  return customer.id
}
