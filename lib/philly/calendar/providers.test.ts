import { describe, it, expect, beforeEach } from 'vitest'
import {
  PROVIDER_KEYS,
  providerConfig,
  isProviderConfigured,
  getRedirectUri,
  PROVIDER_LABELS,
} from './providers'

const ORIGINAL_ENV = { ...process.env }
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  delete process.env.GOOGLE_OAUTH_CLIENT_ID
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET
  delete process.env.MS_OAUTH_CLIENT_ID
  delete process.env.MS_OAUTH_CLIENT_SECRET
  delete process.env.MS_OAUTH_TENANT
})

describe('providerConfig', () => {
  it('exposes Google as a closed-form config', () => {
    const cfg = providerConfig('google')
    expect(cfg.key).toBe('google')
    expect(cfg.authUrl).toMatch(/^https:\/\/accounts\.google\.com\//)
    expect(cfg.tokenUrl).toMatch(/^https:\/\/oauth2\.googleapis\.com\//)
    expect(cfg.scopes).toContain('https://www.googleapis.com/auth/calendar.readonly')
    expect(cfg.envClientId).toBe('GOOGLE_OAUTH_CLIENT_ID')
  })

  it('uses the Microsoft tenant from MS_OAUTH_TENANT when set', () => {
    process.env.MS_OAUTH_TENANT = 'contoso.onmicrosoft.com'
    const cfg = providerConfig('microsoft')
    expect(cfg.authUrl).toContain('contoso.onmicrosoft.com')
    expect(cfg.tokenUrl).toContain('contoso.onmicrosoft.com')
  })

  it('defaults to the "common" Microsoft tenant when MS_OAUTH_TENANT is unset', () => {
    const cfg = providerConfig('microsoft')
    expect(cfg.authUrl).toContain('/common/')
  })

  it('always requests offline_access from Microsoft (refresh tokens)', () => {
    const cfg = providerConfig('microsoft')
    expect(cfg.scopes).toContain('offline_access')
  })
})

describe('isProviderConfigured', () => {
  it('returns true when both client id + secret env vars are set', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'id'
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'secret'
    expect(isProviderConfigured('google')).toBe(true)
  })

  it('returns false when secret is missing', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'id'
    expect(isProviderConfigured('google')).toBe(false)
  })

  it('returns false when client id is missing', () => {
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'secret'
    expect(isProviderConfigured('google')).toBe(false)
  })

  it('returns false when both are missing', () => {
    expect(isProviderConfigured('google')).toBe(false)
    expect(isProviderConfigured('microsoft')).toBe(false)
  })
})

describe('getRedirectUri', () => {
  it('uses NEXT_PUBLIC_APP_URL when set, trimming a trailing slash', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/'
    expect(getRedirectUri()).toBe(
      'https://app.example.com/philly/api/calendar/oauth/callback',
    )
  })

  it('falls back to NEXT_PUBLIC_SITE_URL when NEXT_PUBLIC_APP_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.example.com'
    expect(getRedirectUri()).toBe(
      'https://site.example.com/philly/api/calendar/oauth/callback',
    )
  })

  it('returns localhost in dev when no env var is set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
    // NODE_ENV is read-only in Node typings; the test runs under
    // NODE_ENV=test so the dev branch (which throws in production) is
    // exercised either way. We just assert the localhost fallback.
    expect(getRedirectUri()).toContain('localhost:3000')
  })
})

describe('PROVIDER_KEYS / PROVIDER_LABELS', () => {
  it('has labels for every provider key', () => {
    for (const key of PROVIDER_KEYS) {
      expect(PROVIDER_LABELS[key]).toBeTruthy()
    }
  })
})
