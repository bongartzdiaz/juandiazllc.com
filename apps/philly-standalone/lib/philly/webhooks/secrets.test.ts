import { describe, it, expect, beforeAll } from 'vitest'
import { encryptSecret } from '@/lib/philly/crypto'
import { unwrapWebhookSecret, maskWebhookSecret } from './secrets'

beforeAll(() => {
  // crypto.ts derives the key from INTEGRATION_SECRET; set a deterministic
  // value so encrypt/decrypt round-trips in tests.
  process.env.INTEGRATION_SECRET = 'test-integration-secret-for-vitest'
})

describe('unwrapWebhookSecret', () => {
  it('decrypts an encrypted secret', () => {
    const plaintext = 'abc123-very-secret'
    const encrypted = encryptSecret(plaintext)!
    expect(unwrapWebhookSecret(encrypted)).toBe(plaintext)
  })

  it('passes through legacy plaintext (backwards compatibility)', () => {
    expect(unwrapWebhookSecret('legacy-plaintext-secret')).toBe('legacy-plaintext-secret')
  })

  it('returns null for empty / null / undefined', () => {
    expect(unwrapWebhookSecret(null)).toBeNull()
    expect(unwrapWebhookSecret(undefined)).toBeNull()
    expect(unwrapWebhookSecret('')).toBeNull()
  })

  it('returns null for a string that looks encrypted but fails to decrypt', () => {
    // Looks-encrypted: 3 dot-separated base64url parts with right lengths
    // but with random bytes that wont match the auth tag.
    const fake = 'AAAAAAAAAAAAAAAA.BBBBBBBB.CCCCCCCCCCCCCCCCCCCCCC'
    // looksEncrypted will accept this shape; decryptSecret will return null.
    expect(unwrapWebhookSecret(fake)).toBeNull()
  })
})

describe('maskWebhookSecret', () => {
  it('returns the first 8 chars of the plaintext + ellipsis', () => {
    const encrypted = encryptSecret('abcdefghijklmnop')!
    expect(maskWebhookSecret(encrypted)).toBe('abcdefgh...')
  })

  it('masks legacy plaintext correctly', () => {
    expect(maskWebhookSecret('plaintext-1234567890')).toBe('plaintex...')
  })

  it('returns empty string when input is empty / null / undefined', () => {
    expect(maskWebhookSecret(null)).toBe('')
    expect(maskWebhookSecret(undefined)).toBe('')
    expect(maskWebhookSecret('')).toBe('')
  })
})
