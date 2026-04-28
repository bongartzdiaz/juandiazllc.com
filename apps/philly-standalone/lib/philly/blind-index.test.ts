import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  hashEmail,
  hashPhone,
  normaliseEmail,
  normalisePhone,
  looksLikeEmailQuery,
  looksLikePhoneQuery,
  __resetBlindIndexForTests,
} from './blind-index'

beforeAll(() => {
  if (!process.env.BLIND_INDEX_SECRET) {
    process.env.BLIND_INDEX_SECRET = 'blind-index-test-key-32-bytes-of-entropy-plenty'
  }
})

beforeEach(() => {
  __resetBlindIndexForTests()
})

describe('normaliseEmail', () => {
  it('lowercases + trims', () => {
    expect(normaliseEmail('  Foo@Example.COM  ')).toBe('foo@example.com')
  })
  it('strips +tag aliasing', () => {
    expect(normaliseEmail('user+receipts@example.com')).toBe('user@example.com')
    expect(normaliseEmail('user+a+b+c@example.com')).toBe('user@example.com')
  })
  it('drops dots in Gmail local-part', () => {
    expect(normaliseEmail('Foo.Bar@gmail.com')).toBe('foobar@gmail.com')
    expect(normaliseEmail('f.o.o.b.a.r@googlemail.com')).toBe('foobar@googlemail.com')
  })
  it('does NOT drop dots for non-Gmail domains', () => {
    expect(normaliseEmail('foo.bar@example.com')).toBe('foo.bar@example.com')
  })
  it('rejects malformed input', () => {
    expect(normaliseEmail(null)).toBeNull()
    expect(normaliseEmail('')).toBeNull()
    expect(normaliseEmail('not-an-email')).toBeNull()
    expect(normaliseEmail('@nodomain.com')).toBeNull()
    expect(normaliseEmail('localpart@')).toBeNull()
    expect(normaliseEmail('user@no-tld')).toBeNull()
    expect(normaliseEmail('+tagonly@example.com')).toBeNull()
  })
})

describe('normalisePhone', () => {
  it('keeps a leading +', () => {
    expect(normalisePhone('+31 6 1234 5678')).toBe('+31612345678')
  })
  it('strips non-digit characters', () => {
    expect(normalisePhone('(415) 555-0100')).toBe('4155550100')
    expect(normalisePhone('555.0100.5555')).toBe('55501005555')
  })
  it('rejects too-short numbers', () => {
    expect(normalisePhone('123')).toBeNull()
    expect(normalisePhone('abc')).toBeNull()
    expect(normalisePhone(null)).toBeNull()
    expect(normalisePhone('')).toBeNull()
  })
})

describe('hashEmail', () => {
  it('produces the same hash for equivalent emails (Gmail)', () => {
    const a = hashEmail('Foo.Bar@gmail.com')
    const b = hashEmail('foobar@gmail.com')
    const c = hashEmail('foobar+receipts@gmail.com')
    expect(a).toBe(b)
    expect(a).toBe(c)
    expect(a).toMatch(/^[0-9a-f]{64}$/) // SHA-256 hex
  })

  it('produces different hashes for different emails', () => {
    expect(hashEmail('a@example.com')).not.toBe(hashEmail('b@example.com'))
  })

  it('returns null on bad input', () => {
    expect(hashEmail(null)).toBeNull()
    expect(hashEmail('')).toBeNull()
    expect(hashEmail('not-an-email')).toBeNull()
  })

  it('returns null when BLIND_INDEX_SECRET is not configured', () => {
    const saved = process.env.BLIND_INDEX_SECRET
    delete process.env.BLIND_INDEX_SECRET
    __resetBlindIndexForTests()
    try {
      expect(hashEmail('user@example.com')).toBeNull()
    } finally {
      if (saved !== undefined) process.env.BLIND_INDEX_SECRET = saved
      __resetBlindIndexForTests()
    }
  })

  it('email and phone use different domain prefixes (cannot collide)', () => {
    // Even if someone passes "5551234567" as an email it won't normalise
    // (no @), but as a phone it does. Just confirm the prefixes work
    // by ensuring the same string prefixed differently produces
    // different hashes — covered structurally by the hmac() input.
    const e = hashEmail('foo@example.com')
    const p = hashPhone('+31612345678')
    expect(e).not.toBe(p)
  })
})

describe('hashPhone', () => {
  it('produces the same hash for differently-formatted same number', () => {
    const a = hashPhone('+31 6 1234 5678')
    const b = hashPhone('+31-6-1234-5678')
    const c = hashPhone('+31612345678')
    expect(a).toBe(b)
    expect(a).toBe(c)
  })

  it('treats with-+ and without-+ as different (different country contexts)', () => {
    expect(hashPhone('+15551234567')).not.toBe(hashPhone('15551234567'))
  })
})

describe('looksLikeEmailQuery / looksLikePhoneQuery', () => {
  it('classifies email-shaped queries', () => {
    expect(looksLikeEmailQuery('user@example.com')).toBe(true)
    expect(looksLikeEmailQuery('user@host')).toBe(false) // no TLD dot
    expect(looksLikeEmailQuery('Jane Doe')).toBe(false)
  })
  it('classifies phone-shaped queries', () => {
    expect(looksLikePhoneQuery('(415) 555-0100')).toBe(true)
    expect(looksLikePhoneQuery('+31 6 1234 5678')).toBe(true)
    expect(looksLikePhoneQuery('Jane Doe')).toBe(false)
    expect(looksLikePhoneQuery('123')).toBe(false) // too short
  })
})
