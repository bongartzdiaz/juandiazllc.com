import { describe, it, expect } from 'vitest'
import {
  canAdvanceTo,
  stepHref,
  stepProgress,
  isOnboardingActive,
  ONBOARDING_STEPS,
} from './onboarding'

describe('canAdvanceTo', () => {
  it('allows forward moves through the canonical sequence', () => {
    expect(canAdvanceTo('welcome', 'org')).toBe(true)
    expect(canAdvanceTo('org', 'team')).toBe(true)
    expect(canAdvanceTo('team', 'contacts')).toBe(true)
    expect(canAdvanceTo('contacts', 'calendar')).toBe(true)
    expect(canAdvanceTo('calendar', 'done')).toBe(true)
  })

  it('allows skipping forward (e.g. step 2 → step 4)', () => {
    expect(canAdvanceTo('org', 'contacts')).toBe(true)
    expect(canAdvanceTo('welcome', 'done')).toBe(true)
  })

  it('rejects backwards moves except from done', () => {
    expect(canAdvanceTo('team', 'welcome')).toBe(false)
    expect(canAdvanceTo('contacts', 'team')).toBe(false)
    expect(canAdvanceTo('calendar', 'org')).toBe(false)
  })

  it('allows going back from done — used by the resume-edit flow', () => {
    expect(canAdvanceTo('done', 'team')).toBe(true)
    expect(canAdvanceTo('done', 'welcome')).toBe(true)
  })

  it('allows idempotent same-step "advance" — server-side replay safety', () => {
    expect(canAdvanceTo('team', 'team')).toBe(true)
  })
})

describe('stepHref', () => {
  it('returns the canonical route for every step', () => {
    expect(stepHref('welcome')).toBe('/philly/onboarding/welcome')
    expect(stepHref('org')).toBe('/philly/onboarding/org')
    expect(stepHref('done')).toBe('/philly/onboarding/done')
  })
})

describe('stepProgress', () => {
  it('reports current/total — 5 user-visible steps', () => {
    expect(stepProgress('welcome')).toEqual({ current: 1, total: 5 })
    expect(stepProgress('calendar')).toEqual({ current: 5, total: 5 })
  })

  it('reports done as fully complete', () => {
    expect(stepProgress('done')).toEqual({ current: 5, total: 5 })
  })
})

describe('isOnboardingActive', () => {
  const future = new Date(Date.now() + 1000)
  const recent = new Date(Date.now() - 60 * 60 * 1000) // 1h ago
  const old = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h ago

  it('is active for a brand-new org on welcome', () => {
    expect(isOnboardingActive({
      onboardingStep: 'welcome',
      onboardingCompletedAt: null,
      onboardingSkippedAt: null,
    })).toBe(true)
  })

  it('is INACTIVE once completed', () => {
    expect(isOnboardingActive({
      onboardingStep: 'done',
      onboardingCompletedAt: future,
      onboardingSkippedAt: null,
    })).toBe(false)
  })

  it('is INACTIVE if step is done even without completedAt', () => {
    expect(isOnboardingActive({
      onboardingStep: 'done',
      onboardingCompletedAt: null,
      onboardingSkippedAt: null,
    })).toBe(false)
  })

  it('is INACTIVE for 24h after a skip', () => {
    expect(isOnboardingActive({
      onboardingStep: 'team',
      onboardingCompletedAt: null,
      onboardingSkippedAt: recent,
    })).toBe(false)
  })

  it('is active again 48h after a skip — banner re-appears', () => {
    expect(isOnboardingActive({
      onboardingStep: 'team',
      onboardingCompletedAt: null,
      onboardingSkippedAt: old,
    })).toBe(true)
  })
})

describe('ONBOARDING_STEPS', () => {
  it('contains exactly the 6 documented steps in order', () => {
    expect(ONBOARDING_STEPS).toEqual([
      'welcome', 'org', 'team', 'contacts', 'calendar', 'done',
    ])
  })
})
