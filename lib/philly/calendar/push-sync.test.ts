import { describe, it, expect } from 'vitest'
import { __internals } from './push-sync'

const {
  GOOGLE_CHANNEL_TTL_MS,
  MS_SUBSCRIPTION_TTL_MS,
  RENEWAL_BUFFER_MS,
  GOOGLE_WATCH_URL,
  GOOGLE_STOP_URL,
  MS_SUBSCRIPTIONS_URL,
  MS_CALENDAR_RESOURCE,
  buildWebhookUrl,
  generateAuthSecret,
} = __internals

describe('TTL constants', () => {
  it('Google channel TTL is below the documented 7-day cap with a 1-day buffer', () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(GOOGLE_CHANNEL_TTL_MS).toBeLessThan(sevenDaysMs)
    // 6 days exactly — leaves a full day for renewal-cron retries.
    expect(GOOGLE_CHANNEL_TTL_MS).toBe(6 * 24 * 60 * 60 * 1000)
  })

  it('MS Graph subscription TTL is below the 4230-minute documented cap', () => {
    const cap = 4230 * 60 * 1000
    expect(MS_SUBSCRIPTION_TTL_MS).toBeLessThan(cap)
    // 4200 minutes — 30 minutes under the cap, matches the doc rationale.
    expect(MS_SUBSCRIPTION_TTL_MS).toBe(4200 * 60 * 1000)
  })

  it('renewal buffer is well ahead of MS expiry (~70h TTL)', () => {
    // Buffer must trigger renewal before MS hits its cap. 12h buffer + 70h TTL
    // means we renew at ~58 hours of life, comfortably within the cap.
    expect(RENEWAL_BUFFER_MS).toBeGreaterThan(60 * 60 * 1000) // > 1 hour
    expect(RENEWAL_BUFFER_MS).toBeLessThan(MS_SUBSCRIPTION_TTL_MS)
  })
})

describe('Provider URLs', () => {
  it('Google watch URL targets primary calendar', () => {
    expect(GOOGLE_WATCH_URL).toContain('/calendars/primary/events/watch')
  })

  it('Google stop URL is the channels endpoint', () => {
    expect(GOOGLE_STOP_URL).toBe('https://www.googleapis.com/calendar/v3/channels/stop')
  })

  it('MS subscriptions URL is the v1.0 endpoint', () => {
    expect(MS_SUBSCRIPTIONS_URL).toBe('https://graph.microsoft.com/v1.0/subscriptions')
  })

  it('MS calendar resource path is "me/events"', () => {
    expect(MS_CALENDAR_RESOURCE).toBe('me/events')
  })
})

describe('buildWebhookUrl', () => {
  it('appends /philly/api/calendar/webhook/{provider}', () => {
    expect(buildWebhookUrl('https://app.example.com', 'google')).toBe(
      'https://app.example.com/philly/api/calendar/webhook/google',
    )
    expect(buildWebhookUrl('https://app.example.com', 'microsoft')).toBe(
      'https://app.example.com/philly/api/calendar/webhook/microsoft',
    )
  })

  it('strips a trailing slash from the base URL to avoid double-slashing', () => {
    expect(buildWebhookUrl('https://app.example.com/', 'google')).toBe(
      'https://app.example.com/philly/api/calendar/webhook/google',
    )
  })
})

describe('generateAuthSecret', () => {
  it('returns base64url-encoded 32-byte randomness (43 chars)', () => {
    const secret = generateAuthSecret()
    // 32 bytes = 256 bits → 43 base64url characters (no padding)
    expect(secret).toHaveLength(43)
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces unique values on each call', () => {
    const secrets = new Set<string>()
    for (let i = 0; i < 100; i++) secrets.add(generateAuthSecret())
    expect(secrets.size).toBe(100)
  })

  it('fits within Microsoft clientState 128-character limit', () => {
    const secret = generateAuthSecret()
    expect(secret.length).toBeLessThanOrEqual(128)
  })

  it('fits within Google channel token 256-character limit', () => {
    const secret = generateAuthSecret()
    expect(secret.length).toBeLessThanOrEqual(256)
  })
})
