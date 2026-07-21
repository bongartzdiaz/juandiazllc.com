import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  scrapeContactSite,
  extractMarkdown,
  isFirecrawlConfigured,
  MAX_CONTENT_CHARS,
} from './scrape-contact-site'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

/** Build a fetch stub returning a Firecrawl-shaped success body. */
function mockFetchOk(markdown: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: { markdown } }),
  })
}

describe('isFirecrawlConfigured', () => {
  it('is false when the key is absent', () => {
    delete process.env.FIRECRAWL_API_KEY
    expect(isFirecrawlConfigured()).toBe(false)
  })

  it('is true when the key is present', () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    expect(isFirecrawlConfigured()).toBe(true)
  })
})

describe('extractMarkdown', () => {
  it('reads markdown from a well-formed body', () => {
    expect(extractMarkdown({ data: { markdown: '# Hi' } })).toBe('# Hi')
  })

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['a number', 42],
    ['an empty object', {}],
    ['data as null', { data: null }],
    ['data as a string', { data: 'nope' }],
    ['markdown missing', { data: {} }],
    ['markdown not a string', { data: { markdown: 123 } }],
  ])('returns null for %s', (_label, body) => {
    expect(extractMarkdown(body)).toBeNull()
  })
})

describe('scrapeContactSite', () => {
  it('no-ops when the API key is unset', async () => {
    delete process.env.FIRECRAWL_API_KEY
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not-configured')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('never calls out for a consumer mailbox', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await scrapeContactSite({ email: 'someone@gmail.com' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('no-company-domain')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns trimmed content and the source URL on success', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    const body = 'Acme Solar installs residential PV across the Netherlands.'
    vi.stubGlobal('fetch', mockFetchOk(`  ${body}  `))

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(true)
    expect(result.content).toBe(body)
    expect(result.sourceUrl).toBe('https://acmesolar.nl')
  })

  it('requests only the homepage, markdown, main content', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    const fetchMock = mockFetchOk('x'.repeat(100))
    vi.stubGlobal('fetch', fetchMock)

    await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    const [, init] = fetchMock.mock.calls[0]
    const sent = JSON.parse(init.body as string)
    expect(sent.url).toBe('https://acmesolar.nl')
    expect(sent.formats).toEqual(['markdown'])
    expect(sent.onlyMainContent).toBe(true)
    // Crawl options must never appear — the DPIA scope is one page.
    expect(sent).not.toHaveProperty('crawl')
    expect(sent).not.toHaveProperty('limit')
  })

  it('truncates oversized pages to the documented cap', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal('fetch', mockFetchOk('a'.repeat(MAX_CONTENT_CHARS + 5_000)))

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(true)
    expect(result.content).toHaveLength(MAX_CONTENT_CHARS)
  })

  it('treats a near-empty page as unusable', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal('fetch', mockFetchOk('tiny'))

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty-content')
  })

  it('reports request-failed on a non-2xx response', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({}) }),
    )

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('request-failed')
  })

  it('reports bad-response when the payload shape is unexpected', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ oops: 1 }) }),
    )

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('bad-response')
  })

  it('never throws when the network rejects', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('request-failed')
  })

  it('classifies an aborted fetch as a timeout', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    const abortErr = new Error('aborted')
    abortErr.name = 'AbortError'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr))

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('timeout')
  })

  it('never throws when the body is not JSON', async () => {
    process.env.FIRECRAWL_API_KEY = 'fc-test'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token')
        },
      }),
    )

    const result = await scrapeContactSite({ email: 'juan@acmesolar.nl' })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('request-failed')
  })
})
