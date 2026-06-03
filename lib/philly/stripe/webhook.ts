/* Stripe webhook signature verification + event router.

   Stripe signs every webhook with HMAC-SHA256 over the raw body +
   timestamp. We MUST verify the signature before trusting any field
   in the payload — otherwise an attacker could fake "subscription
   active" or "payment succeeded" events and unlock features.

   The signing secret is `STRIPE_WEBHOOK_SECRET` (NOT the API key —
   different secret, different rotation cadence).

   Replay protection: Stripe's library enforces a 5-minute tolerance
   on the timestamp by default. Our `verifyWebhook` accepts a
   `tolerance` override for tests.

   Event routing: only events listed in `HANDLED_EVENTS` are processed.
   Anything else returns ok:true with handled:false so Stripe stops
   retrying — they're not errors, just not interesting. */

import type Stripe from 'stripe'
import { getStripe } from './client'
import {
  upsertFromStripe,
  markCanceled,
  markPastDue,
  markActive,
} from './subscriptions'

export const HANDLED_EVENTS = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
  'invoice.paid',
] as const

export type HandledEventType = typeof HANDLED_EVENTS[number]

export function isHandledEvent(t: string): t is HandledEventType {
  return (HANDLED_EVENTS as readonly string[]).includes(t)
}

export interface VerifyResult {
  ok: boolean
  event?: Stripe.Event
  error?: 'missing_signature' | 'missing_secret' | 'invalid_signature'
}

/**
 * Verify the X-Stripe-Signature header against the raw body.
 * Returns the parsed event on success, or a typed error.
 *
 * `rawBody` MUST be the unmodified request body bytes — JSON.stringify
 * of req.body() would re-serialise and break the signature. Next.js 16's
 * `await req.text()` gives us the right shape.
 */
export function verifyWebhook(
  rawBody: string,
  signature: string | null | undefined,
  secret: string | null | undefined,
  tolerance?: number,
): VerifyResult {
  if (!signature) return { ok: false, error: 'missing_signature' }
  if (!secret) return { ok: false, error: 'missing_secret' }
  try {
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      secret,
      tolerance,
    )
    return { ok: true, event }
  } catch {
    // Stripe's constructEvent throws on bad sig OR malformed body.
    // We don't differentiate — both are "reject" from our side.
    return { ok: false, error: 'invalid_signature' }
  }
}

export interface DispatchResult {
  ok: boolean
  handled: boolean
  type: string
  /** Soft error — for logging. We still ack 200 so Stripe stops retrying. */
  warning?: string
}

/**
 * Dispatch a verified event to the right handler. Idempotent:
 * Stripe retries (with the same event.id) are safe to replay.
 *
 * On a soft error (missing organizationId, race-condition
 * upsert), we log a warning and still return ok:true. Stripe
 * retries are NOT useful for these — the upstream ID metadata
 * isn't going to magically appear next time.
 */
export async function dispatchEvent(event: Stripe.Event): Promise<DispatchResult> {
  if (!isHandledEvent(event.type)) {
    return { ok: true, handled: false, type: event.type }
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const orgId = resolveOrganizationId(sub)
      if (!orgId) {
        return {
          ok: true,
          handled: false,
          type: event.type,
          warning: 'no_organization_id_in_metadata',
        }
      }
      await upsertFromStripe(orgId, sub)
      return { ok: true, handled: true, type: event.type }
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await markCanceled(sub.id)
      return { ok: true, handled: true, type: event.type }
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const subId = invoiceSubscriptionId(inv)
      if (subId) await markPastDue(subId)
      return { ok: true, handled: true, type: event.type }
    }
    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      const subId = invoiceSubscriptionId(inv)
      if (subId) await markActive(subId)
      return { ok: true, handled: true, type: event.type }
    }
  }

  return { ok: true, handled: false, type: event.type }
}

/**
 * Look up the organizationId from the subscription's metadata, falling
 * back to the customer's metadata. Both should match — the customer is
 * created at Checkout time with metadata.organizationId; the
 * subscription's own metadata is set by the Checkout subscription_data.
 */
export function resolveOrganizationId(sub: Stripe.Subscription): string | null {
  if (sub.metadata?.organizationId) return sub.metadata.organizationId
  if (typeof sub.customer === 'string') {
    // Can't access customer metadata from a string id without a
    // round-trip — at this point we'd have to call Stripe to expand.
    // The Checkout route always sets sub metadata so this fallback
    // is only used for manual / dashboard-created subscriptions.
    return null
  }
  // DeletedCustomer doesn't carry metadata — narrow before access.
  if (sub.customer.deleted) return null
  return sub.customer.metadata?.organizationId ?? null
}

/** Stripe's Invoice.subscription field is sometimes string, sometimes
 *  Subscription, sometimes null (one-off invoices). Resolve to a
 *  string id or null. */
export function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  // Different API versions place this differently — read defensively.
  type WithSubscription = { subscription?: string | { id: string } | null }
  const x = inv as unknown as WithSubscription
  const s = x.subscription
  if (!s) return null
  return typeof s === 'string' ? s : s.id
}
