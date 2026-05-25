/* Adapter: Prisma → resolve() input → ResolveResult.
   ─────────────────────────────────────────────────────────────────
   PR-1 (resolve.ts) is a PURE function — no DB, no I/O, no Prisma.
   This file is the impedance-matching layer between Prisma rows and
   the pure resolver.

   It loads in parallel:
     - Organization's Subscription (for plan tier)
     - FeatureFlag rows (global + org-specific) for the requested key
     - OrgFeatureOverride row (super-admin layer) for (org, feature)

   Then maps the loaded rows into a ResolveInput and calls resolve().

   Why a Promise.all instead of three awaited queries:
     - Each query is independent (no foreign-key dependency between them)
     - 3 parallel ~5ms queries → ~5ms total, vs. ~15ms serial
     - Hot-path latency matters for feature-gate checks (every API call)

   Why an adapter and not direct calls inside resolve():
     - Keeps resolve() pure and unit-testable in ~5ms with no mocks
     - Tests for the adapter can mock Prisma without touching resolve()
     - Future migration to a different ORM (Drizzle? raw SQL?) touches
       only this file
   ──────────────────────────────────────────────────────────────── */

import type { PrismaClient } from '@prisma/client'
import { FEATURES, type FeatureKey } from '../features'
import { type PlanSlug, PLAN_SLUGS } from '../billing/plans'
import { resolve, type ResolveInput, type ResolveResult, type SuperAdminOverride } from './resolve'
import { planAllowsFeature } from './plan-map'

/**
 * Demo / no-subscription orgs default to operator-tier permissions.
 *
 * Operator is the LOWEST tier — this is the conservative default. If a
 * future "trial" tier is added with more permissions, change this to
 * 'trial' here; the rest of the resolver still works untouched.
 */
const NO_SUBSCRIPTION_DEFAULT_PLAN: PlanSlug = 'operator'

/**
 * Resolve a feature for an org against current DB state.
 *
 * Returns the same ResolveResult shape PR-1's resolve() returns —
 * `{enabled, source}` — so callers can use `source` for the UX badge
 * ("Disabled by your administrator" vs. "Not included in your plan").
 *
 * Unknown FEATURES key → returns `{enabled: false, source: 'default-disabled'}`
 * (fail-closed; same behavior as the existing isFeatureEnabled()).
 */
export async function isFeatureEnabledForOrg(
  prisma: PrismaClient,
  orgId: string,
  key: FeatureKey,
): Promise<ResolveResult> {
  const def = Object.values(FEATURES).find(f => f.key === key)
  if (!def) {
    return { enabled: false, source: 'default-disabled' }
  }

  // Parallel-load everything the resolver needs.
  const [subscription, featureFlags, override] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { plan: true },
    }),
    prisma.featureFlag.findMany({
      where: {
        key,
        OR: [{ organizationId: null }, { organizationId: orgId }],
      },
      select: { organizationId: true, enabled: true },
    }),
    prisma.orgFeatureOverride.findUnique({
      where: { organizationId_feature: { organizationId: orgId, feature: key } },
      select: { state: true },
    }),
  ])

  // Plan-tier check. If no Subscription row OR plan is unrecognized,
  // fall back to operator-tier (most restrictive — fail-safe).
  const planSlug = isValidPlanSlug(subscription?.plan)
    ? (subscription!.plan as PlanSlug)
    : NO_SUBSCRIPTION_DEFAULT_PLAN
  const planAllows = planAllowsFeature(planSlug, key)

  // FeatureFlag rows are scoped by organizationId IS NULL (global) or
  // organizationId = orgId. Pull the two slots out independently.
  const orgRow = featureFlags.find(r => r.organizationId === orgId)
  const globalRow = featureFlags.find(r => r.organizationId === null)

  const input: ResolveInput = {
    feature: key,
    planAllowsFeature: planAllows,
    globalFlag: globalRow?.enabled,
    orgFlag: orgRow?.enabled,
    superAdminOverride: normalizeOverride(override?.state),
    defaultEnabled: def.enabledByDefault,
  }

  return resolve(input)
}

/**
 * Normalize the string column value to the resolver's enum. Unknown
 * values (data corruption, mid-deploy schema state) → INHERIT for
 * safety: don't apply an override we can't interpret.
 */
function normalizeOverride(value: string | undefined): SuperAdminOverride {
  if (value === 'FORCED_ON' || value === 'FORCED_OFF') return value
  return 'INHERIT'
}

function isValidPlanSlug(value: string | null | undefined): value is PlanSlug {
  return typeof value === 'string' && (PLAN_SLUGS as readonly string[]).includes(value)
}
