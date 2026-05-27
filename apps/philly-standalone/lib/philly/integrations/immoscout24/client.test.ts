/* Hermetic tests — IS24 client + mock server. */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildIS24Client, clearIS24TokenCache } from './client'
import { createIS24Mock } from './mock-server'
import type { IS24ListingPayload, IS24LeadWebhook } from './types'

function samplePayload(over: Partial<IS24ListingPayload> = {}): IS24ListingPayload {
  return {
    partnerReference: 'prop_1',
    marketingType: 'KAUF',
    realEstateType: 'WOHNUNG',
    priceCents: 45_000_000,
    priceMode: 'FIXED',
    address: {
      street: 'Friedrichstraße',
      houseNumber: '100',
      postcode: '10117',
      city: 'Berlin',
      country: 'DE',
    },
    energyCertificate: {
      type: 'VERBRAUCHSAUSWEIS',
      energyClass: 'C',
    },
    description: 'Sanierte Altbauwohnung.',
    photos: [
      { url: 'https://x/1.jpg', order: 1 },
      { url: 'https://x/2.jpg', order: 2 },
      { url: 'https://x/3.jpg', order: 3 },
    ],
    ...over,
  }
}

beforeEach(() => {
  clearIS24TokenCache()
})

describe('OAuth token flow', () => {
  it('exchanges client_credentials for token before first API call', async () => {
    const mock = createIS24Mock({ tokens: ['t-1'] })
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)
    await client.publish(samplePayload())

    expect(mock.calls[0].url).toContain('/oauth/token')
    expect(mock.calls[0].bodyForm).toEqual({
      grant_type: 'client_credentials',
      client_id: 'cid',
      client_secret: 'cs',
    })
  })

  it('caches token across calls', async () => {
    const mock = createIS24Mock({ tokens: ['t-1', 't-2'] })
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)
    await client.publish(samplePayload())
    await client.publish(samplePayload({ partnerReference: 'prop_2' }))

    const tokenCalls = mock.calls.filter(c => c.url.includes('/oauth/token'))
    expect(tokenCalls).toHaveLength(1)
  })

  it('returns error on token endpoint failure', async () => {
    const mock = createIS24Mock({ tokenError: 401 })
    const client = buildIS24Client({ clientId: 'bad', clientSecret: 'bad' }, mock.fetchImpl)
    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/token endpoint 401/)
  })
})

describe('publish()', () => {
  it('POSTs the payload to /offer/v1.0/realestate', async () => {
    const mock = createIS24Mock()
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.response.exposeId).toMatch(/^is24-prop_1-\d+$/)
      expect(r.response.status).toBe('PUBLISHED')
      expect(r.response.publicUrl).toContain('immobilienscout24.de/expose/')
    }

    const post = mock.calls.find(c => c.method === 'POST' && c.url.includes('/realestate'))!
    expect(post.url).toContain('/offer/v1.0/realestate')
    expect(post.authHeader).toMatch(/^Bearer /)
  })

  it('handles 422 with rejectionReason', async () => {
    const mock = createIS24Mock({ rejectNextPublish: 'invalid_address' })
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)
    const r = await client.publish(samplePayload())
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toMatch(/publish 422/)
      expect(r.error).toMatch(/invalid_address/)
    }
  })
})

describe('unpublish()', () => {
  it('DELETEs the expose and treats 204 as success', async () => {
    const mock = createIS24Mock()
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const published = await client.publish(samplePayload())
    if (!published.ok) throw new Error('publish should succeed')

    const r = await client.unpublish(published.response.exposeId)
    expect(r.ok).toBe(true)
    expect(mock.publishedListings.has(published.response.exposeId)).toBe(false)
  })

  it('treats 404 as success (idempotent)', async () => {
    const mock = createIS24Mock()
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)
    const r = await client.unpublish('does-not-exist')
    expect(r.ok).toBe(true)
  })
})

describe('fetchLeads()', () => {
  it('returns leads since cursor', async () => {
    const mock = createIS24Mock()
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)

    const lead1: IS24LeadWebhook = {
      eventId: 'ev_1',
      receivedAt: '2026-05-26T10:00:00Z',
      partnerReference: 'prop_1',
      exposeId: 'is24-1',
      leadType: 'CONTACT',
      contact: { firstName: 'Hans', lastName: 'Müller', email: 'hans@x.de' },
    }
    const lead2: IS24LeadWebhook = {
      ...lead1,
      eventId: 'ev_2',
      receivedAt: '2026-05-27T12:00:00Z',
      contact: { firstName: 'Anna', lastName: 'Schmidt', email: 'anna@x.de' },
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

  it('returns empty array when no leads', async () => {
    const mock = createIS24Mock()
    const client = buildIS24Client({ clientId: 'cid', clientSecret: 'cs' }, mock.fetchImpl)
    const r = await client.fetchLeads(new Date())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.leads).toEqual([])
  })
})
