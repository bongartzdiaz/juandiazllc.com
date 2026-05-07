import { describe, it, expect, beforeEach } from 'vitest'
import { signState, verifyState } from './state'

// We don't reset modules between tests — the HMAC key is derived
// once per process from INTEGRATION_SECRET / NEXTAUTH_SECRET. Setting
// the env var BEFORE first use is enough; subsequent state operations
// use the same key.
const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, INTEGRATION_SECRET: 'test-secret-123' }
})

describe('signState / verifyState', () => {
  const baseInput = {
    userId: 'user_abc',
    organizationId: 'org_xyz',
    provider: 'google' as const,
    redirect: '/philly/onboarding/calendar',
  }

  it('round-trips the payload', () => {
    const token = signState(baseInput)
    const result = verifyState(token)
    expect(result.ok).toBe(true)
    expect(result.state?.sub).toBe('user_abc')
    expect(result.state?.oid).toBe('org_xyz')
    expect(result.state?.prov).toBe('google')
    expect(result.state?.redirect).toBe('/philly/onboarding/calendar')
  })

  it('produces different tokens on each call (nonce)', () => {
    const a = signState(baseInput)
    const b = signState(baseInput)
    expect(a).not.toBe(b)
  })

  it('rejects null / empty / malformed tokens', () => {
    expect(verifyState(null).ok).toBe(false)
    expect(verifyState('').ok).toBe(false)
    expect(verifyState('foo').ok).toBe(false) // no dot
    expect(verifyState('a.b.c').ok).toBe(false) // too many parts
    expect(verifyState(null).error).toBe('malformed')
    expect(verifyState('foo').error).toBe('malformed')
  })

  it('rejects a tampered payload (signature mismatch)', () => {
    const token = signState(baseInput)
    const [payload, sig] = token.split('.')
    // Same anti-flake guard as the tampered-signature test below — pick
    // a replacement char guaranteed different from the original last char.
    const replacement = payload.endsWith('X') ? 'Y' : 'X'
    const tampered = `${payload.slice(0, -1)}${replacement}.${sig}`
    const result = verifyState(tampered)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('bad-signature')
  })

  it('rejects a tampered signature', () => {
    const token = signState(baseInput)
    const [payload, sig] = token.split('.')
    // Force a different last character — base64url uses [A-Za-z0-9_-]
    // and the original sig has uniform distribution, so picking 'X' or
    // 'Y' based on the existing last char guarantees a real change
    // (vs. flaky 1-in-64 collision when the last char was already 'X').
    const replacement = sig.endsWith('X') ? 'Y' : 'X'
    const tampered = `${payload}.${sig.slice(0, -1)}${replacement}`
    const result = verifyState(tampered)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('bad-signature')
  })

  it('rejects an expired token', () => {
    // Sign at t=0, verify 11 minutes later (default TTL is 10).
    const t0 = 1_000_000_000
    const token = signState(baseInput, t0)
    const result = verifyState(token, t0 + 11 * 60_000)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('accepts a token at the edge of TTL (just before expiry)', () => {
    const t0 = 1_000_000_000
    const token = signState(baseInput, t0)
    // 9m59s after sign — still within TTL.
    const result = verifyState(token, t0 + 9 * 60_000 + 59_000)
    expect(result.ok).toBe(true)
  })

  it('rejects a forged signature even at the right length', () => {
    const token = signState(baseInput)
    const [payload] = token.split('.')
    // Replace the signature with a same-length-but-wrong base64url value.
    // Documents the negative case for "tokens signed by a different key
    // do not verify" — a real different-key sig would land here too.
    const fakeSig = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    const result = verifyState(`${payload}.${fakeSig}`)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('bad-signature')
  })
})
