/* Bundle CX — Stripe client + helpers.
 *
 * Lazy-init pattern: stripe() returns a cached client created on first
 * call. Throws if STRIPE_SECRET_KEY is unset — better to fail at first
 * request than to load a phantom client at boot that 500s every
 * checkout attempt.
 *
 * Why this thin wrapper instead of importing 'stripe' directly at each
 * call site: (1) one place to swap API version when Stripe rolls one,
 * (2) one place to add Sentry breadcrumbs around outbound calls, and
 * (3) lets the rest of the codebase typecheck even when STRIPE_SECRET_KEY
 * isn't set in CI / local dev. */

import Stripe from 'stripe'

let _client: Stripe | null = null

export function stripe(): Stripe {
  if (_client) return _client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set. Get it from Stripe Dashboard → Developers → API keys.'
    )
  }
  _client = new Stripe(key, {
    // App-name in the User-Agent helps Stripe support trace which
    // integration sent a request. API version is omitted intentionally
    // so the installed SDK's pinned version is used — Stripe 22's
    // default is 2026-04-22.dahlia and that's what the types expect.
    //
    // Bundle DE — `url` reads from the deployment's own SITE_URL env
    // var so DEUS-SHARED partner deploys identify as themselves to
    // Stripe support, not as juandiazllc.com.
    appInfo: {
      name: 'Philly CRM',
      url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://philly-crm.local',
    },
  })
  return _client
}

/** Stripe webhook signing secret — separate from the API key. Used to
 *  verify the `Stripe-Signature` header on incoming events. */
export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set. Get it from Stripe Dashboard → Developers → ' +
      'Webhooks → your endpoint → Signing secret.'
    )
  }
  return secret
}

/** Returns true if Stripe is configured enough to handle checkout. The
 *  /pricing CTAs check this and degrade to a "contact sales" link when
 *  Stripe isn't set up yet (early-stage / demo deployments). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET
}
