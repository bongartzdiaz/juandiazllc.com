import { describe, it, expect } from 'vitest'
import { hashEmail } from './hash'

describe('hashEmail', () => {
  it('is deterministic for the same input', () => {
    expect(hashEmail('alice@example.com')).toBe(hashEmail('alice@example.com'))
  })

  it('normalises case and surrounding whitespace', () => {
    const canonical = hashEmail('alice@example.com')
    expect(hashEmail('  Alice@Example.COM  ')).toBe(canonical)
    expect(hashEmail('ALICE@EXAMPLE.COM\n')).toBe(canonical)
  })

  it('produces a 64-char hex digest (SHA-256)', () => {
    const digest = hashEmail('alice@example.com')
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns different hashes for different addresses', () => {
    expect(hashEmail('alice@example.com')).not.toBe(hashEmail('bob@example.com'))
  })
})
