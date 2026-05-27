/* Hermetic tests — GET /api/contacts/[id]/drip-enrollments. */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSectionMock: vi.fn(),
  contactFindFirstMock: vi.fn(),
  dripEnrollmentFindManyMock: vi.fn(),
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
    contact: { findFirst: (...a: unknown[]) => mocks.contactFindFirstMock(...a) },
    dripEnrollment: { findMany: (...a: unknown[]) => mocks.dripEnrollmentFindManyMock(...a) },
  }),
}))

import { GET } from './route'

const SCOPE = { userId: 'u1', organizationId: 'org_1', role: 'manager' } as const

function makeReq(): Request {
  return new Request('http://x/api/contacts/c1/drip-enrollments')
}
async function callGet(contactId: string) {
  return GET(makeReq() as never, { params: Promise.resolve({ id: contactId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSectionMock.mockResolvedValue(SCOPE)
  mocks.contactFindFirstMock.mockResolvedValue({ id: 'c1' })
  mocks.dripEnrollmentFindManyMock.mockResolvedValue([])
})

describe('GET /api/contacts/[id]/drip-enrollments', () => {
  it('returns 403 when requireSection rejects', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    mocks.requireSectionMock.mockResolvedValueOnce(forbidden)
    const res = await callGet('c1')
    expect(res.status).toBe(403)
    expect(mocks.contactFindFirstMock).not.toHaveBeenCalled()
  })

  it('returns 404 when contact is not in caller org', async () => {
    mocks.contactFindFirstMock.mockResolvedValueOnce(null)
    const res = await callGet('c_other_org')
    expect(res.status).toBe(404)
    expect(mocks.dripEnrollmentFindManyMock).not.toHaveBeenCalled()
  })

  it('filters enrollments by both contactId and organizationId', async () => {
    await callGet('c1')
    const where = mocks.dripEnrollmentFindManyMock.mock.calls[0][0].where
    expect(where.contactId).toBe('c1')
    expect(where.organizationId).toBe('org_1')
  })

  it('flattens campaign + computes totalSteps from JSON', async () => {
    mocks.dripEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        id: 'e1',
        campaignId: 'cam1',
        campaign: { id: 'cam1', name: 'Buyer nurture', stepsJson: '[{"day":0},{"day":3},{"day":7}]' },
        status: 'active',
        lastStepIndex: 1,
        nextDueAt: new Date('2026-05-30T10:00:00Z'),
        lastDeliveredAt: new Date('2026-05-27T10:00:00Z'),
        createdAt: new Date('2026-05-20T10:00:00Z'),
      },
    ])
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    const row = json.data[0]
    expect(row.campaignName).toBe('Buyer nurture')
    expect(row.totalSteps).toBe(3)
    expect(row.lastStepIndex).toBe(1)
    expect(row.status).toBe('active')
    expect(row.nextDueAt).toBe('2026-05-30T10:00:00.000Z')
  })

  it('handles malformed stepsJson gracefully (totalSteps=0)', async () => {
    mocks.dripEnrollmentFindManyMock.mockResolvedValueOnce([
      {
        id: 'e1', campaignId: 'cam1',
        campaign: { id: 'cam1', name: 'Bad campaign', stepsJson: '{not json' },
        status: 'active', lastStepIndex: -1,
        nextDueAt: null, lastDeliveredAt: null,
        createdAt: new Date('2026-05-20T10:00:00Z'),
      },
    ])
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data[0].totalSteps).toBe(0)
  })

  it('caps at 50 enrollments', async () => {
    await callGet('c1')
    expect(mocks.dripEnrollmentFindManyMock.mock.calls[0][0].take).toBe(50)
  })

  it('returns empty array when no enrollments', async () => {
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data).toEqual([])
  })
})
