/* Maps lib/philly/features.ts FEATURES keys to lib/philly/billing/plans.ts
   PlanFeature values, enabling the resolver's "is this feature in the
   org's plan tier?" check.
   ───────────────────────────────────────────────────────────────────────

   Why a separate const (not derived from naming):
     - "ai-contact-enrichment" doesn't algorithmically map to "ai_command_bar"
     - Adding a new FEATURES entry should force a deliberate choice about
       which plan tier unlocks it — this Record makes the omission a
       TypeScript compile error
     - Renaming a PlanFeature without updating this map is also a TS error

   To add a new feature:
     1. Add an entry to FEATURES in lib/philly/features.ts
     2. Add the corresponding entry here mapping its `key` → PlanFeature
     3. (If needed) Add the PlanFeature to PLANS.{plan}.limits.features
        in lib/philly/billing/plans.ts

   Adapter consumers should always go through `planAllowsFeature(plan, key)`
   rather than reading PLAN_FEATURE_MAP directly — the helper handles
   unknown keys defensively (returns false / fail-closed). */

import type { FeatureKey } from '../features'
import type { PlanFeature, PlanSlug } from '../billing/plans'
import { hasPlanFeature } from '../billing/plans'

/**
 * Which PlanFeature gates each FEATURES key.
 *
 * The TypeScript `Record<FeatureKey, PlanFeature>` makes this a compile-time
 * exhaustiveness check: if a new FEATURES entry is added without a
 * corresponding entry here, `npx tsc --noEmit` fails.
 */
export const PLAN_FEATURE_MAP: Record<FeatureKey, PlanFeature> = {
  // AI features — Team plan unlocks the AI command bar; standalone AI
  // scoring is part of the lead-scoring bundle.
  'ai-contact-enrichment': 'ai_command_bar',
  'ai-deal-scoring': 'lead_scoring',

  // Outbound integrations — Team plan unlocks webhooks + API.
  'webhooks': 'webhooks',

  // Realtime event bus is part of core (every plan has it). Operators
  // who upgrade from a static-page CRM expect SSE to "just work."
  'realtime': 'core',

  // Enterprise identity provisioning — Team unlocks user SCIM, Business
  // additionally unlocks group SCIM (not gated through this map; the
  // SCIM group endpoints have their own hasPlanFeature gate).
  'scim': 'scim_users',

  // Marketing automation — Team plan unlocks drip campaigns.
  'drip-campaigns': 'drip',
}

/**
 * Whether the given plan-tier includes the given feature.
 *
 * Defensive fallback: if the FEATURES key has no plan-map entry (i.e.,
 * a new feature was added without updating this file — caught at compile
 * time, but defensive at runtime), returns false (fail-closed). The
 * super-admin can still force-on the feature via OrgFeatureOverride;
 * client-admin and global flags cannot bypass plan-not-included.
 */
export function planAllowsFeature(plan: PlanSlug, key: FeatureKey): boolean {
  const planFeature = PLAN_FEATURE_MAP[key]
  if (!planFeature) {
    // Unknown FEATURES key — fail closed.
    return false
  }
  return hasPlanFeature(plan, planFeature)
}
