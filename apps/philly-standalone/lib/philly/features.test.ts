import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  FEATURES,
  isFeatureEnabled,
  setFeatureEnabled,
  clearFeatureOverride,
  clearFeatureCache,
  bustFeatureCache,
  readCachedFeature,
  listFeatures,
} from './features'

type Row = { organizationId: string | null; enabled: boolean; key: string }

/**
 * Mocks the three Prisma tables `isFeatureEnabled` reads:
 *   - featureFlag (the original flag table — the test's primary subject)
 *   - subscription (added by PR-2b — defaults to 'business' plan so the
 *     resolver's plan-tier check passes; this preserves test intent of
 *     testing FeatureFlag behavior, not plan-tier behavior)
 *   - orgFeatureOverride (added by PR-2b super-admin layer — defaults
 *     to null so no override is applied)
 *
 * Variants that test plan-tier or super-admin-override paths can pass
 * custom `subscriptionPlan` / `override` overrides.
 */
function fakePrisma(
  rows: Row[] = [],
  options: { subscriptionPlan?: string | null; override?: { state: string } | null } = {},
) {
  const { subscriptionPlan = 'business', override = null } = options

  // Handle BOTH query shapes:
  //   - { key, OR: [{ organizationId: null }, { organizationId: orgId }] }
  //     (adapter.ts path — when orgId is set)
  //   - { key, organizationId: null }
  //     (legacy global-only path — when orgId is nullish)
  type FindManyArgs = {
    where: {
      key: string
      OR?: Array<{ organizationId: string | null }>
      organizationId?: string | null
    }
  }
  const findMany = vi.fn(async ({ where }: FindManyArgs) => {
    const orgIds = where.OR
      ? where.OR.map(o => o.organizationId)
      : [where.organizationId === undefined ? null : where.organizationId]
    return rows.filter(r => r.key === where.key && orgIds.includes(r.organizationId))
  })
  const upsert = vi.fn(async () => ({}))
  const deleteMany = vi.fn(async () => ({ count: 1 }))
  const subscriptionFindUnique = vi.fn(async () =>
    subscriptionPlan === null ? null : { plan: subscriptionPlan },
  )
  const overrideFindUnique = vi.fn(async () => override)

  return {
    prisma: {
      featureFlag: { findMany, upsert, deleteMany },
      subscription: { findUnique: subscriptionFindUnique },
      orgFeatureOverride: { findUnique: overrideFindUnique },
    },
    findMany,
    upsert,
    deleteMany,
    subscriptionFindUnique,
    overrideFindUnique,
  }
}

