/* Hermetic tests — POST + DELETE /api/properties/[id]/publish.
   ──────────────────────────────────────────────────────────────────
   Pins the contract for the portal-publish flow. Mocks everything at
   module boundary so we test the routing/auth/upsert wiring without
   spinning up Prisma or hitting Funda. */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSectionMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  propertyFindFirstMock: vi.fn(),
  portalListingUpsertMock: vi.fn(),
  portalListingFindUniqueMock: vi.fn(),
  portalListingDeleteMock: vi.fn(),
  logAuditMock: vi.fn(),
  getConnectorMock: vi.fn(),
}))

vi.mock('@/lib/philly/auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/philly/auth-helpers')>(
    '@/lib/philly/auth-helpers',
  )
  return {
    ...actual,
    requireSection: (...a: unknown[]) => mocks.requireSectionMock(...a),
  }
})

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    property: { findFirst: (...a: unknown[]) => mocks.propertyFindFirstMock(...a) },
    portalListing: {
      upsert: (...a: unknown[]) => mocks.portalListingUpsertMock(...a),
      findUnique: (...a: unknown[]) => mocks.portalListingFindUniqueMock(...a),
      delete: (...a: unknown[]) => mocks.portalListingDeleteMock(...a),
    },
  }),
}))

vi.mock('@/lib/philly/audit', () => ({
  logAudit: (...a: unknown[]) => mocks.logAuditMock(...a),
}))

vi.mock('@/lib/philly/rate-limit', () => ({
  enforceRateLimit: (...a: unknown[]) => mocks.enforceRateLimitMock(...a),
  PRESET_MUTATION: { tokensPerWindow: 100, windowMs: 60_000 },
}))

vi.mock('@/lib/philly/integrations/registry', () => ({
  getConnector: (...a: unknown[]) => mocks.getConnectorMock(...a),
}))

// ── Import under test ──
import { POST, DELETE } from './route'

const SCOPE = { userId: 'u1', organizationId: 'org_1', role: 'manager' } as const

