/* Bundle CX — billing plan registry.
 *
 * Single source of truth mapping our public plan slugs (operator /
 * team / business — matching pricing.tier.<slug>.* in
 * /lib/i18n/dict.ts on the marketing side) to the Stripe price IDs
 * the operator created in their Stripe Dashboard.
 *
 * Stripe price IDs live in env vars so we never hardcode them; the
 * operator sets them per environment (test / live) via the standard
 * Vercel env-var UI. Missing env vars throw a clear error at boot
 * rather than silently routing customers to a wrong price.
 *
 * Plan feature caps are also here — the gate logic at the route layer
 * uses `getPlanLimits(plan)` to check seat / contact counts. */

export type PlanSlug = 'operator' | 'team' | 'business'

export const PLAN_SLUGS = ['operator', 'team', 'business'] as const

export interface PlanDefinition {
  slug: PlanSlug
  /** EUR per month — for display only; Stripe is source of truth at checkout. */
  priceEurPerMonth: number
  /** Stripe price ID env var name (e.g. STRIPE_PRICE_OPERATOR). */
  envVar: string
  /** Per-plan caps used by the gate at app/api/* and feature-flag layer. */
  limits: PlanLimits
}

export interface PlanLimits {
  maxUsers: number
  /** -1 = unlimited. */
  maxContacts: number
  /** Bundle-level features unlocked by this plan. Mirrors the bullets
   *  on the pricing page; checked by `hasPlanFeature(plan, key)`. */
  features: ReadonlySet<PlanFeature>
}

export type PlanFeature =
  | 'core'
  | 'gdpr'
  | 'drip'
  | 'advanced_filter'
  | 'lead_scoring'
  | 'webhooks'
  | 'api_access'
  | 'ai_command_bar'
  | 'scim_users'
  | 'scim_groups'
  | 'ip_allowlist'
  | 'session_idle_timeout'
  | 'signed_dpa'
  | 'dedicated_cs'

export const PLANS: Record<PlanSlug, PlanDefinition> = {
  operator: {
    slug: 'operator',
    priceEurPerMonth: 49,
    envVar: 'STRIPE_PRICE_OPERATOR',
    limits: {
      maxUsers: 3,
      maxContacts: 2_000,
      features: new Set<PlanFeature>(['core', 'gdpr']),
    },
  },
  team: {
    slug: 'team',
    priceEurPerMonth: 199,
    envVar: 'STRIPE_PRICE_TEAM',
    limits: {
      maxUsers: 10,
      maxContacts: 25_000,
      features: new Set<PlanFeature>([
        'core', 'gdpr',
        'drip', 'advanced_filter', 'lead_scoring',
        'webhooks', 'api_access', 'ai_command_bar',
        'scim_users',
      ]),
    },
  },
  business: {
    slug: 'business',
    priceEurPerMonth: 599,
    envVar: 'STRIPE_PRICE_BUSINESS',
    limits: {
      maxUsers: Number.MAX_SAFE_INTEGER,
      maxContacts: -1,
      features: new Set<PlanFeature>([
        'core', 'gdpr',
        'drip', 'advanced_filter', 'lead_scoring',
        'webhooks', 'api_access', 'ai_command_bar',
        'scim_users', 'scim_groups',
        'ip_allowlist', 'session_idle_timeout',
        'signed_dpa', 'dedicated_cs',
      ]),
    },
  },
}

/** Reverse lookup: which plan does this Stripe price ID belong to?
 *  Used by the webhook handler when Stripe sends us a price change. */
export function planForStripePriceId(priceId: string): PlanSlug | null {
  for (const slug of PLAN_SLUGS) {
    if (process.env[PLANS[slug].envVar] === priceId) return slug
  }
  return null
}

/** Resolve the Stripe price ID for a plan slug. Throws if the env var
 *  isn't set — better to fail fast at checkout creation than to silently
 *  send the customer to the wrong tier. */
export function stripePriceIdForPlan(plan: PlanSlug): string {
  const envVar = PLANS[plan].envVar
  const value = process.env[envVar]
  if (!value) {
    throw new Error(
      `Missing Stripe price ID for plan "${plan}". Set ${envVar} in the environment ` +
      `(get the price ID from Stripe Dashboard → Products → ${plan} → API ID).`
    )
  }
  return value
}

export function getPlanLimits(plan: PlanSlug): PlanLimits {
  return PLANS[plan].limits
}

export function hasPlanFeature(plan: PlanSlug, feature: PlanFeature): boolean {
  return PLANS[plan].limits.features.has(feature)
}

export function isValidPlanSlug(value: unknown): value is PlanSlug {
  return typeof value === 'string' && (PLAN_SLUGS as readonly string[]).includes(value)
}
