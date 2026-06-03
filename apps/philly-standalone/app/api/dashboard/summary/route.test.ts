import { describe, it, expect, vi, beforeEach } from 'vitest'

/* Regression guard for a cross-tenant leak found 2026-06-03: the dashboard
 * summary aggregates deals, which have NO organizationId column (they are
 * scoped through pipeline.organizationId). getAuthPrisma() is a PLAIN
 * PrismaClient — no RLS extension — so an aggregate filtered only on `status`
 * counts deals across EVERY org. These tests assert every deal query carries
 * the pipeline.organizationId filter. They FAIL against the pre-fix code. */

const ORG = 'org-A'

const calls: { dealAggregateWheres: unknown[]; dealFindWheres: unknown[] } = {
  dealAggregateWheres: [],
  dealFindWheres: [],
}

vi.mock('@/lib/philly/auth-helpers', () => ({
  requireScope: async () => ({ userId: 'u1', organizationId: ORG, role: 'admin', email: 'a@b.com' }),
}))

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    contact: { count: async () => 0 },
    deal: {
      aggregate: async ({ where }: { where: unknown }) => {
        calls.dealAggregateWheres.push(where)
        return { _count: { _all: 0 }, _sum: { valueCents: 0 } }
      },
      findMany: async ({ where }: { where: unknown }) => {
        calls.dealFindWheres.push(where)
        return []
      },
    },
    transaction: { aggregate: async () => ({ _count: { _all: 0 }, _sum: { salePrice: 0 } }) },
    auditLog: { findMany: async () => [] },
  }),
}))

import { GET } from './route'
import { NextRequest } from 'next/server'

function hasOrgScopedPipeline(where: any, org: string): boolean {
  return where?.pipeline?.organizationId === org
}

describe('GET /api/dashboard/summary — tenant scoping', () => {
  beforeEach(() => {
    calls.dealAggregateWheres = []
    calls.dealFindWheres = []
  })

  it('every deal aggregate filters through pipeline.organizationId', async () => {
    await GET(new NextRequest('http://localhost/api/dashboard/summary'))
    expect(calls.dealAggregateWheres.length).toBeGreaterThanOrEqual(2)
    for (const where of calls.dealAggregateWheres) {
      expect(hasOrgScopedPipeline(where, ORG)).toBe(true)
    }
  })

  it('the monthly-revenue deal query is org-scoped via pipeline', async () => {
    await GET(new NextRequest('http://localhost/api/dashboard/summary'))
    expect(calls.dealFindWheres.length).toBeGreaterThanOrEqual(1)
    for (const where of calls.dealFindWheres) {
      expect(hasOrgScopedPipeline(where, ORG)).toBe(true)
    }
  })

  it('returns a 200 with the documented shape', async () => {
    const res = await GET(new NextRequest('http://localhost/api/dashboard/summary'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty('kpis')
    expect(json.data).toHaveProperty('monthlyRevenue')
    expect(json.data).toHaveProperty('recentActivity')
  })
})
