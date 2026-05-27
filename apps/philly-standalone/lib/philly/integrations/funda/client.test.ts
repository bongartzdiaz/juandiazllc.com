/* Hermetic tests — Funda client + token cache + mock server.
   ──────────────────────────────────────────────────────────────────
   These tests don't talk to Funda — they exercise the client against
   the in-process mock server. Goal: prove the wire format we'd send
   to real Funda is what it should be, and the auth + retry semantics
   work.

   When real credentials land, we add ONE integration test that hits
   the real Funda sandbox URL with a real token — the entire mock-based
   suite stays intact as the regression net. */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildFundaClient, clearFundaTokenCache } from './client'
import { createFundaMock } from './mock-server'
import type { FundaListingPayload, FundaLeadWebhook } from './types'

function samplePayload(over: Partial<FundaListingPayload> = {}): FundaListingPayload {
  return {
    partnerReference: 'prop_1',
    listingType: 'sale',
    priceCents: 47_500_000,
    priceKind: 'fixed',
    address: {
      street: 'Damrak',
      houseNumber: '70',
      postalCode: '1012 LM',
      city: 'Amsterdam',
      country: 'NL',
    },
    classification: { type: 'apartment', subtype: 'apartment' },
    energyLabel: 'C',
    description: 'Beautifully renovated apartment.',
    photos: [
      { url: 'https://x/1.jpg', order: 1 },
      { url: 'https://x/2.jpg', order: 2 },
      { url: 'https://x/3.jpg', order: 3 },
      { url: 'https://x/4.jpg', order: 4 },
    ],
    ...over,
  }
}

beforeEach(() => {
  clearFundaTokenCache()
})

describe('OAuth token flow', () => {
  it('exchanges client_credentials for an access token before the first API call', async () => {
    const mock = createFundaMock({ tokens: ['t-1'] })
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    await client.publish(samplePayload())

    expect(mock.calls).toHaveLength(2)
    expect(mock.calls[0].url).toContain('/oauth/token')
    expect(mock.calls[0].bodyForm).toEqual({
      grant_type: 'client_credentials',
      client_id: 'cid',
      client_secret: 'cs',
    })
    expect(mock.calls[1].authHeader).toBe('Bearer t-1')
  })

  it('caches the token across calls — second publish reuses', async () => {
    const mock = createFundaMock({ tokens: ['t-1', 't-2'] })
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    await client.publish(samplePayload())
    await client.publish(samplePayload({ partnerReference: 'prop_2' }))

    const tokenCalls = mock.calls.filter(c => c.url.includes('/oauth/token'))
    expect(tokenCalls).toHaveLength(1)
    // Both API calls used the SAME token
    const apiCalls = mock.calls.filter(c => c.url.includes('/listings'))
    expect(apiCalls[0].authHeader).toBe('Bearer t-1')
    expect(apiCalls[1].authHeader).toBe('Bearer t-1')
  })

  it('returns error when token endpoint fails', async () => {
    const mock = createFundaMock({ tokenError: 401 })
    const client = buildFundaClient({ clientId: 'bad', clientSecret: 'bad' }, mock.fetchImpl)

    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/token endpoint 401/)
  })
})

describe('publish()', () => {
  it('POSTs the payload to /listings with Bearer auth', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.response.listingId).toMatch(/^funda-prop_1-\d+$/)
      expect(r.response.status).toBe('live')
      expect(r.response.publicUrl).toContain('funda.nl/koop/amsterdam/')
    }

    // The OAuth token request is ALSO POST — find the API call by URL.
    const post = mock.calls.find(c => c.method === 'POST' && c.url.includes('/listings'))!
    expect(post.url).toContain('/partner/v1/listings')
    expect(post.authHeader).toMatch(/^Bearer /)
    expect((post.bodyJson as FundaListingPayload).partnerReference).toBe('prop_1')
  })

  it('stores the published payload in mock state (round-trip verifiable)', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(true)
    if (r.ok) {
      const stored = mock.publishedListings.get(r.response.listingId)
      expect(stored).toBeDefined()
      expect(stored?.partnerReference).toBe('prop_1')
      expect(stored?.address.postalCode).toBe('1012 LM')
    }
  })

  it('returns ok=false with rejectionReason when Funda rejects (422)', async () => {
    const mock = createFundaMock({ rejectNextPublish: 'insufficient_photos' })
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/publish 422/)
      expect(r.error).toMatch(/insufficient_photos/)
    }
  })
})

describe('unpublish()', () => {
  it('DELETEs the listing and treats 204 as success', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const published = await client.publish(samplePayload())
    if (!published.ok) throw new Error('publish should have succeeded')

    const r = await client.unpublish(published.response.listingId)
    expect(r.ok).toBe(true)
    expect(mock.publishedListings.has(published.response.listingId)).toBe(false)
  })

  it('treats 404 as success (idempotent — already unpublished)', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.unpublish('does-not-exist')
    expect(r.ok).toBe(true)
  })

  it('URL-encodes the listing id', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    await client.unpublish('weird id/with slashes')
    const del = mock.calls.find(c => c.method === 'DELETE')!
    expect(del.url).toContain('weird%20id%2Fwith%20slashes')
  })
})

describe('fetchLeads()', () => {
  it('returns leads added since the cursor', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const lead1: FundaLeadWebhook = {
      eventId: 'ev_1',
      receivedAt: '2026-05-26T10:00:00Z',
      partnerReference: 'prop_1',
      listingId: 'funda-1',
      leadType: 'contact_request',
      contact: { fullName: 'Alice', email: 'alice@x.com' },
    }
    const lead2: FundaLeadWebhook = {
      ...lead1,
      eventId: 'ev_2',
      receivedAt: '2026-05-27T12:00:00Z',
      contact: { fullName: 'Bob', email: 'bob@x.com' },
    }
    mock.addLead(lead1)
    mock.addLead(lead2)

    const r = await client.fetchLeads(new Date('2026-05-27T00:00:00Z'))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.leads).toHaveLength(1)
      expect(r.leads[0].eventId).toBe('ev_2')
    }
  })

  it('returns empty array (not error) when no leads match', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.fetchLeads(new Date())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.leads).toEqual([])
  })

  it('URL-encodes the since timestamp', async () => {
    const mock = createFundaMock()
    const client = buildFundaClient({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    await client.fetchLeads(new Date('2026-01-01T00:00:00Z'))
    const get = mock.calls.find(c => c.method === 'GET')!
    expect(get.url).toContain('since=2026-01-01T00%3A00%3A00.000Z')
  })
})