describe('features', () => {
  beforeEach(() => {
    clearFeatureCache()
    vi.useRealTimers()
  })

  describe('isFeatureEnabled', () => {
    it('returns the code-side default when no rows exist', async () => {
      const { prisma } = fakePrisma([])
      const enabled = await isFeatureEnabled(
        prisma as never,
        'org_1',
        FEATURES.AI_CONTACT_ENRICHMENT.key,
      )
      expect(enabled).toBe(FEATURES.AI_CONTACT_ENRICHMENT.enabledByDefault)
    })

    it('uses the global default row when present', async () => {
      const { prisma } = fakePrisma([
        { organizationId: null, enabled: false, key: FEATURES.WEBHOOKS.key },
      ])
      const enabled = await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(enabled).toBe(false)
    })

    it('global kill-switch beats org-level enable (PR-2b rule 4)', async () => {
      // Behavior change from PR-2b: in the original Bundle BD code,
      // an org-specific enable=true would win over a global=false.
      // In the two-level resolver, globalFlag=false is a platform-level
      // KILL-SWITCH that beats any org-level opt-in. Rationale: when
      // the platform owner globally disables a feature (e.g., third-
      // party API outage), client-admin enable should not override —
      // otherwise the client's request fails confusingly anyway.
      // See lib/philly/features/resolve.test.ts rule 4 tests.
      const { prisma } = fakePrisma([
        { organizationId: null, enabled: false, key: FEATURES.WEBHOOKS.key },
        { organizationId: 'org_1', enabled: true, key: FEATURES.WEBHOOKS.key },
      ])
      const enabled = await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(enabled).toBe(false) // global kill-switch wins
    })

    it('falls through to global when org row is for a different org', async () => {
      const { prisma } = fakePrisma([
        { organizationId: 'org_2', enabled: false, key: FEATURES.WEBHOOKS.key },
        { organizationId: null, enabled: true, key: FEATURES.WEBHOOKS.key },
      ])
      const enabled = await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(enabled).toBe(true)
    })

    it('caches results for repeat reads (no second DB hit)', async () => {
      const { prisma, findMany } = fakePrisma([])
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(findMany).toHaveBeenCalledTimes(1)
    })

    it('returns false for unknown keys (fail-closed)', async () => {
      const { prisma } = fakePrisma([])
      // @ts-expect-error — exercising the unknown-key path.
      const enabled = await isFeatureEnabled(prisma as never, 'org_1', 'never-defined')
      expect(enabled).toBe(false)
    })

    it('treats null and undefined orgId equivalently for cache + read', async () => {
      const { prisma, findMany } = fakePrisma([
        { organizationId: null, enabled: false, key: FEATURES.WEBHOOKS.key },
      ])
      const a = await isFeatureEnabled(prisma as never, null, FEATURES.WEBHOOKS.key)
      const b = await isFeatureEnabled(prisma as never, undefined, FEATURES.WEBHOOKS.key)
      expect(a).toBe(false)
      expect(b).toBe(false)
      // Cache key collapses null/undefined to 'global', so the second
      // call is a hit.
      expect(findMany).toHaveBeenCalledTimes(1)
    })
  })

  describe('setFeatureEnabled', () => {
    it('upserts the row and busts the cache', async () => {
      const { prisma, upsert, findMany } = fakePrisma([
        { organizationId: 'org_1', enabled: true, key: FEATURES.WEBHOOKS.key },
      ])

      // Warm the cache first so we can check that bust happens.
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(findMany).toHaveBeenCalledTimes(1)
      expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).toBe(true)

      await setFeatureEnabled({
        prisma: prisma as never,
        organizationId: 'org_1',
        key: FEATURES.WEBHOOKS.key,
        enabled: false,
      })

      expect(upsert).toHaveBeenCalledTimes(1)
      // Cache should now be empty for this slot.
      expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).toBeNull()
    })

    it('throws on unknown keys', async () => {
      const { prisma } = fakePrisma([])
      await expect(
        setFeatureEnabled({
          prisma: prisma as never,
          organizationId: 'org_1',
          key: 'nope' as never,
          enabled: true,
        }),
      ).rejects.toThrow(/Unknown feature key/)
    })
  })

  describe('clearFeatureOverride', () => {
    it('deletes the matching row and busts the cache', async () => {
      const { prisma, deleteMany } = fakePrisma([])
      await clearFeatureOverride(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      expect(deleteMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_1', key: FEATURES.WEBHOOKS.key },
      })
    })
  })

  describe('bustFeatureCache', () => {
    it('removes a single key entry', () => {
      // Manually populate cache by reading once.
      const { prisma } = fakePrisma([])
      void isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      // Schedule fired async — drain microtasks.
      return Promise.resolve().then(() => {
        bustFeatureCache('org_1', FEATURES.WEBHOOKS.key)
        expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).toBeNull()
      })
    })

    it('busts every per-org cached entry when the global flag flips (Bundle BJ audit fix)', async () => {
      const { prisma } = fakePrisma([])
      // Warm three different orgs + the global slot for the same key.
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, 'org_2', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, 'org_3', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, null, FEATURES.WEBHOOKS.key)
      expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).not.toBeNull()
      expect(readCachedFeature('org_2', FEATURES.WEBHOOKS.key)).not.toBeNull()
      expect(readCachedFeature('org_3', FEATURES.WEBHOOKS.key)).not.toBeNull()
      expect(readCachedFeature(null, FEATURES.WEBHOOKS.key)).not.toBeNull()

      // Admin updates the global default → every org's cached value
      // for this key should drop, since they all might have been
      // resolved against the old global.
      bustFeatureCache(null, FEATURES.WEBHOOKS.key)

      expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).toBeNull()
      expect(readCachedFeature('org_2', FEATURES.WEBHOOKS.key)).toBeNull()
      expect(readCachedFeature('org_3', FEATURES.WEBHOOKS.key)).toBeNull()
      expect(readCachedFeature(null, FEATURES.WEBHOOKS.key)).toBeNull()
    })

    it('only busts the matching key (not other features)', async () => {
      const { prisma } = fakePrisma([])
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.WEBHOOKS.key)
      await isFeatureEnabled(prisma as never, 'org_1', FEATURES.AI_CONTACT_ENRICHMENT.key)

      bustFeatureCache(null, FEATURES.WEBHOOKS.key)

      expect(readCachedFeature('org_1', FEATURES.WEBHOOKS.key)).toBeNull()
      expect(readCachedFeature('org_1', FEATURES.AI_CONTACT_ENRICHMENT.key)).not.toBeNull()
    })
  })

  describe('listFeatures', () => {
    it('returns every catalogued feature with its default + description', () => {
      const list = listFeatures()
      expect(list.length).toBeGreaterThanOrEqual(3)
      const keys = list.map(f => f.key)
      expect(keys).toContain(FEATURES.AI_CONTACT_ENRICHMENT.key)
      expect(keys).toContain(FEATURES.WEBHOOKS.key)
      for (const f of list) {
        expect(typeof f.description).toBe('string')
        expect(f.description.length).toBeGreaterThan(0)
      }
    })
  })
})
