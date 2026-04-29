import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { serverError, clientError } from './safe-error'

describe('clientError', () => {
  it('returns a 400 JSON body with the supplied message', async () => {
    const res = clientError('email is required')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'email is required' })
  })

  it('honours a custom status', async () => {
    const res = clientError('not found', 404)
    expect(res.status).toBe(404)
  })
})

describe('serverError', () => {
  const realConsoleError = console.error
  let errorMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    errorMock = vi.fn()
    console.error = errorMock
  })
  afterEach(() => {
    console.error = realConsoleError
  })

  it('returns a generic message + correlation id, never the raw error', async () => {
    const res = serverError(new Error('CONNECTION_REFUSED 127.0.0.1:5432'), 'Failed to load contacts')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load contacts')
    expect(body.errorId).toMatch(/^[0-9a-f]{12}$/)
    expect(body.error).not.toContain('CONNECTION_REFUSED')
  })

  it('logs the full error server-side with the correlation id prefix', () => {
    const e = new Error('boom')
    serverError(e)
    expect(errorMock).toHaveBeenCalledOnce()
    const [tag, logged] = errorMock.mock.calls[0]
    expect(tag).toMatch(/^\[server-error [0-9a-f]{12}\]$/)
    expect(logged).toBe(e)
  })

  it('defaults to "Internal server error" when no public message provided', async () => {
    const res = serverError(new Error('x'))
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
  })

  it('honours a custom status code', () => {
    const res = serverError(new Error('x'), 'gone', 410)
    expect(res.status).toBe(410)
  })

  it('generates a fresh errorId per call', async () => {
    const res1 = serverError(new Error('x'))
    const res2 = serverError(new Error('y'))
    const id1 = (await res1.json()).errorId
    const id2 = (await res2.json()).errorId
    expect(id1).not.toBe(id2)
  })
})
