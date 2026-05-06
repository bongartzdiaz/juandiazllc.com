/* Lazy Stripe singleton.

   Server-only — never imported by client components. The Stripe
   constructor reads STRIPE_SECRET_KEY at first use, not at module
   load, so `next build` works without it (CI image build, preview
   deploys without billing wired) and only fails on the first real
   billing request.

   API version pinned. Stripe's TypeScript types are versioned
   alongside the API; bumping the version is a deliberate change
   not a passive drift. Pin choices documented inline.

   Also exposes isStripeConfigured() so callers can render a clean
   503 ("billing not configured yet — operator: set STRIPE_SECRET_KEY")
   instead of the vague Stripe initialization error. Same pattern as
   Resend, Sentry, calendar OAuth elsewhere in this codebase. */

import Stripe from 'stripe'

// API version pinned to whatever the installed SDK ships as
// `LatestApiVersion`. Stripe's TypeScript types are versioned alongside
// the API; keeping this aligned with the SDK's compile-time type
// prevents drift between request shapes and response types.
const STRIPE_API_VERSION: Stripe.LatestApiVersion =
  '2025-02-24.acacia' satisfies Stripe.LatestApiVersion

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set — billing routes require it. ' +
        'Set it in Vercel env vars (production + preview).',
    )
  }
  cached = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    // Telemetry off — Stripe's client SDK by default reports timing
    // metrics. Off for privacy + reduced startup chatter.
    telemetry: false,
    // 3 retries on retryable errors (5xx, network) with exponential
    // backoff. Stripe's recommended default for server-side use.
    maxNetworkRetries: 3,
  })
  return cached
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

/** Test-only — clears the cached client so each test starts fresh. */
export function __resetStripeCache(): void {
  cached = null
}
