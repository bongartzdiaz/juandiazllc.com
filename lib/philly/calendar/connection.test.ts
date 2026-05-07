import { describe, it, expect } from 'vitest'
import { shouldWriteLastUsed, __internals } from './connection'

const { LAST_USED_THROTTLE_MS } = __internals

describe('shouldWriteLastUsed', () => {
  const now = new Date('2026-05-07T12:00:00Z')

  it('writes when lastUsedAt is null (never written before)', () => {
    expect(shouldWriteLastUsed(now, null)).toBe(true)
  })

  it('skips when lastUsedAt is well within the throttle window', () => {
    const recent = new Date(now.getTime() - 1 * 60 * 1000) // 1 min ago
    expect(shouldWriteLastUsed(now, recent)).toBe(false)
  })

  it('skips when lastUsedAt is exactly at the throttle boundary', () => {
    const boundary = new Date(now.getTime() - LAST_USED_THROTTLE_MS)
    // > comparison, so equal-to-boundary should NOT trigger a write
    expect(shouldWriteLastUsed(now, boundary)).toBe(false)
  })

  it('writes when lastUsedAt is older than the throttle window', () => {
    const stale = new Date(now.getTime() - LAST_USED_THROTTLE_MS - 1)
    expect(shouldWriteLastUsed(now, stale)).toBe(true)
  })

  it('writes when lastUsedAt is hours old', () => {
    const old = new Date(now.getTime() - 4 * 60 * 60 * 1000)
    expect(shouldWriteLastUsed(now, old)).toBe(true)
  })

  it('handles future timestamps (clock skew) without faulting', () => {
    // If a clock-skew event ever wrote a future lastUsedAt, the diff is
    // negative and should NOT trigger a write — that would be a runaway
    // loop overwriting a future timestamp every read.
    const future = new Date(now.getTime() + 60 * 1000)
    expect(shouldWriteLastUsed(now, future)).toBe(false)
  })
})

describe('LAST_USED_THROTTLE_MS', () => {
  it('is 15 minutes — small enough for janitor use, large enough to not write per-request', () => {
    expect(LAST_USED_THROTTLE_MS).toBe(15 * 60 * 1000)
  })
})
