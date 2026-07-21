import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getPublishableKey,
  getSecretKey,
  getSupabaseUrl,
  isUsingLegacyKeys,
} from './keys'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  delete process.env.SUPABASE_SECRET_KEY
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('getPublishableKey', () => {
  it('prefers the new publishable key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_new'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy.jwt.key'
    expect(getPublishableKey()).toBe('sb_publishable_new')
  })

  it('falls back to the legacy anon key so migration is not a flag day', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy.jwt.key'
    expect(getPublishableKey()).toBe('legacy.jwt.key')
  })

  it('ignores an empty new key rather than shipping a blank credential', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ''
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy.jwt.key'
    expect(getPublishableKey()).toBe('legacy.jwt.key')
  })

  it('throws a message naming both accepted variables', () => {
    expect(() => getPublishableKey()).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.*NEXT_PUBLIC_SUPABASE_ANON_KEY/s,
    )
  })
})

describe('getSecretKey', () => {
  it('prefers the new secret key', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_new'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy.service.jwt'
    expect(getSecretKey()).toBe('sb_secret_new')
  })

  it('falls back to the legacy service-role key', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy.service.jwt'
    expect(getSecretKey()).toBe('legacy.service.jwt')
  })

  it('throws a message naming both accepted variables', () => {
    expect(() => getSecretKey()).toThrow(
      /SUPABASE_SECRET_KEY.*SUPABASE_SERVICE_ROLE_KEY/s,
    )
  })
})

describe('getSupabaseUrl', () => {
  it('returns the configured url', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    expect(getSupabaseUrl()).toBe('https://example.supabase.co')
  })

  it('throws when unset', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => getSupabaseUrl()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})

describe('isUsingLegacyKeys', () => {
  it('is true on a deployment still using only the anon key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy.jwt.key'
    expect(isUsingLegacyKeys()).toBe(true)
  })

  it('is false once the publishable key is set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_new'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy.jwt.key'
    expect(isUsingLegacyKeys()).toBe(false)
  })

  it('is false when neither is set', () => {
    expect(isUsingLegacyKeys()).toBe(false)
  })
})