function makeReq(body: unknown): Request {
  return new Request('http://x/api/properties/prop_1/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callPost(propertyId: string, body: unknown) {
  return POST(makeReq(body) as never, { params: Promise.resolve({ id: propertyId }) })
}

async function callDelete(propertyId: string, body: unknown) {
  return DELETE(makeReq(body) as never, { params: Promise.resolve({ id: propertyId }) })
}

function baseProperty() {
  return {
    id: 'prop_1',
    organizationId: 'org_1',
    listingType: 'sale',
    priceCents: 47_500_000,
    address: 'Damrak 70',
    city: 'Amsterdam',
    zipCode: '1012 LM',
    country: 'NL',
    subtype: 'apartment',
    livingArea: 85,
    bedrooms: 3,
    bathrooms: 1,
    yearBuilt: 1890,
    epcRating: 'C',
    epcExpiresAt: new Date('2030-12-31'),
    description: 'Renovated.',
    images: JSON.stringify(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']),
    virtualTourUrl: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSectionMock.mockResolvedValue(SCOPE)
  mocks.enforceRateLimitMock.mockReturnValue(null)
  mocks.propertyFindFirstMock.mockResolvedValue(baseProperty())
  mocks.portalListingUpsertMock.mockImplementation(({ create }: { create: unknown }) =>
    Promise.resolve({ id: 'pl_1', ...(create as object), createdAt: new Date(), updatedAt: new Date(), lastSyncAt: new Date() }),
  )
  mocks.portalListingFindUniqueMock.mockResolvedValue(null)
  mocks.portalListingDeleteMock.mockResolvedValue(undefined)
  mocks.logAuditMock.mockResolvedValue(undefined)
})

describe('POST /api/properties/[id]/publish', () => {
  it('returns 401/403 when requireSection rejects', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    mocks.requireSectionMock.mockResolvedValueOnce(forbidden)
    const res = await callPost('prop_1', { portal: 'funda' })
    expect(res.status).toBe(403)
    expect(mocks.portalListingUpsertMock).not.toHaveBeenCalled()
  })

  it('rejects unknown portal id', async () => {
    const res = await callPost('prop_1', { portal: 'zillow' })
    expect(res.status).toBe(400)
  })

  it('rejects when connector lacks PortalPublisher methods', async () => {
    mocks.getConnectorMock.mockReturnValueOnce({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
    })
    const res = await callPost('prop_1', { portal: 'funda' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when property not found / wrong org', async () => {
    mocks.propertyFindFirstMock.mockResolvedValueOnce(null)
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate: vi.fn(),
      publish: vi.fn(),
      unpublish: vi.fn(),
      fetchLeads: vi.fn(),
    })
    const res = await callPost('prop_1', { portal: 'funda' })
    expect(res.status).toBe(404)
  })

  it('dryRun returns validation result without calling publish', async () => {
    const validate = vi.fn().mockResolvedValue({ ok: true })
    const publish = vi.fn()
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate, publish, unpublish: vi.fn(), fetchLeads: vi.fn(),
    })
    const res = await callPost('prop_1', { portal: 'funda', dryRun: true })
    const json = await res.json()
    expect(json.data).toEqual({ ok: true })
    expect(publish).not.toHaveBeenCalled()
    expect(mocks.portalListingUpsertMock).not.toHaveBeenCalled()
  })

  it('dryRun returns validation failure code', async () => {
    const validate = vi.fn().mockResolvedValue({
      ok: false, code: 'FUNDA_EPC_REQUIRED', message: 'EPC required',
    })
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate, publish: vi.fn(), unpublish: vi.fn(), fetchLeads: vi.fn(),
    })
    const res = await callPost('prop_1', { portal: 'funda', dryRun: true })
    const json = await res.json()
    expect(json.data.ok).toBe(false)
    expect(json.data.code).toBe('FUNDA_EPC_REQUIRED')
  })

  it('publish success upserts PortalListing + writes audit', async () => {
    const validate = vi.fn().mockResolvedValue({ ok: true })
    const publish = vi.fn().mockResolvedValue({
      ok: true,
      externalId: 'funda-prop_1-1700',
      externalUrl: 'https://www.funda.nl/x/funda-prop_1-1700',
    })
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate, publish, unpublish: vi.fn(), fetchLeads: vi.fn(),
    })

    const res = await callPost('prop_1', { portal: 'funda' })
    const json = await res.json()
    expect(json.data.ok).toBe(true)
    expect(json.data.externalId).toBe('funda-prop_1-1700')

    expect(mocks.portalListingUpsertMock).toHaveBeenCalledTimes(1)
    const upsertArg = mocks.portalListingUpsertMock.mock.calls[0][0]
    expect(upsertArg.where).toEqual({
      organizationId_propertyId_portal: { organizationId: 'org_1', propertyId: 'prop_1', portal: 'funda' },
    })
    expect(upsertArg.create.status).toBe('published')
    expect(upsertArg.create.externalId).toBe('funda-prop_1-1700')

    expect(mocks.logAuditMock).toHaveBeenCalledTimes(1)
    expect(mocks.logAuditMock.mock.calls[0][0].action).toBe('create')
    expect(mocks.logAuditMock.mock.calls[0][0].entity).toBe('property')
  })

  it('publish failure upserts PortalListing as draft with lastError', async () => {
    const validate = vi.fn().mockResolvedValue({ ok: true })
    const publish = vi.fn().mockResolvedValue({
      ok: false, code: 'FUNDA_PUBLISH_FAILED', message: 'SMTP down',
    })
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate, publish, unpublish: vi.fn(), fetchLeads: vi.fn(),
    })

    const res = await callPost('prop_1', { portal: 'funda' })
    const json = await res.json()
    expect(json.data.ok).toBe(false)
    expect(json.data.code).toBe('FUNDA_PUBLISH_FAILED')

    // Should have upserted a draft row with the error captured
    expect(mocks.portalListingUpsertMock).toHaveBeenCalledTimes(1)
    const upsertArg = mocks.portalListingUpsertMock.mock.calls[0][0]
    expect(upsertArg.create.status).toBe('draft')
    expect(upsertArg.create.lastError).toContain('FUNDA_PUBLISH_FAILED')
    expect(upsertArg.create.lastError).toContain('SMTP down')
  })

  it('rate-limit short-circuits before any work', async () => {
    const limited = NextResponse.json({ error: 'rate-limited' }, { status: 429 })
    mocks.enforceRateLimitMock.mockReturnValueOnce(limited)
    const res = await callPost('prop_1', { portal: 'funda' })
    expect(res.status).toBe(429)
    expect(mocks.propertyFindFirstMock).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/properties/[id]/publish', () => {
  it('returns ok=true when no PortalListing exists (idempotent)', async () => {
    mocks.portalListingFindUniqueMock.mockResolvedValueOnce(null)
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate: vi.fn(), publish: vi.fn(),
      unpublish: vi.fn(), fetchLeads: vi.fn(),
    })

    const res = await callDelete('prop_1', { portal: 'funda' })
    const json = await res.json()
    expect(json.data.ok).toBe(true)
    expect(mocks.portalListingDeleteMock).not.toHaveBeenCalled()
  })

  it('calls connector.unpublish + deletes row on success', async () => {
    mocks.portalListingFindUniqueMock.mockResolvedValueOnce({
      id: 'pl_1', externalId: 'funda-prop_1-1700',
    })
    const unpublish = vi.fn().mockResolvedValue({ ok: true })
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate: vi.fn(), publish: vi.fn(),
      unpublish, fetchLeads: vi.fn(),
    })

    const res = await callDelete('prop_1', { portal: 'funda' })
    const json = await res.json()
    expect(json.data.ok).toBe(true)
    expect(unpublish).toHaveBeenCalledWith('funda-prop_1-1700')
    expect(mocks.portalListingDeleteMock).toHaveBeenCalledTimes(1)
    expect(mocks.logAuditMock).toHaveBeenCalledTimes(1)
    expect(mocks.logAuditMock.mock.calls[0][0].action).toBe('delete')
  })

  it('returns 502 + does NOT delete row on portal failure', async () => {
    mocks.portalListingFindUniqueMock.mockResolvedValueOnce({
      id: 'pl_1', externalId: 'funda-prop_1-1700',
    })
    const unpublish = vi.fn().mockResolvedValue({
      ok: false, code: 'FUNDA_UNPUBLISH_FAILED', message: 'timeout',
    })
    mocks.getConnectorMock.mockReturnValue({
      meta: { id: 'funda', name: 'Funda', category: 'portal' },
      test: vi.fn(),
      validate: vi.fn(), publish: vi.fn(),
      unpublish, fetchLeads: vi.fn(),
    })

    const res = await callDelete('prop_1', { portal: 'funda' })
    expect(res.status).toBe(502)
    expect(mocks.portalListingDeleteMock).not.toHaveBeenCalled()
  })
})
