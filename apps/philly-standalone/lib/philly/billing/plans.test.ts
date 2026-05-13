import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  PLANS,
  PLAN_SLUGS,
  isValidPlanSlug,
  planForStripePriceId,
  stripePriceIdForPlan,
  getPlanLimits,
  hasPlanFeature,
} from './plans'

/* Bundle DC — unit tests for the billing plan registry.
 * Pure business logic with no external deps; load-bearing for the
 * /signup → /api/billing/checkout flow because the slug-to-Stripe-
 * price-ID resolution sits between the user picking a tier and us
 * actually charging the right amount. */

describe('plans registry — Bundle CX/DC', () => {
  describe('isValidPlanSlug', () => {
    it('accepts the three priced tiers', () => {
      expect(isValidPlanSlug('operator')).toBe(true)
      expect(isValidPlanSlug('team')).toBe(true)
      expect(isValidPlanSlug('business')).toBe(true)
    })
    it('rejects unknown plans (including enterprise — no fixed price)', () => {
      expect(isValidPlanSlug('enterprise')).toBe(false)
      expect(isValidPlanSlug('free')).toBe(false)
      expect(isValidPlanSlug('')).toBe(false)
      expect(isValidPlanSlug(null)).toBe(false)
      expect(isValidPlanSlug(undefined)).toBe(false)
      expect(isValidPlanSlug(42)).toBe(false)
    })
    it('PLAN_SLUGS matches the keys of PLANS', () => {
      expect([...PLAN_SLUGS].sort()).toEqual(Object.keys(PLANS).sort())
    })
  })

  describe('stripePriceIdForPlan', () => {
    const ORIGINAL_ENV = { ...process.env }
    afterEach(() => { process.env = { ...ORIGINAL_ENV } })

    it('returns the env-var value when set', () => {
      process.env.STRIPE_PRICE_OPERATOR = 'price_test_op'
      process.env.STRIPE_PRICE_TEAM = 'price_test_team'
      expect(stripePriceIdForPlan('operator')).toBe('price_test_op')
      expect(stripePriceIdForPlan('team')).toBe('price_test_team')
    })
    it('throws a clear error when the env var is missing', () => {
      delete process.env.STRIPE_PRICE_BUSINESS
      expect(() => stripePriceIdForPlan('business')).toThrow(/STRIPE_PRICE_BUSINESS/)
    })
  })

  describe('planForStripePriceId — reverse lookup for webhooks', () => {
    const ORIGINAL_ENV = { ...process.env }
    beforeEach(() => {
      process.env.STRIPE_PRICE_OPERATOR = 'price_op_id'
      process.env.STRIPE_PRICE_TEAM = 'price_team_id'
      process.env.STRIPE_PRICE_BUSINESS = 'price_biz_id'
    })
    afterEach(() => { process.env = { ...ORIGINAL_ENV } })

    it('maps a known price id to its slug', () => {
      expect(planForStripePriceId('price_op_id')).toBe('operator')
      expect(planForStripePriceId('price_team_id')).toBe('team')
      expect(planForStripePriceId('price_biz_id')).toBe('business')
    })
    it('returns null for unknown price ids', () => {
      expect(planForStripePriceId('price_does_not_exist')).toBeNull()
      expect(planForStripePriceId('')).toBeNull()
    })
  })

  describe('getPlanLimits + hasPlanFeature — gate logic', () => {
    it('operator caps users + contacts', () => {
      const limits = getPlanLimits('operator')
      expect(limits.maxUsers).toBe(3)
      expect(limits.maxContacts).toBe(2_000)
    })
    it('team caps users + contacts higher', () => {
      const limits = getPlanLimits('team')
      expect(limits.maxUsers).toBe(10)
      expect(limits.maxContacts).toBe(25_000)
    })
    it('business has unlimited users (-1 sentinel on contacts)', () => {
      const limits = getPlanLimits('business')
      expect(limits.maxUsers).toBeGreaterThan(1_000_000)
      expect(limits.maxContacts).toBe(-1)
    })

    it('operator features are core + gdpr only', () => {
      expect(hasPlanFeature('operator', 'core')).toBe(true)
      expect(hasPlanFeature('operator', 'gdpr')).toBe(true)
      expect(hasPlanFeature('operator', 'drip')).toBe(false)
      expect(hasPlanFeature('operator', 'scim_users')).toBe(false)
      expect(hasPlanFeature('operator', 'ip_allowlist')).toBe(false)
    })
    it('team unlocks drip, advanced_filter, lead_scoring, webhooks, api_access, ai_command_bar, scim_users', () => {
      const team = getPlanLimits('team').features
      for (const f of ['drip', 'advanced_filter', 'lead_scoring', 'webhooks', 'api_access', 'ai_command_bar', 'scim_users'] as const) {
        expect(team.has(f), `team missing ${f}`).toBe(true)
      }
      // Still gated behind business
      expect(hasPlanFeature('team', 'ip_allowlist')).toBe(false)
      expect(hasPlanFeature('team', 'scim_groups')).toBe(false)
    })
    it('business unlocks every Bundle CX feature flag', () => {
      const all = [
        'core', 'gdpr',
        'drip', 'advanced_filter', 'lead_scoring',
        'webhooks', 'api_access', 'ai_command_bar',
        'scim_users', 'scim_groups',
        'ip_allowlist', 'session_idle_timeout',
        'signed_dpa', 'dedicated_cs',
      ] as const
      for (const f of all) {
        expect(hasPlanFeature('business', f), `business missing ${f}`).toBe(true)
      }
    })
  })
})
