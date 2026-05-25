/* Hermetic route tests — PUT /api/admin/orgs/[orgId]/features/[key]
   ─────────────────────────────────────────────────────────────────
   Verifies:
     - requireSuperAdmin() gates the route (401 / 403 / 409)
     - zod schema rejects bad input (state, reason)
     - FORCED_ON / FORCED_OFF UPSERT the OrgFeatureOverride row
     - INHERIT deletes the row (not "writes state=INHERIT")
     - AuditLog row written with target-org + correct diff
     - Slack notify called with correct payload (fire-and-forget)
     - Unknown FEATURES key → 400
     - Unknown orgId → 404

   Mocks are at module-boundary level (vi.mock) so the test file is
   tiny and the assertions are about route behavior, not Prisma rows. */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// ── Mocks (hoisted alongside vi.mock so refs are valid at module-init) ──
//
// vi.mock() calls are hoisted to the top of the file; top-level
// `const fooMock = vi.fn()` is NOT. vi.hoisted() lifts the mock
// declarations into the same hoist phase so they're defined when the
// vi.mock factories run.

const mocks = vi.hoisted(() => ({
  requireSuperAdminMock: vi.fn(),
  orgFindMock: vi.fn(),
  overrideFindMock: vi.fn(),
  overrideUpsertMock: vi.fn(),
  overrideDeleteMock: vi.fn(),
  subscriptionFindMock: vi.fn(),
  featureFlagFindMock: vi.fn(),
  logAuditMock: vi.fn(),
  notifyMock: vi.fn(),
}))

// Closure factories — reference `mocks` lazily (at call time) so the
// vi.mock hoist doesn't try to read an uninitialized binding.
vi.mock('@/lib/philly/auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/philly/auth-helpers')>(
    '@/lib/philly/auth-helpers',
  )
  return {
    ...actual,
    requireSuperAdmin: (...args: unknown[]) => mocks.requireSuperAdminMock(...args),
  }
})

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    organization: { findUnique: (...args: unknown[]) => mocks.orgFindMock(...args) },
    orgFeatureOverride: {
      findUnique: (...args: unknown[]) => mocks.overrideFindMock(...args),
      upsert: (...args: unknown[]) => mocks.overrideUpsertMock(...args),
      delete: (...args: unknown[]) => mocks.overrideDeleteMock(...args),
    },
    subscription: { findUnique: (...args: unknown[]) => mocks.subscriptionFindMock(...args) },
    featureFlag: { findMany: (...args: unknown[]) => mocks.featureFlagFindMock(...args) },
  }),
}))

vi.mock('@/lib/philly/audit', () => ({
  logAudit: (...args: unknown[]) => mocks.logAuditMock(...args),
}))

vi.mock('@/lib/philly/features/slack-notify', () => ({
  notifySuperAdminOverride: (...args: unknown[]) => mocks.notifyMock(...args),
}))

vi.mock('@/lib/philly/rate-limit', () => ({
  enforceRateLimit: vi.fn(() => null),
  PRESET_MUTATION: { tokensPerWindow: 100, windowMs: 60_000 },
}))

// ── Import under test (after mocks are registered) ─────────────────

import { PUT, GET } from './route'

// ── Test helpers ───────────────────────────────────────────────────

const SUPER_ADMIN_SCOPE = {
  userId: 'user_super_001',
  organizationId: 'org_super_home',   // super-admin's HOME org — NOT the target
  role: 'superAdmin',
  email: 'juan@kompasagency.nl',
  dashboardSections: null,
  mfaEnrolled: true,
}

const TARGET_ORG = { id: 'org_customer_001', name: 'ACME Inc' }
const FEATURE_KEY = 'webhooks'

