import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cosineSimilarity, embed, listModels } from './ollama'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('returns -1 for opposite-direction vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6)
  })

  it('returns 0 for zero-length input', () => {
    expect(cosineSimilarity([], [])).toBe(0)
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for length-mismatched vectors', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('is order-invariant', () => {
    expect(cosineSimilarity([1, 2, 3], [4, 5, 6])).toBeCloseTo(
      cosineSimilarity([4, 5, 6], [1, 2, 3]),
      6,
    )
  })
})

describe('bearer-token auth', () => {
  let lastInit: RequestInit | undefined

  beforeEach(() => {
    lastInit = undefined
    // vi.stubGlobal restores cleanly via vi.unstubAllGlobals() in
    // afterEach — safer than mutating `global.fetch` directly when
    // other test files in the suite also use fetch (Vitest may run
    // them in parallel).
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
        lastInit = init
        return new Response(JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OLLAMA_AUTH_TOKEN
  })

  it('omits the Authorization header when OLLAMA_AUTH_TOKEN is unset', async () => {
    delete process.env.OLLAMA_AUTH_TOKEN
    await embed({ model: 'bge-m3', input: 'hello' })
    const headers = lastInit?.headers as Record<string, string>
    expect(headers?.Authorization).toBeUndefined()
    expect(headers?.['Content-Type']).toBe('application/json')
  })

  it('sends Authorization: Bearer ... when OLLAMA_AUTH_TOKEN is set', async () => {
    process.env.OLLAMA_AUTH_TOKEN = 'secret-vps-token'
    await embed({ model: 'bge-m3', input: 'hello' })
    const headers = lastInit?.headers as Record<string, string>
    expect(headers?.Authorization).toBe('Bearer secret-vps-token')
  })

  it('sends the bearer header on listModels too', async () => {
    process.env.OLLAMA_AUTH_TOKEN = 'secret-vps-token'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit | undefined) => {
        lastInit = init
        return new Response(JSON.stringify({ models: [] }), { status: 200 })
      }),
    )
    await listModels()
    const headers = lastInit?.headers as Record<string, string>
    expect(headers?.Authorization).toBe('Bearer secret-vps-token')
  })

  it('trims whitespace from the env var', async () => {
    process.env.OLLAMA_AUTH_TOKEN = '  spaced-token  '
    await embed({ model: 'bge-m3', input: 'hello' })
    const headers = lastInit?.headers as Record<string, string>
    expect(headers?.Authorization).toBe('Bearer spaced-token')
  })
})
