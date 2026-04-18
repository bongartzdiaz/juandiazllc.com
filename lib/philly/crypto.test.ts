import { describe, it, expect } from 'vitest'
import { encryptSecret, decryptSecret, looksEncrypted } from './crypto'

describe('crypto — AES-256-GCM secret encryption', () => {
  it('round-trips a plaintext secret', () => {
    const plain = 'sk-test-abc123.very-secret-token'
    const ct = encryptSecret(plain)
    expect(ct).toBeTruthy()
    expect(ct).not.toContain(plain)
    expect(decryptSecret(ct)).toBe(plain)
  })

  it('returns null for null / empty input', () => {
    expect(encryptSecret(null)).toBeNull()
    expect(encryptSecret(undefined)).toBeNull()
    expect(encryptSecret('')).toBeNull()
    expect(decryptSecret(null)).toBeNull()
    expect(decryptSecret(undefined)).toBeNull()
    expect(decryptSecret('')).toBeNull()
  })

  it('produces a different ciphertext each call (fresh IV)', () => {
    const a = encryptSecret('same-input')
    const b = encryptSecret('same-input')
    expect(a).not.toBe(b)
    expect(decryptSecret(a)).toBe('same-input')
    expect(decryptSecret(b)).toBe('same-input')
  })

  it('returns null on tampered ciphertext (GCM auth tag)', () => {
    const ct = encryptSecret('hello') ?? ''
    const parts = ct.split('.')
    // Flip one character in the middle part
    const tampered = [parts[0], parts[1].slice(0, -1) + (parts[1].endsWith('A') ? 'B' : 'A'), parts[2]].join('.')
    expect(decryptSecret(tampered)).toBeNull()
  })

  it('returns null on malformed input', () => {
    expect(decryptSecret('not-even-dots')).toBeNull()
    expect(decryptSecret('one.two')).toBeNull()
    expect(decryptSecret('a.b.c.d')).toBeNull()
  })

  it('looksEncrypted() distinguishes ciphertext from plaintext', () => {
    const ct = encryptSecret('my-token') ?? ''
    expect(looksEncrypted(ct)).toBe(true)
    expect(looksEncrypted('plain-old-api-key')).toBe(false)
    expect(looksEncrypted('AAA.BBB.CCC')).toBe(false) // wrong lengths
    expect(looksEncrypted(null)).toBe(false)
    expect(looksEncrypted('')).toBe(false)
  })
})
