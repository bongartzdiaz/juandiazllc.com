import { describe, it, expect, vi } from 'vitest'
import {
  shouldRefresh,
  refreshGoogleAccessToken,
  expiryFromSeconds,
  GoogleRefreshError,
  REFRESH_SKEW_MS,
} from './google-oauth'

describe('shouldRefresh', () => {
  const NOW = new Date('2026-04-20T12:00:00Z').getTime()

  it('returns true when expiry is null or undefined', () => {
    expect(shouldRefresh(null, NOW)).toBe(true)
    expect(shouldRefresh(undefined, NOW)).toBe(true)
  })

  it('returns true when expiry is inside the skew window', () => {
    const insideSkew = new Date(NOW + REFRESH_SKEW_MS - 1_000)
    expect(shouldRefresh(insideSkew, NOW)).toBe(true)
  })

  it('returns false when expiry is safely in the future', () => {
    const safe = new Date(NOW + REFRESH_SKEW_MS + 60_000)
    expect(shouldRefresh(safe, NOW)).toBe(false)
  })

  it('returns true for already-past expiries', () => {
    const past = new Date(NOW - 5 * 60_000)
    expect(shouldRefresh(past, NOW)).toBe(true)
  })
})

describe('expiryFromSeconds', () => {
  it('converts seconds to a future Date', () => {
    const NOW = new Date('2026-04-20T12:00:00Z').getTime()
    expect(expiryFromSeconds(3600, NOW).toISOString()).toBe('2026-04-20T13:00:00.000Z')
  })
})

describe('refreshGoogleAccessToken', () => {
  function fetchOk(body: Record<string, unknown>): typeof fetch {
    return vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch
  }

  it('returns parsed token on 200', async () => {
    const fetchImpl = fetchOk({
      access_token: 'new-access',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
      token_type: 'Bearer',
    })
    const result = await refreshGoogleAccessToken('refresh-xyz', {
      clientId: 'cid',
      clientSecret: 'csec',
      fetchImpl,
    })
    expect(result.accessToken).toBe('new-access')
    expect(result.expiresIn).toBe(3600)
    expect(result.scope).toContain('gmail.readonly')
    expect(result.refreshToken).toBeNull()
  })

  it('propagates a new refresh token when Google rotates', async () => {
    const fetchImpl = fetchOk({
      access_token: 'new-access',
      expires_in: 3600,
      refresh_token: 'new-refresh',
    })
    const result = await refreshGoogleAccessToken('old-refresh', {
      clientId: 'cid',
      clientSecret: 'csec',
      fetchImpl,
    })
    expect(result.refreshToken).toBe('new-refresh')
  })

  it('throws GoogleRefreshError on non-200', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      }),
    ) as unknown as typeof fetch

    await expect(
      refreshGoogleAccessToken('bad-refresh', {
        clientId: 'cid',
        clientSecret: 'csec',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(GoogleRefreshError)
  })

  it('throws when clientId/clientSecret missing', async () => {
    await expect(
      refreshGoogleAccessToken('r', { clientId: '', clientSecret: '' }),
    ).rejects.toBeInstanceOf(GoogleRefreshError)
  })

  it('throws when refreshToken is empty', async () => {
    await expect(
      refreshGoogleAccessToken('', { clientId: 'x', clientSecret: 'y' }),
    ).rejects.toBeInstanceOf(GoogleRefreshError)
  })

  it('throws when response missing access_token', async () => {
    const fetchImpl = fetchOk({ expires_in: 3600 })
    await expect(
      refreshGoogleAccessToken('r', {
        clientId: 'cid',
        clientSecret: 'csec',
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(GoogleRefreshError)
  })
})