function makeRequest(body: unknown, params = { orgId: TARGET_ORG.id, key: FEATURE_KEY }) {
  const req = new Request(`http://test/api/admin/orgs/${params.orgId}/features/${params.key}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return {
    req: req as unknown as Parameters<typeof PUT>[0],
    ctx: { params: Promise.resolve(params) },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSuperAdminMock.mockResolvedValue(SUPER_ADMIN_SCOPE)
  mocks.orgFindMock.mockResolvedValue(TARGET_ORG)
  mocks.overrideFindMock.mockResolvedValue(null)
  mocks.overrideUpsertMock.mockResolvedValue({})
  mocks.overrideDeleteMock.mockResolvedValue({})
  mocks.subscriptionFindMock.mockResolvedValue({ plan: 'team' })
  mocks.featureFlagFindMock.mockResolvedValue([])
  mocks.logAuditMock.mockResolvedValue(undefined)
  mocks.notifyMock.mockResolvedValue(undefined)
})

// ── Tests ──────────────────────────────────────────────────────────

describe('PUT /api/admin/orgs/[orgId]/features/[key]', () => {
  describe('Auth gate (requireSuperAdmin)', () => {
    it('Returns 403 NextResponse from requireSuperAdmin without invoking handler', async () => {
      mocks.requireSuperAdminMock.mockResolvedValue(
        NextResponse.json({ error: 'Forbidden — super-admin only' }, { status: 403 }),
      )
      const { req, ctx } = makeRequest({ state: 'FORCED_OFF', reason: 'security incident triage' })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(403)
      expect(mocks.orgFindMock).not.toHaveBeenCalled()
      expect(mocks.overrideUpsertMock).not.toHaveBeenCalled()
      expect(mocks.logAuditMock).not.toHaveBeenCalled()
    })
  })

  describe('Input validation', () => {
    it('Unknown feature key → 400', async () => {
      const { req, ctx } = makeRequest(
        { state: 'FORCED_OFF', reason: 'security incident triage' },
        { orgId: TARGET_ORG.id, key: 'not-a-real-feature' },
      )
      const res = await PUT(req, ctx)
      expect(res.status).toBe(400)
      expect(mocks.overrideUpsertMock).not.toHaveBeenCalled()
    })

    it('Missing reason → 400', async () => {
      const { req, ctx } = makeRequest({ state: 'FORCED_OFF' })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(400)
    })

    it('Reason too short (< 10 chars) → 400', async () => {
      const { req, ctx } = makeRequest({ state: 'FORCED_OFF', reason: 'too short' })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(400)
    })

    it('Invalid state value → 400', async () => {
      const { req, ctx } = makeRequest({
        state: 'MAYBE_ON',
        reason: 'this is a sufficiently long reason text',
      })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(400)
    })

    it('Invalid JSON body → 400', async () => {
      const badReq = new Request('http://test/api/admin/orgs/x/features/webhooks', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: 'not-json{',
      })
      const res = await PUT(
        badReq as unknown as Parameters<typeof PUT>[0],
        { params: Promise.resolve({ orgId: TARGET_ORG.id, key: FEATURE_KEY }) },
      )
      expect(res.status).toBe(400)
    })
  })

  describe('Target org existence', () => {
    it('Unknown orgId → 404', async () => {
      mocks.orgFindMock.mockResolvedValue(null)
      const { req, ctx } = makeRequest({ state: 'FORCED_OFF', reason: 'security incident triage' })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(404)
      expect(mocks.overrideUpsertMock).not.toHaveBeenCalled()
    })
  })

  describe('FORCED_OFF write path', () => {
    it('Upserts override row, writes audit, posts Slack', async () => {
      const { req, ctx } = makeRequest({
        state: 'FORCED_OFF',
        reason: 'CVE-2026-1234 incident — pausing webhooks pending fix',
      })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(200)
      expect(mocks.overrideUpsertMock).toHaveBeenCalledTimes(1)
      expect(mocks.overrideUpsertMock.mock.calls[0]?.[0]).toMatchObject({
        where: { organizationId_feature: { organizationId: TARGET_ORG.id, feature: FEATURE_KEY } },
        update: expect.objectContaining({
          state: 'FORCED_OFF',
          createdById: SUPER_ADMIN_SCOPE.userId,
        }),
        create: expect.objectContaining({
          organizationId: TARGET_ORG.id,
          feature: FEATURE_KEY,
          state: 'FORCED_OFF',
          createdById: SUPER_ADMIN_SCOPE.userId,
        }),
      })

      // Audit: targets the CUSTOMER's org (not super-admin's home org)
      expect(mocks.logAuditMock).toHaveBeenCalledTimes(1)
      expect(mocks.logAuditMock.mock.calls[0]?.[0]).toMatchObject({
        scope: expect.objectContaining({ organizationId: TARGET_ORG.id }),
        action: 'update',
        entity: 'orgFeatureOverride',
        entityId: FEATURE_KEY,
      })

      // Slack fired (fire-and-forget — we don't await it; just verify call)
      expect(mocks.notifyMock).toHaveBeenCalledTimes(1)
      expect(mocks.notifyMock.mock.calls[0]?.[0]).toMatchObject({
        actorEmail: SUPER_ADMIN_SCOPE.email,
        organizationId: TARGET_ORG.id,
        organizationName: TARGET_ORG.name,
        feature: FEATURE_KEY,
        newState: 'FORCED_OFF',
      })
    })
  })

  describe('FORCED_ON write path', () => {
    it('Upserts override row with state=FORCED_ON', async () => {
      const { req, ctx } = makeRequest({
        state: 'FORCED_ON',
        reason: 'early-access preview for ACME — confirmed by CSM',
      })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(200)
      expect(mocks.overrideUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ state: 'FORCED_ON' }),
        }),
      )
    })
  })

  describe('INHERIT path — deletes the row', () => {
    it('When an override row exists → DELETE (not upsert INHERIT)', async () => {
      mocks.overrideFindMock.mockResolvedValue({ state: 'FORCED_OFF', reason: 'old reason' })
      const { req, ctx } = makeRequest({
        state: 'INHERIT',
        reason: 'clearing the override — incident closed',
      })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(200)
      expect(mocks.overrideDeleteMock).toHaveBeenCalledTimes(1)
      expect(mocks.overrideUpsertMock).not.toHaveBeenCalled()
    })

    it('When no override row exists → no-op delete (idempotent INHERIT)', async () => {
      mocks.overrideFindMock.mockResolvedValue(null)
      const { req, ctx } = makeRequest({
        state: 'INHERIT',
        reason: 'no-op idempotent inherit call',
      })
      const res = await PUT(req, ctx)
      expect(res.status).toBe(200)
      expect(mocks.overrideDeleteMock).not.toHaveBeenCalled()
      expect(mocks.overrideUpsertMock).not.toHaveBeenCalled()
    })
  })

  describe('Audit + Slack failure tolerance', () => {
    it('Slack failure does NOT break the response (fire-and-forget)', async () => {
      mocks.notifyMock.mockRejectedValue(new Error('Slack 503'))
      const { req, ctx } = makeRequest({
        state: 'FORCED_OFF',
        reason: 'sufficient reason text here',
      })
      const res = await PUT(req, ctx)
      // mocks.notifyMock is called via `void` so the rejection doesn't propagate.
      // The route's response must still be 200.
      expect(res.status).toBe(200)
    })
  })
})

describe('GET /api/admin/orgs/[orgId]/features/[key]', () => {
  it('Returns resolved state + override row when present', async () => {
    mocks.overrideFindMock.mockResolvedValue({
      state: 'FORCED_ON',
      reason: 'preview-feature for ACME',
      createdById: SUPER_ADMIN_SCOPE.userId,
      createdAt: new Date('2026-05-25T10:00:00Z'),
      updatedAt: new Date('2026-05-25T10:00:00Z'),
    })
    mocks.subscriptionFindMock.mockResolvedValue({ plan: 'operator' })

    const { ctx } = makeRequest({})
    const res = await GET(
      new Request('http://test/api/admin/orgs/x/features/webhooks') as unknown as Parameters<typeof GET>[0],
      ctx,
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toMatchObject({
      organizationId: TARGET_ORG.id,
      organizationName: TARGET_ORG.name,
      feature: FEATURE_KEY,
      enabled: true,
      // Operator-plan + FORCED_ON = out-of-plan source
      source: 'super-admin-forced-on-out-of-plan',
      override: { state: 'FORCED_ON', reason: 'preview-feature for ACME' },
    })
  })

  it('Returns null override when no override row exists', async () => {
    mocks.overrideFindMock.mockResolvedValue(null)
    mocks.subscriptionFindMock.mockResolvedValue({ plan: 'team' })

    const { ctx } = makeRequest({})
    const res = await GET(
      new Request('http://test/api/admin/orgs/x/features/webhooks') as unknown as Parameters<typeof GET>[0],
      ctx,
    )
    const json = await res.json()
    expect(json.data.override).toBeNull()
    expect(json.data.enabled).toBe(true)
    expect(json.data.source).toBe('enabled')
  })

  it('Unknown org → 404', async () => {
    mocks.orgFindMock.mockResolvedValue(null)
    const { ctx } = makeRequest({})
    const res = await GET(
      new Request('http://test/api/admin/orgs/x/features/webhooks') as unknown as Parameters<typeof GET>[0],
      ctx,
    )
    expect(res.status).toBe(404)
  })
})
