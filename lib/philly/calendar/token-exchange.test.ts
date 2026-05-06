import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { exchangeCodeForTokens } from './token-exchange'

const ORIGINAL_ENV = { ...process.env }
const ORIGINAL_FETCH = globalThis.fetch

beforeEach(() => {
  process.env = {
    ...ORIGINAL_ENV,
    GOOGLE_OAUTH_CLIENT_ID: 'google-id',
    GOOGLE_OAUTH_CLIENT_SECRET: 'google-secret',
    MS_OAUTH_CLIENT_ID: 'ms-id',
    MS_OAUTH_CLIENT_SECRET: 'ms-secret',
    NEXT_PUBLIC_APP_URL: 'https://app.example.com',
  }
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  vi.restoreAllMocks()
})

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; json?: unknown; text?: string }>) {
  let i = 0
  globalThis.fetch = vi.fn(async () => {
    const r = responses[i++] ?? responses[responses.length - 1]
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      async json() { return r.json },
      async text() { return r.text ?? '' },
    } as Response
  })
}

describe('exchangeCodeForTokens — Google', () => {
  it('returns normalized tokens + profile on happy path', async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          access_token: 'at_google',
          refresh_token: 'rt_google',
          expires_in: 3600,
          scope: 'openid email https://www.googleapis.com/auth/calendar.readonly',
        },
      },
      {
        ok: true,
        json: {
          sub: 'google-sub-123',
          email: 'user@example.com',
        },
      },
    ])
    const result = await exchangeCodeForTokens('google', 'auth-code-xyz')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.accessToken).toBe('at_google')
      expect(result.refreshToken).toBe('rt_google')
      expect(result.providerAccountId).toBe('google-sub-123')
      expect(result.providerEmail).toBe('user@example.com')
      expect(result.expiresAt).toBeInstanceOf(Date)
      expect(result.scopes).toContain('https://www.googleapis.com/auth/calendar.readonly')
    }
  })

  it('returns provider_not_configured when env vars are missing', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID
    const result = await exchangeCodeForTokens('google', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('provider_not_configured')
  })

  it('returns token_request_failed on non-2xx token response', async () => {
    mockFetchSequence([{ ok: false, status: 400, text: 'invalid_grant' }])
    const result = await exchangeCodeForTokens('google', 'bad-code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('token_request_failed')
  })

  it('returns token_response_invalid when access_token is missing', async () => {
    mockFetchSequence([{ ok: true, json: { foo: 'bar' } }])
    const result = await exchangeCodeForTokens('google', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('token_response_invalid')
  })

  it('returns profile_request_failed on non-2xx profile response', async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: 'at', expires_in: 60 } },
      { ok: false, status: 401, text: 'unauthorized' },
    ])
    const result = await exchangeCodeForTokens('google', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('profile_request_failed')
  })

  it('returns profile_response_invalid when profile lacks identity', async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: 'at', expires_in: 60 } },
      { ok: true, json: { /* no sub, no email */ } },
    ])
    const result = await exchangeCodeForTokens('google', 'code')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('profile_response_invalid')
  })

  it('handles missing expires_in by setting expiresAt to null', async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: 'at', /* no expires_in */ } },
      { ok: true, json: { sub: 'x', email: 'a@b.c' } },
    ])
    const result = await exchangeCodeForTokens('google', 'code')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.expiresAt).toBeNull()
  })
})

describe('exchangeCodeForTokens — Microsoft', () => {
  it('extracts identity from id + userPrincipalName', async () => {
    mockFetchSequence([
      {
        ok: true,
        json: {
          access_token: 'at_ms',
          refresh_token: 'rt_ms',
          expires_in: 3600,
          scope: 'User.Read Calendars.Read offline_access',
        },
      },
      {
        ok: true,
        json: {
          id: 'ms-id-456',
          userPrincipalName: 'user@contoso.onmicrosoft.com',
          mail: 'user@contoso.com',
        },
      },
    ])
    const result = await exchangeCodeForTokens('microsoft', 'code')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.providerAccountId).toBe('ms-id-456')
      // mail wins over userPrincipalName when present.
      expect(result.providerEmail).toBe('user@contoso.com')
      expect(result.refreshToken).toBe('rt_ms')
    }
  })

  it('falls back to userPrincipalName when mail is null', async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: 'at', expires_in: 3600 } },
      { ok: true, json: { id: 'ms-id', userPrincipalName: 'guest@tenant.onmicrosoft.com' } },
    ])
    const result = await exchangeCodeForTokens('microsoft', 'code')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.providerEmail).toBe('guest@tenant.onmicrosoft.com')
  })
})
