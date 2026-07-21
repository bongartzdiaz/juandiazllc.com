import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normaliseEmails } from './dsar-marketing'

/* The Supabase client is mocked per-test so the query/purge paths can be
   driven through their success and failure branches without a live
   project. `normaliseEmails` is pure and tested directly — it decides
   which rows get returned or deleted, so over-matching here would mean
   handing one person another person's data. */

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/philly/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

describe('normaliseEmails', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmails(['  Juan@Example.COM '])).toEqual(['juan@example.com'])
  })

  it('de-duplicates case variants', () => {
    expect(normaliseEmails(['a@b.com', 'A@B.com', 'a@b.com'])).toEqual(['a@b.com'])
  })

  it('drops null, undefined and blanks', () => {
    expect(normaliseEmails([null, undefined, '', '   ', 'a@b.com'])).toEqual(['a@b.com'])
  })

  it('returns empty for nothing usable', () => {
    expect(normaliseEmails([null, undefined, ''])).toEqual([])
  })

  it('does NOT strip plus-addressing — that is a different mailbox', () => {
    // Treating juan+crm@ as juan@ would return or delete rows belonging
    // to an address the subject did not ask about.
    expect(normaliseEmails(['juan+crm@example.com'])).toEqual(['juan+crm@example.com'])
  })

  it('keeps distinct addresses distinct', () => {
    expect(normaliseEmails(['a@b.com', 'c@d.com']).sort()).toEqual(['a@b.com', 'c@d.com'])
  })
})

describe('fetchMarketingData', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('short-circuits without touching the store when there are no emails', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { fetchMarketingData } = await import('./dsar-marketing')

    const result = await fetchMarketingData([null, undefined, ''])

    expect(result).toEqual({ available: true, leads: [], subscribers: [] })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('reports unavailable rather than throwing when the store is unreachable', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockImplementation(() => {
      throw new Error('SUPABASE_SECRET_KEY missing')
    })
    const { fetchMarketingData } = await import('./dsar-marketing')

    const result = await fetchMarketingData(['a@b.com'])

    // An Art. 15 export must still be deliverable; the gap is declared,
    // not silently swallowed.
    expect(result.available).toBe(false)
    expect(result.error).toMatch(/SUPABASE_SECRET_KEY/)
    expect(result.leads).toEqual([])
  })
})

describe('purgeMarketingData', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('short-circuits with success when there is nothing to purge', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    const { purgeMarketingData } = await import('./dsar-marketing')

    const result = await purgeMarketingData([])

    expect(result).toEqual({
      available: true,
      leadsDeleted: 0,
      subscribersDeleted: 0,
    })
    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('never reports success when the store is unreachable', async () => {
    const { createServiceClient } = await import('@/lib/supabase/service')
    vi.mocked(createServiceClient).mockImplementation(() => {
      throw new Error('network down')
    })
    const { purgeMarketingData } = await import('./dsar-marketing')

    const result = await purgeMarketingData(['a@b.com'])

    // Reporting available:true here would certify an erasure that did
    // not happen — the caller must be able to tell the difference.
    expect(result.available).toBe(false)
    expect(result.leadsDeleted).toBe(0)
  })
})
