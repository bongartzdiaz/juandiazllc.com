/* Plan catalogue.

   Plans are NOT defined here — Stripe is the source of truth for
   pricing. We just map our internal plan keys to Stripe Price IDs
   set via env vars. The operator creates Products + Prices in the
   Stripe dashboard and pastes the price IDs into Vercel.

   Why not auto-create products from code? Because every deploy
   would risk creating duplicates, and a typo in the product name
   propagates instantly to invoices. Manual one-time setup is safer.

   The pricing draft (drafts/pricing/pricing-en.md) recommends:
     - Starter:      €49/mo per seat — 3 seat minimum
     - Professional: €79/mo per seat
     - Enterprise:   custom

   Trial period = 14 days, applied at Checkout via subscription_data.
   No card-up-front for trial — operator can flip via env var if
   anti-abuse becomes a problem. */

export type PlanKey = 'starter' | 'professional'

export interface Plan {
  key: PlanKey
  /** Display label for /settings/billing UI. */
  label: string
  /** Stripe Price ID env var name. */
  envPriceId: string
  /** One-line description shown on the upgrade page. */
  blurb: string
}

export const PLANS: Record<PlanKey, Plan> = {
  starter: {
    key: 'starter',
    label: 'Starter',
    envPriceId: 'STRIPE_PRICE_STARTER',
    blurb: 'Pipeline + contacts + invites for small teams.',
  },
  professional: {
    key: 'professional',
    label: 'Professional',
    envPriceId: 'STRIPE_PRICE_PROFESSIONAL',
    blurb: 'Everything in Starter, plus AI insights, audit log, automations.',
  },
}

export function planFromKey(key: string): Plan | null {
  if (key === 'starter' || key === 'professional') return PLANS[key]
  return null
}

export function getPriceId(plan: Plan): string | null {
  return process.env[plan.envPriceId] ?? null
}

/** Map a Stripe Price ID back to our plan key. Used by webhook handler
 *  when persisting subscription updates — Stripe sends us the price,
 *  we figure out which plan it is. Returns null if the price doesn't
 *  match any configured plan (legacy / migrated / one-off price). */
export function planKeyFromPriceId(priceId: string): PlanKey | null {
  for (const plan of Object.values(PLANS)) {
    if (process.env[plan.envPriceId] === priceId) return plan.key
  }
  return null
}

/** Trial length in days. Server-side constant; no need to make it
 *  configurable yet. Stripe Dashboard can override per-customer if a
 *  prospect needs a longer trial. */
export const TRIAL_DAYS = 14
