import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rate-limit — token bucket', () => {
  it('allows up to capacity calls in a burst', () => {
    const key = `test:burst:${Math.random()}`
    const opts = { capacity: 3, refillPerSec: 0 }
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(false) // 4th blocked
  })

  it('blocks when bucket is empty and returns positive retryAfter', () => {
    const key = `test:empty:${Math.random()}`
    const opts = { capacity: 1, refillPerSec: 0.1 } // slow refill
    expect(rateLimit(key, opts).ok).toBe(true)
    const blocked = rateLimit(key, opts)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
    expect(blocked.remaining).toBe(0)
  })

  it('isolates buckets by key', () => {
    const a = `test:iso-a:${Math.random()}`
    const b = `test:iso-b:${Math.random()}`
    const opts = { capacity: 1, refillPerSec: 0 }
    expect(rateLimit(a, opts).ok).toBe(true)
    expect(rateLimit(a, opts).ok).toBe(false)
    // key b is independent
    expect(rateLimit(b, opts).ok).toBe(true)
  })

  it('refills tokens over time', async () => {
    const key = `test:refill:${Math.random()}`
    const opts = { capacity: 1, refillPerSec: 100 } // refills 1 in 10ms
    expect(rateLimit(key, opts).ok).toBe(true)
    expect(rateLimit(key, opts).ok).toBe(false)
    await new Promise((r) => setTimeout(r, 30))
    expect(rateLimit(key, opts).ok).toBe(true)
  })
})
