import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendAlert, alertsEnabled } from './alerts'

describe('alerts', () => {
  const ORIGINAL_ENV = { ...process.env }

  beforeEach(() => {
    delete process.env.SLACK_ALERTS_WEBHOOK
    delete process.env.SENTRY_ENVIRONMENT
    delete process.env.SENTRY_RELEASE
    delete process.env.GIT_COMMIT_SHA
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  describe('alertsEnabled', () => {
    it('returns false when SLACK_ALERTS_WEBHOOK is unset', () => {
      expect(alertsEnabled()).toBe(false)
    })

    it('returns true when SLACK_ALERTS_WEBHOOK is set', () => {
      process.env.SLACK_ALERTS_WEBHOOK = 'https://hooks.slack.com/services/X/Y/Z'
      expect(alertsEnabled()).toBe(true)
    })
  })

  describe('sendAlert', () => {
    it('returns delivered=false when webhook is unset and never calls fetch', async () => {
      const fetchImpl = vi.fn()
      const result = await sendAlert({
        title: 'test',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      // With no env webhook AND no override, we don't even reach fetch.
      expect(result.delivered).toBe(false)
      expect(fetchImpl).not.toHaveBeenCalled()
    })

    it('posts to the webhook with the expected Slack-shaped payload', async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200 } as Response)
      const result = await sendAlert({
        title: 'audit-chain failure',
        body: 'rows=12 broken=3',
        severity: 'critical',
        source: 'audit-chain',
        fields: { orgs: 3, broken: 12 },
        webhookUrl: 'https://hooks.slack.com/services/X/Y/Z',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })

      expect(result).toEqual({ delivered: true })
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      const [url, init] = fetchImpl.mock.calls[0]
      expect(url).toBe('https://hooks.slack.com/services/X/Y/Z')
      expect(init.method).toBe('POST')
      const body = JSON.parse(init.body)
      expect(body.text).toContain('audit-chain failure')
      expect(body.text).toContain(':rotating_light:')
      expect(body.attachments).toHaveLength(1)
      expect(body.attachments[0].title).toBe('audit-chain failure')
      expect(body.attachments[0].text).toBe('rows=12 broken=3')
      // Fields are flattened into title/value/short triples.
      const fieldNames = body.attachments[0].fields.map((f: { title: string }) => f.title)
      expect(fieldNames).toContain('orgs')
      expect(fieldNames).toContain('broken')
      expect(fieldNames).toContain('source')
    })

    it('defaults severity to warning when omitted', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
      await sendAlert({
        title: 'soft drift',
        webhookUrl: 'https://hooks.slack.com/X',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
      expect(body.text).toContain(':warning:')
    })

    it('reports webhook errors via result.error without throwing', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response)
      const result = await sendAlert({
        title: 'x',
        webhookUrl: 'https://hooks.slack.com/X',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.delivered).toBe(true)
      expect(result.error).toBe('webhook returned 500')
    })

    it('reports network errors via result.error without throwing', async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new Error('boom'))
      const result = await sendAlert({
        title: 'x',
        webhookUrl: 'https://hooks.slack.com/X',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      expect(result.delivered).toBe(true)
      expect(result.error).toBe('boom')
    })

    it('drops empty/null/undefined fields from the Slack attachment', async () => {
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
      await sendAlert({
        title: 'x',
        fields: { keep: 'yes', drop1: '', drop2: null, drop3: undefined, num: 0 },
        webhookUrl: 'https://hooks.slack.com/X',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
      const titles = body.attachments[0].fields.map((f: { title: string }) => f.title)
      expect(titles).toContain('keep')
      expect(titles).toContain('num') // 0 is preserved
      expect(titles).not.toContain('drop1')
      expect(titles).not.toContain('drop2')
      expect(titles).not.toContain('drop3')
    })

    it('attaches env + release context automatically', async () => {
      process.env.SENTRY_ENVIRONMENT = 'production'
      process.env.SENTRY_RELEASE = 'abc123def456ghi'
      const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
      await sendAlert({
        title: 'x',
        webhookUrl: 'https://hooks.slack.com/X',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
      const fields = body.attachments[0].fields as Array<{ title: string; value: string }>
      const env = fields.find(f => f.title === 'env')
      const release = fields.find(f => f.title === 'release')
      expect(env?.value).toBe('production')
      // Release is truncated to 12 chars to keep the row "short".
      expect(release?.value).toBe('abc123def456')
    })
  })
})
