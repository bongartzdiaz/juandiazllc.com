import { describe, it, expect, beforeEach } from 'vitest'
import {
  PLANS, planFromKey, getPriceId, planKeyFromPriceId, TRIAL_DAYS,
} from './plans'

const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.STRIPE_PRICE_STARTER
  delete process.env.STRIPE_PRICE_PROFESSIONAL
})

describe('planFromKey', () => {
  it('returns the plan for known keys', () => {
    expect(planFromKey('starter')?.key).toBe('starter')
    expect(planFromKey('professional')?.key).toBe('professional')
  })

  it('returns null for unknown keys', () => {
    expect(planFromKey('enterprise')).toBeNull()
    expect(planFromKey('')).toBeNull()
    expect(planFromKey('STARTER')).toBeNull() // case-sensitive
  })
})

describe('getPriceId', () => {
  it('reads from the env var named on the plan', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_abc123'
    expect(getPriceId(PLANS.starter)).toBe('price_abc123')
  })

  it('returns null when the env var is unset', () => {
    expect(getPriceId(PLANS.starter)).toBeNull()
  })
})

describe('planKeyFromPriceId', () => {
  it('returns the plan key matching a configured price id', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter_xyz'
    process.env.STRIPE_PRICE_PROFESSIONAL = 'price_pro_xyz'
    expect(planKeyFromPriceId('price_starter_xyz')).toBe('starter')
    expect(planKeyFromPriceId('price_pro_xyz')).toBe('professional')
  })

  it('returns null for unconfigured / legacy price ids', () => {
    process.env.STRIPE_PRICE_STARTER = 'price_starter_xyz'
    expect(planKeyFromPriceId('price_legacy_old')).toBeNull()
  })

  it('returns null when no plans are configured', () => {
    expect(planKeyFromPriceId('price_anything')).toBeNull()
  })
})

describe('TRIAL_DAYS', () => {
  it('is 14 days', () => {
    expect(TRIAL_DAYS).toBe(14)
  })
})
