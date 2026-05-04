import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchJson, FetchJsonError } from './fetch-json'

const ORIGINAL_FETCH = globalThis.fetch

function mockResponse(init: {
  ok: boolean
  status: number
  body?: unknown
  asText?: string
  bodyIsJson?: boolean
}): Response {
  const wantJson = init.bodyIsJson !== false
  return {
    ok: init.ok,
    status: init.status,
    json: async () => {
      if (!wantJson) throw new Error('not json')
      return init.body
    },
    text: async () => init.asText ?? JSON.stringify(init.body ?? ''),
  } as unknown as Response
}

describe('fetchJson', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('returns parsed JSON on 2xx', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: true, status: 200, body: { data: [1, 2, 3] } }),
    )
    const out = await fetchJson<{ data: number[] }>('/api/x')
    expect(out).toEqual({ data: [1, 2, 3] })
  })

  it('throws FetchJsonError on non-2xx with `error` field', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: false, status: 401, body: { error: 'Unauthorized' } }),
    )
    await expect(fetchJson('/api/x')).rejects.toBeInstanceOf(FetchJsonError)
    try {
      await fetchJson('/api/x')
    } catch (e) {
      const err = e as FetchJsonError
      expect(err.status).toBe(401)
      expect(err.message).toBe('Unauthorized')
      expect(err.body).toEqual({ error: 'Unauthorized' })
    }
  })

  it('falls back to `message` field when `error` absent', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: false, status: 500, body: { message: 'Boom' } }),
    )
    try {
      await fetchJson('/api/x')
    } catch (e) {
      expect((e as FetchJsonError).message).toBe('Boom')
    }
  })

  it('falls back to text body when response is not JSON', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: false, status: 502, asText: 'Bad Gateway', bodyIsJson: false }),
    )
    try {
      await fetchJson('/api/x')
    } catch (e) {
      expect((e as FetchJsonError).status).toBe(502)
      expect((e as FetchJsonError).message).toBe('Bad Gateway')
    }
  })

  it('falls back to status-only message when text body is empty', async () => {
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: false, status: 404, asText: '', bodyIsJson: false }),
    )
    try {
      await fetchJson('/api/x')
    } catch (e) {
      expect((e as FetchJsonError).message).toBe('Request failed (404)')
    }
  })

  it('truncates oversized text error bodies to 500 chars', async () => {
    const huge = 'X'.repeat(2000)
    ;(globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockResponse({ ok: false, status: 500, asText: huge, bodyIsJson: false }),
    )
    try {
      await fetchJson('/api/x')
    } catch (e) {
      expect((e as FetchJsonError).message.length).toBe(500)
    }
  })

  it('passes init through to fetch', async () => {
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>
    fetchMock.mockResolvedValue(mockResponse({ ok: true, status: 204, body: null }))
    await fetchJson('/api/x', { method: 'POST', body: 'hello' })
    expect(fetchMock).toHaveBeenCalledWith('/api/x', { method: 'POST', body: 'hello' })
  })
})
