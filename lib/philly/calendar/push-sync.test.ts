import { describe, it, expect, afterEach } from 'vitest'
import { __internals, statusToErrorCode, pruneRetentionDays } from './push-sync'

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

describe('statusToErrorCode (lastError sanitisation, compliance F9)', () => {
  it('buckets 4xx as provider_4xx', () => {
    expect(statusToErrorCode(400)).toBe('provider_4xx')
    expect(statusToErrorCode(401)).toBe('provider_4xx')
    expect(statusToErrorCode(404)).toBe('provider_4xx')
    expect(statusToErrorCode(429)).toBe('provider_4xx')
    expect(statusToErrorCode(499)).toBe('provider_4xx')
  })

  it('buckets 5xx as provider_5xx', () => {
    expect(statusToErrorCode(500)).toBe('provider_5xx')
    expect(statusToErrorCode(502)).toBe('provider_5xx')
    expect(statusToErrorCode(503)).toBe('provider_5xx')
    expect(statusToErrorCode(599)).toBe('provider_5xx')
  })

  it('falls back to provider_unexpected_status outside the 4xx-5xx range', () => {
    expect(statusToErrorCode(200)).toBe('provider_unexpected_status')
    expect(statusToErrorCode(302)).toBe('provider_unexpected_status')
    expect(statusToErrorCode(0)).toBe('provider_unexpected_status')
    expect(statusToErrorCode(600)).toBe('provider_unexpected_status')
  })

  it('only emits the controlled enum bucket — never raw provider text', () => {
    // Property test: every status maps to one of a fixed set, with no
    // user-supplied content leaking through.
    const allowed = new Set([
      'provider_4xx',
      'provider_5xx',
      'provider_unexpected_status',
    ])
    for (const s of [100, 200, 301, 400, 418, 499, 500, 504, 599, 700]) {
      expect(allowed.has(statusToErrorCode(s))).toBe(true)
    }
  })
})

describe('pruneRetentionDays (Art. 5(1)(e) storage-limitation)', () => {
  const ORIGINAL_ENV = process.env.CALENDAR_CHANNEL_PRUNE_DAYS

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.CALENDAR_CHANNEL_PRUNE_DAYS
    else process.env.CALENDAR_CHANNEL_PRUNE_DAYS = ORIGINAL_ENV
  })

  it('defaults to 90 days when no override is provided', () => {
    delete process.env.CALENDAR_CHANNEL_PRUNE_DAYS
    expect(pruneRetentionDays()).toBe(90)
  })

  it('honours an env-var override', () => {
    process.env.CALENDAR_CHANNEL_PRUNE_DAYS = '180'
    expect(pruneRetentionDays()).toBe(180)
  })

  it('honours an explicit request value over the env var', () => {
    process.env.CALENDAR_CHANNEL_PRUNE_DAYS = '180'
    expect(pruneRetentionDays(120)).toBe(120)
  })

  it('floors below the minimum 30-day retention', () => {
    expect(pruneRetentionDays(7)).toBe(30)
    expect(pruneRetentionDays(0)).toBe(30)
    expect(pruneRetentionDays(-100)).toBe(30)
  })

  it('floors a non-numeric env-var override back to default', () => {
    process.env.CALENDAR_CHANNEL_PRUNE_DAYS = 'abc'
    expect(pruneRetentionDays()).toBe(90)
  })

  it('floors fractional days', () => {
    expect(pruneRetentionDays(60.9)).toBe(60)
  })
})

describe('PRUNABLE_STATUSES (defensive list)', () => {
  it('never includes "active" — live channels must not be pruned', () => {
    const { PRUNABLE_STATUSES } = __internals
    expect(PRUNABLE_STATUSES).not.toContain('active')
  })

  it('covers expired and error rows', () => {
    const { PRUNABLE_STATUSES } = __internals
    expect(PRUNABLE_STATUSES).toContain('expired')
    expect(PRUNABLE_STATUSES).toContain('error')
  })
})

describe('AUTH_SECRET shape (clientState pre-DB filter, audit F4b)', () => {
  it('a real generated secret is 43 chars of base64url', () => {
    const secret = generateAuthSecret()
    expect(secret.length).toBe(43)
    expect(/^[A-Za-z0-9_-]{43}$/.test(secret)).toBe(true)
  })

  it('rejects shapes that cannot match any real secret', () => {
    const re = /^[A-Za-z0-9_-]{43}$/
    expect(re.test('')).toBe(false)
    expect(re.test('short')).toBe(false)
    expect(re.test('A'.repeat(42))).toBe(false)
    expect(re.test('A'.repeat(44))).toBe(false)
    // 43 chars but contains an out-of-charset symbol
    expect(re.test('A'.repeat(42) + '!')).toBe(false)
    // 43 chars but contains '+' / '/' (standard base64, not base64url)
    expect(re.test('A'.repeat(42) + '+')).toBe(false)
    expect(re.test('A'.repeat(42) + '/')).toBe(false)
  })
})
