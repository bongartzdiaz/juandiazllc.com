import { describe, it, expect } from 'vitest'
import type Stripe from 'stripe'
import { isHandledStatus, subscriptionPeriodEnd } from './subscriptions'

describe('isHandledStatus', () => {
  it('accepts every Stripe subscription status we care about', () => {
    const handled = [
      'trialing', 'active', 'past_due', 'unpaid',
      'canceled', 'incomplete', 'incomplete_expired',
    ] as const
    for (const s of handled) {
      expect(isHandledStatus(s)).toBe(true)
    }
  })

  it('rejects unknown / legacy statuses', () => {
    expect(isHandledStatus('paused')).toBe(false)
    expect(isHandledStatus('trial_ended')).toBe(false)
    expect(isHandledStatus('')).toBe(false)
  })
})

describe('subscriptionPeriodEnd', () => {
  function fakeSub(opts: {
    topLevel?: number | null
    itemPeriodEnd?: number | null
  }): Stripe.Subscription {
    const item: Record<string, unknown> = { id: 'si_x' }
    if (opts.itemPeriodEnd !== undefined) item.current_period_end = opts.itemPeriodEnd
    const sub: Record<string, unknown> = {
      id: 'sub_x',
      items: { data: [item] },
    }
    if (opts.topLevel !== undefined) sub.current_period_end = opts.topLevel
    return sub as unknown as Stripe.Subscription
  }

  it('prefers items[0].current_period_end (newer Stripe API)', () => {
    const epoch = 1_700_000_000
    const result = subscriptionPeriodEnd(fakeSub({ itemPeriodEnd: epoch }))
    expect(result?.getTime()).toBe(epoch * 1000)
  })

  it('falls back to top-level current_period_end (older API)', () => {
    const epoch = 1_700_000_000
    const result = subscriptionPeriodEnd(fakeSub({ topLevel: epoch }))
    expect(result?.getTime()).toBe(epoch * 1000)
  })

  it('item-level wins over top-level when both are present', () => {
    const result = subscriptionPeriodEnd(fakeSub({
      topLevel: 1_000_000_000,
      itemPeriodEnd: 2_000_000_000,
    }))
    expect(result?.getTime()).toBe(2_000_000_000 * 1000)
  })

  it('returns null when neither field is set', () => {
    const result = subscriptionPeriodEnd(fakeSub({}))
    expect(result).toBeNull()
  })

  it('returns null when both fields are explicitly null', () => {
    const result = subscriptionPeriodEnd(fakeSub({
      topLevel: null,
      itemPeriodEnd: null,
    }))
    expect(result).toBeNull()
  })
})
