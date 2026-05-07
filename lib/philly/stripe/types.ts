/* Shared types for the Stripe billing surface.
 *
 * Single source of truth for the wire shape returned by
 * GET /api/billing/subscription and consumed by /philly/settings/billing.
 *
 * Hoisted out of the route + page after the calendar-side drift cycle —
 * the rule is "two consumers means a shared types module". Adding a
 * field here forces both ends to stay aligned via TypeScript instead of
 * silently rendering a stale UI.
 */

/** Stripe subscription status. Mirrors Stripe's `Subscription.status`
 *  enum. `trialing` and `active` are the honour-the-seatCount states;
 *  `past_due` and `unpaid` keep the row but seats.ts falls back to free
 *  tier so the customer isn't locked out mid-payment-failure. */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'

/** Subscription view for the billing UI. No card data, no Stripe IDs —
 *  just the fields the customer needs to see their plan + renewal date. */
export interface SubscriptionData {
  plan: string
  status: SubscriptionStatus
  seatCount: number
  currentPeriodEnd: string | null
  cancelAt: string | null
  createdAt: string
}

/** Seat usage view. `used` counts active users + pending-but-unaccepted
 *  invites against `limit` (the Subscription.seatCount when the sub is
 *  trialing/active, or Organization.seatLimit on the free tier). */
export interface SeatStatus {
  usersUsed: number
  invitesPending: number
  used: number
  limit: number
  available: number
}

/** GET /api/billing/subscription response shape. */
export interface SubscriptionResponse {
  data: {
    subscription: SubscriptionData | null
    seats: SeatStatus
  }
}
