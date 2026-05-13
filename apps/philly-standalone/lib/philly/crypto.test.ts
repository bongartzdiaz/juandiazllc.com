import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  encryptSecret,
  decryptSecret,
  decryptSecretDetailed,
  looksEncrypted,
  configuredKeyCount,
  __resetCryptoKeysForTests,
} from './crypto'

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
    // Bundle DE — flip a middle character of the ciphertext part.
    // The previous version flipped the LAST char which, for short
    // plaintexts where base64url's tail encodes only padding bits,
    // could leave the decoded bytes unchanged ~3% of runs (A↔B in
    // the padding-bit positions). Flipping a middle char always
    // changes real data bits, so GCM's auth tag detects it deterministically.
    const middle = Math.floor(parts[1].length / 2)
    const flipped = parts[1][middle] === 'A' ? 'B' : 'A'
    const tampered = [
      parts[0],
      parts[1].slice(0, middle) + flipped + parts[1].slice(middle + 1),
      parts[2],
    ].join('.')
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

describe('crypto — online key rotation (Bundle Q)', () => {
  // Each test sets a fresh key list. Restore env after each test so
  // we don't bleed into other suites.
  const SAVED = {
    INTEGRATION_SECRET: process.env.INTEGRATION_SECRET,
    INTEGRATION_SECRET_V2: process.env.INTEGRATION_SECRET_V2,
    INTEGRATION_SECRET_V3: process.env.INTEGRATION_SECRET_V3,
  }

  function setKeys(keys: { primary?: string; v2?: string; v3?: string }) {
    if (keys.primary !== undefined) process.env.INTEGRATION_SECRET = keys.primary
    else delete process.env.INTEGRATION_SECRET
    if (keys.v2 !== undefined) process.env.INTEGRATION_SECRET_V2 = keys.v2
    else delete process.env.INTEGRATION_SECRET_V2
    if (keys.v3 !== undefined) process.env.INTEGRATION_SECRET_V3 = keys.v3
    else delete process.env.INTEGRATION_SECRET_V3
    __resetCryptoKeysForTests()
  }

  beforeEach(() => {
    setKeys({ primary: 'rotation-test-primary-key-32-bytes-of-entropy' })
  })

  afterEach(() => {
    process.env.INTEGRATION_SECRET = SAVED.INTEGRATION_SECRET
    if (SAVED.INTEGRATION_SECRET_V2 === undefined) delete process.env.INTEGRATION_SECRET_V2
    else process.env.INTEGRATION_SECRET_V2 = SAVED.INTEGRATION_SECRET_V2
    if (SAVED.INTEGRATION_SECRET_V3 === undefined) delete process.env.INTEGRATION_SECRET_V3
    else process.env.INTEGRATION_SECRET_V3 = SAVED.INTEGRATION_SECRET_V3
    __resetCryptoKeysForTests()
  })

  it('configuredKeyCount reports the number of active keys', () => {
    setKeys({ primary: 'a', v2: 'b' })
    expect(configuredKeyCount()).toBe(2)
    setKeys({ primary: 'a', v2: 'b', v3: 'c' })
    expect(configuredKeyCount()).toBe(3)
  })

  it('encrypts under the primary key and identifies it as keyIndex 0 on read', () => {
    setKeys({ primary: 'PRIMARY-key', v2: 'OLD-key' })
    const ct = encryptSecret('hello world')
    const result = decryptSecretDetailed(ct)
    expect(result.plaintext).toBe('hello world')
    expect(result.keyIndex).toBe(0)
  })

  it('decrypts a row encrypted under the V2 key (rotation in progress)', () => {
    // Phase A: only the OLD key is set. Encrypt some data.
    setKeys({ primary: 'OLD-key' })
    const ctUnderOld = encryptSecret('legacy row content')
    expect(ctUnderOld).toBeTruthy()

    // Phase B: rotate — NEW becomes primary, OLD demoted to V2.
    setKeys({ primary: 'NEW-key', v2: 'OLD-key' })

    // The legacy row still decrypts (auth tag matches under V2).
    const result = decryptSecretDetailed(ctUnderOld)
    expect(result.plaintext).toBe('legacy row content')
    expect(result.keyIndex).toBe(1) // identified as a V2-encrypted row

    // New writes use the NEW key.
    const ctUnderNew = encryptSecret('post-rotation row')
    const newResult = decryptSecretDetailed(ctUnderNew)
    expect(newResult.plaintext).toBe('post-rotation row')
    expect(newResult.keyIndex).toBe(0)
  })

  it('returns null + keyIndex -1 when no configured key works', () => {
    // Encrypt under a key that is then unconfigured.
    setKeys({ primary: 'temp-key' })
    const ct = encryptSecret('payload')
    expect(ct).toBeTruthy()

    // Replace the key list with something completely different.
    setKeys({ primary: 'unrelated-key', v2: 'another-unrelated' })
    const result = decryptSecretDetailed(ct)
    expect(result.plaintext).toBeNull()
    expect(result.keyIndex).toBe(-1)
    expect(decryptSecret(ct)).toBeNull()
  })

  it('falls through three keys to find the matching one', () => {
    // Encrypt under the OLDEST key, then move it to slot V3.
    setKeys({ primary: 'k-old' })
    const ct = encryptSecret('three-key-rotation')
    setKeys({ primary: 'k-new', v2: 'k-mid', v3: 'k-old' })
    const result = decryptSecretDetailed(ct)
    expect(result.plaintext).toBe('three-key-rotation')
    expect(result.keyIndex).toBe(2)
  })
})

