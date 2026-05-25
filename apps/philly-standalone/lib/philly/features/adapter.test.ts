/* Hermetic adapter tests — verify the Prisma → ResolveInput mapping
   is correct for every interesting precedence-rule combination.
   ─────────────────────────────────────────────────────────────────
   These tests use a hand-rolled mock Prisma client (no vi.mock of the
   whole module — keeps the tests close to documentation of what the
   adapter actually reads from Prisma).

   Each test:
     1. Sets up the Prisma mock to return specific subscription/featureFlag/
        override rows
     2. Calls isFeatureEnabledForOrg()
     3. Asserts the returned ResolveResult matches what resolve() would
        produce for the equivalent ResolveInput

   The point is NOT to re-test resolve() (PR-1's test suite has 29 cases
   pinning the precedence tree). The point is to pin the adapter
   ITSELF: that it loads from the right tables, maps fields correctly,
   handles missing rows, and forwards to resolve() with valid input.
   ──────────────────────────────────────────────────────────────── */

import { describe, it, expect, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { isFeatureEnabledForOrg } from './adapter'

// ── Hand-rolled Prisma mock ────────────────────────────────────────
//
// Captures the three table reads adapter.ts performs. Tests configure
// the return values per scenario.

interface MockState {
  subscription: { plan: string } | null
  featureFlags: Array<{ organizationId: string | null; enabled: boolean }>
  override: { state: string } | null
}

function makeMockPrisma(state: MockState): PrismaClient {
  return {
    subscription: {
      findUnique: async () => state.subscription,
    },
    featureFlag: {
      findMany: async () => state.featureFlags,
    },
    orgFeatureOverride: {
      findUnique: async () => state.override,
    },
  } as unknown as PrismaClient
}

const ORG_ID = 'org_test_001'

describe('isFeatureEnabledForOrg() — adapter behavior', () => {
  describe('Plan resolution', () => {
    it('Subscription with valid plan → uses that plan for plan-allows check', async () => {
      // Operator plan does NOT include 'webhooks', so it should resolve off.
      const prisma = makeMockPrisma({
        subscription: { plan: 'operator' },
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('plan-not-included')
    })

    it('Subscription with valid plan that includes feature → resolves on', async () => {
      // Team plan includes 'webhooks'; no other flags or overrides set.
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('enabled')
    })

    it('No subscription row → falls back to operator-tier permissions', async () => {
      // Demo orgs have no subscription. Webhooks is not in operator plan.
      const prisma = makeMockPrisma({
        subscription: null,
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('plan-not-included')
    })

    it('Invalid plan string → falls back to operator-tier (fail-safe)', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'enterprise-mythical' },
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('plan-not-included')
    })
  })

  describe('FeatureFlag rows', () => {
    it('Org-specific orgFlag=false → resolves client-admin-disabled (when in-plan)', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [{ organizationId: ORG_ID, enabled: false }],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('client-admin-disabled')
    })

    it('Global flag=false → resolves global-disabled (kill-switch)', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [{ organizationId: null, enabled: false }],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('global-disabled')
    })

    it('Both global AND org rows present — org takes precedence (lower-precedence)', async () => {
      // global=true (no kill-switch), org=false (client opt-out) → client wins
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [
          { organizationId: null, enabled: true },
          { organizationId: ORG_ID, enabled: false },
        ],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('client-admin-disabled')
    })
  })

  describe('OrgFeatureOverride (super-admin layer)', () => {
    it('state=FORCED_OFF → terminal off, beats orgFlag=true', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [{ organizationId: ORG_ID, enabled: true }],
        override: { state: 'FORCED_OFF' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('super-admin-forced-off')
    })

    it('state=FORCED_ON + in-plan → on with in-plan source', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: { state: 'FORCED_ON' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('super-admin-forced-on')
    })

    it('state=FORCED_ON + out-of-plan → on with out-of-plan source (preview)', async () => {
      // Operator-tier customer; super-admin previews webhooks (Team-tier).
      const prisma = makeMockPrisma({
        subscription: { plan: 'operator' },
        featureFlags: [],
        override: { state: 'FORCED_ON' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('super-admin-forced-on-out-of-plan')
    })

    it('state=INHERIT → falls through to plan/flag/default cascade', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: { state: 'INHERIT' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('enabled')
    })

    it('Unknown state string → defensive INHERIT (don\'t apply unparseable override)', async () => {
      // Data-corruption / mid-deploy schema state defense.
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: { state: 'SOMETHING_NEW_FROM_THE_FUTURE' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('enabled')
    })

    it('Override row absent → equivalent to INHERIT', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('enabled')
    })
  })

  describe('Defensive behavior', () => {
    it('Unknown FEATURE key → fail-closed (default-disabled)', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'business' },
        featureFlags: [],
        override: null,
      })
      // Cast through unknown — TS prevents this at compile time, but the
      // runtime must still defend (e.g., stale string from an old client).
      const r = await isFeatureEnabledForOrg(
        prisma,
        ORG_ID,
        'nonexistent-feature-key' as never,
      )
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('default-disabled')
    })
  })

  describe('Real-world scenarios', () => {
    it('Operator plan + super-admin previews drip-campaigns + client tries to opt-out', async () => {
      // Operator plan doesn't include drip. Super-admin FORCED_ON for preview.
      // Client tried to disable via orgFlag=false. Super-admin wins.
      const prisma = makeMockPrisma({
        subscription: { plan: 'operator' },
        featureFlags: [{ organizationId: ORG_ID, enabled: false }],
        override: { state: 'FORCED_ON' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'drip-campaigns')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('super-admin-forced-on-out-of-plan')
    })

    it('Team plan + Anthropic outage (global kill) + super-admin INHERIT', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [{ organizationId: null, enabled: false }],
        override: { state: 'INHERIT' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'ai-contact-enrichment')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('global-disabled')
    })

    it('Business plan + super-admin FORCED_OFF during security incident', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'business' },
        featureFlags: [],
        override: { state: 'FORCED_OFF' },
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(false)
      expect(r.source).toBe('super-admin-forced-off')
    })

    it('Happy path: Team plan, no overrides, in-plan feature → on', async () => {
      const prisma = makeMockPrisma({
        subscription: { plan: 'team' },
        featureFlags: [],
        override: null,
      })
      const r = await isFeatureEnabledForOrg(prisma, ORG_ID, 'webhooks')
      expect(r.enabled).toBe(true)
      expect(r.source).toBe('enabled')
    })
  })
})
