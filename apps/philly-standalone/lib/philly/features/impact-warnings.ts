/* Impact warnings — count of user-facing side effects when a client-admin
   disables a feature.
   ──────────────────────────────────────────────────────────────────
   Client-admin disables drip-campaigns → N currently-enrolled customers
   stop receiving the scheduled emails. The UI surfaces that count in
   the confirm dialog so the admin understands the blast radius before
   they click.

   Returns null for features where the "impact count" doesn't map to
   a meaningful number (e.g., AI enrichment — disabling just means
   no new aiAttributes get computed; existing contact rows are
   unchanged). For those, the UI skips the impact warning and falls
   back to a generic confirm prompt.

   Each entry MUST query within `organizationId = orgId` — never
   count across orgs. PR-4 — pairs with PR-3's SourceBadge. */

import type { PrismaClient } from '@prisma/client'
import type { FeatureKey } from '../features'

export interface FeatureImpact {
  /** Numeric count for the i18n `{count}` placeholder. */
  count: number
  /**
   * i18n key suffix under `features.impact.*` in messages/*.json.
   * The UI looks up `t(`impact.${messageKey}`, { count })`.
   */
  messageKey: 'drip-campaigns' | 'webhooks' | 'scim'
}

/**
 * Count of user-facing things this org will affect by disabling the
 * feature. Returns null for features with no quantifiable impact.
 *
 * Pure-ish: reads from Prisma, never writes. Caller decides whether
 * to surface the warning (e.g., skip when count === 0).
 */
export async function getDisableImpact(
  prisma: PrismaClient,
  orgId: string,
  key: FeatureKey,
): Promise<FeatureImpact | null> {
  switch (key) {
    case 'drip-campaigns': {
      // Active enrollments: customers currently receiving scheduled
      // drip emails. Disabling drip pauses these (existing rows stay
      // but the cron skips them). The UX problem is the count is
      // INVISIBLE to the admin until customers complain.
      const count = await prisma.dripEnrollment.count({
        where: { organizationId: orgId, status: 'active' },
      })
      return { count, messageKey: 'drip-campaigns' }
    }
    case 'webhooks': {
      // Active webhook subscriptions. Disabling = third-party systems
      // stop receiving event fan-out. Same invisibility problem.
      const count = await prisma.webhook.count({
        where: { organizationId: orgId, enabled: true },
      })
      return { count, messageKey: 'webhooks' }
    }
    case 'scim': {
      // ScimGroup rows = active IdP-managed groups. Disabling SCIM
      // causes IdPs to get 503s on subsequent provisioning calls,
      // which IdPs retry — but if SCIM stays off long enough the
      // queue eventually drops.
      const count = await prisma.scimGroup.count({
        where: { organizationId: orgId },
      })
      return { count, messageKey: 'scim' }
    }
    // Features without a meaningful count → no impact warning shown.
    case 'ai-contact-enrichment':
    case 'ai-deal-scoring':
    case 'realtime':
      return null
    default:
      // Defensive: any future FEATURE key without an explicit case
      // surfaces no warning rather than crashing. The TS exhaustiveness
      // check on FeatureKey would normally catch this at compile time,
      // but the default arm preserves runtime safety if FEATURES grows
      // without a corresponding impact-warnings update.
      return null
  }
}
