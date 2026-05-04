import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'

describe('logger — secret redaction', () => {
  const originalEnv = process.env.NODE_ENV
  const originalLevel = process.env.LOG_LEVEL
  let outSpy: MockInstance
  let errSpy: MockInstance

  beforeEach(() => {
    // Force prod mode so the logger emits JSON (easier to assert on)
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    process.env.LOG_LEVEL = 'debug'
    outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = originalEnv
    process.env.LOG_LEVEL = originalLevel
    vi.restoreAllMocks()
  })

  async function freshLogger() {
    // Re-import so level pickup runs under the stubbed env
    vi.resetModules()
    const mod = await import('./logger')
    return mod.logger
  }

  function lastLine(): string {
    // Check both streams; logger routes info→stdout, warn/error→stderr
    const allCalls = [...outSpy.mock.calls, ...errSpy.mock.calls]
    const last = allCalls[allCalls.length - 1]?.[0]
    return typeof last === 'string' ? last : String(last)
  }

  it('redacts password / token / apiKey keys', async () => {
    const logger = await freshLogger()
    logger.info('test', {
      email: 'a@b.com',
      password: 'hunter2',
      token: 'sk-xyz',
      apiKey: 'ak_live_123',
      nested: { accessToken: 'abc', refresh_token: 'def' },
    })
    const line = lastLine()
    expect(line).toContain('a@b.com')
    expect(line).not.toContain('hunter2')
    expect(line).not.toContain('sk-xyz')
    expect(line).not.toContain('ak_live_123')
    expect(line).not.toContain('abc')
    expect(line).not.toContain('def')
    expect(line).toContain('[redacted]')
  })

  it('redacts Authorization / Cookie headers case-insensitively', async () => {
    const logger = await freshLogger()
    logger.warn('req', {
      headers: { Authorization: 'Bearer topsecret', Cookie: 'session=abc123' },
    })
    const line = lastLine()
    expect(line).not.toContain('topsecret')
    expect(line).not.toContain('session=abc123')
  })

  it('redacts JWT-shaped strings anywhere in the payload', async () => {
    const logger = await freshLogger()
    // Header must be ey + 20+ chars before the first dot to match the logger's pattern
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abcdefghijklmnopqrstuvwxyz.signature'
    logger.info('jwt seen', { stray: jwt })
    const line = lastLine()
    expect(line).not.toContain('abcdefghijklmnopqrstuvwxyz')
    expect(line).toContain('[redacted-jwt]')
  })

  it('suppresses logs below the configured level', async () => {
    process.env.LOG_LEVEL = 'warn'
    const logger = await freshLogger()
    logger.debug('should not appear')
    logger.info('also suppressed')
    expect(outSpy).not.toHaveBeenCalled()
    expect(errSpy).not.toHaveBeenCalled()
    logger.warn('this one shows')
    expect(errSpy).toHaveBeenCalled()
  })
})
