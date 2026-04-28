import { describe, it, expect, beforeAll } from 'vitest'
import { encryptPii, decryptPii, isEncryptedPii, mapPiiOnRead } from './pii'

beforeAll(() => {
  // Pin a deterministic key for the tests so encryptPii is callable
  // without bleeding into other test files' env state.
  if (!process.env.INTEGRATION_SECRET) {
    process.env.INTEGRATION_SECRET = 'pii-test-key-32-bytes-of-entropy-please'
  }
})

describe('isEncryptedPii', () => {
  it('detects the v1 prefix', () => {
    expect(isEncryptedPii('enc:v1:abc.def.ghi')).toBe(true)
  })
  it('rejects plain strings', () => {
    expect(isEncryptedPii('hello')).toBe(false)
    expect(isEncryptedPii('enc:v0:abc')).toBe(false)
    expect(isEncryptedPii(null)).toBe(false)
    expect(isEncryptedPii(undefined)).toBe(false)
    expect(isEncryptedPii('')).toBe(false)
  })
})

describe('encryptPii / decryptPii', () => {
  it('returns null for null/empty input', () => {
    expect(encryptPii(null)).toBeNull()
    expect(encryptPii(undefined)).toBeNull()
    expect(encryptPii('')).toBeNull()
    expect(decryptPii(null)).toBeNull()
    expect(decryptPii('')).toBeNull()
  })

  it('round-trips a typical note', () => {
    const plain = 'Met at Web Summit. Looking for a fund-raising CRM. Mentioned €500k Series A.'
    const ct = encryptPii(plain)
    expect(ct).not.toBeNull()
    expect(ct!.startsWith('enc:v1:')).toBe(true)
    expect(decryptPii(ct)).toBe(plain)
  })

  it('round-trips unicode + emoji', () => {
    const plain = 'Spreekt Nederlands 🇳🇱 — interested in salderingsregeling tooling.'
    const ct = encryptPii(plain)
    expect(decryptPii(ct)).toBe(plain)
  })

  it('different ciphertexts for the same plaintext (random IV)', () => {
    const plain = 'same input'
    const a = encryptPii(plain)
    const b = encryptPii(plain)
    expect(a).not.toBe(b)
    expect(decryptPii(a)).toBe(plain)
    expect(decryptPii(b)).toBe(plain)
  })

  it('encryptPii is idempotent on already-encrypted input', () => {
    const ct = encryptPii('hello')!
    const ct2 = encryptPii(ct)
    expect(ct2).toBe(ct)
  })

  it('decryptPii returns plaintext unchanged for legacy unprefixed values', () => {
    expect(decryptPii('legacy plaintext note')).toBe('legacy plaintext note')
  })

  it('decryptPii returns null on a tampered prefixed value', () => {
    const ct = encryptPii('secret')!
    // Tamper with the inner ciphertext so the AES-GCM tag check fails.
    const tampered = `enc:v1:${'A'.repeat(20)}.${'B'.repeat(20)}.${'C'.repeat(22)}`
    expect(decryptPii(tampered)).toBeNull()
    // sanity: the original still decrypts
    expect(decryptPii(ct)).toBe('secret')
  })
})

describe('mapPiiOnRead', () => {
  it('decrypts the named fields and leaves others alone', () => {
    const ct = encryptPii('encrypted notes')!
    const row = {
      id: 'c1',
      name: 'Jane Doe',
      notes: ct,
      summary: 'Plain text — should not change',
    }
    const out = mapPiiOnRead(row, ['notes'])
    expect(out.notes).toBe('encrypted notes')
    expect(out.summary).toBe('Plain text — should not change')
    expect(out.id).toBe('c1')
    // Ensure the original is not mutated
    expect(row.notes).toBe(ct)
  })

  it('handles null values gracefully', () => {
    const out = mapPiiOnRead({ id: 'c1', notes: null }, ['notes'])
    expect(out.notes).toBeNull()
  })

  it('handles legacy plaintext (unprefixed)', () => {
    const out = mapPiiOnRead({ id: 'c1', notes: 'legacy' }, ['notes'])
    expect(out.notes).toBe('legacy')
  })
})
