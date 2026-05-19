/* ---------------------------------------------------------------
   Cross-org isolation — HERMETIC route-layer suite.
   ---------------------------------------------------------------
   Companion to cross-org.integration.test.ts. That suite hits a
   real MariaDB and proves the full stack (Prisma → DB) maintains
   isolation; this one is faster (~20ms), runs in regular `npm
   test` with no Docker, and proves that the API route handlers
   themselves pass `organizationId` to Prisma.

   Why both:
     - The integration suite catches an isolation hole only if the
       DB layer actually leaks (e.g., a missing index, an RLS gap
       that wouldn't apply here since we run MariaDB not Postgres-RLS).
     - This hermetic suite catches the much more common regression:
       a refactor that drops `organizationId: scope.organizationId`
       from a Prisma where clause. The route still typechecks, the
       integration test still passes because the bug is silent
       under the test fixtures, but production loses isolation
       under the right combination of org-A and org-B IDs.

   What we mock:
     - `@/lib/philly/auth` (getAuthPrisma)        — stub Prisma client
     - `@/lib/philly/auth-helpers` (requireSection) — return scope by name
     - `@/lib/philly/audit` (logAudit, diffChanges) — no-op
     - `@/lib/philly/realtime/publish`             — no-op
     - `@/lib/philly/rate-limit` (enforceRateLimit) — always allow
     - `@/lib/philly/validation` (validateBody)     — pass-through

   What we DON'T mock:
     - `@/lib/philly/pii` (encryptPii, decryptPii) — real implementation
     - `@/lib/philly/blind-index` (hashEmail/hashPhone)
     - The route handlers themselves
     - NextResponse / NextRequest

   Hardcoded path matches what scripts/audit-tenant-isolation.ts's
   block-comment references as integration backing. The audit
   script does static analysis; this suite is the runtime gauge.
   --------------------------------------------------------------- */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock state — two orgs with their own contacts + projects ──

interface Contact {
  id: string
  organizationId: string
  name: string
  email: string
  emailHash: string | null
  phone: string
  phoneHash: string | null
  type: string
  company: string
  notes: string
  avatarUrl: string | null
  createdAt: Date
  // Required minimal subset of Contact fields for the route's response
  leadScore: number
  leadSource: string
  leadStatus: string
  preferredMethod: string
  preApproved: boolean
  preApprovalAmt: number
}

const orgA = { id: 'org-aaa', slug: 'org-a' }
const orgB = { id: 'org-bbb', slug: 'org-b' }

function makeContact(overrides: Partial<Contact> & Pick<Contact, 'id' | 'organizationId'>): Contact {
  return {
    name: 'Default',
    email: '',
    emailHash: null,
    phone: '',
    phoneHash: null,
    type: 'stakeholder',
    company: '',
    notes: '',
    avatarUrl: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    leadScore: 0,
    leadSource: '',
    leadStatus: 'new',
    preferredMethod: 'email',
    preApproved: false,
    preApprovalAmt: 0,
    ...overrides,
  }
}

const contactsState: Contact[] = []

// Active scope — mutated per-test to simulate org-A vs org-B requests.
const scopeState = {
  active: 'a' as 'a' | 'b' | 'none',
  role: 'admin' as 'admin' | 'manager' | 'viewer',
}

function activeScope() {
  if (scopeState.active === 'none') {
    throw new Error('test bug: scopeState.active not set')
  }
  const org = scopeState.active === 'a' ? orgA : orgB
  return {
    userId: scopeState.active === 'a' ? 'user-a' : 'user-b',
    organizationId: org.id,
    role: scopeState.role,
    dashboardSections: null,
  }
}

// ── vi.mock the modules the route handler imports ──

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    contact: {
      findFirst: async (args: { where: { id?: string; organizationId?: string } }) => {
        const { id, organizationId } = args.where
        const found = contactsState.find(
          (c) => c.id === id && c.organizationId === organizationId,
        )
        if (!found) return null
        // Shape includes the relation expected by the route's `include`.
        return { ...found, contactProjects: [] }
      },
      findMany: async (args: { where: { organizationId: string } }) => {
        return contactsState.filter((c) => c.organizationId === args.where.organizationId)
      },
      count: async (args: { where: { organizationId: string } }) => {
        return contactsState.filter((c) => c.organizationId === args.where.organizationId).length
      },
      update: async (args: { where: { id: string; organizationId?: string }; data: Partial<Contact> }) => {
        const { id, organizationId } = args.where
        const idx = contactsState.findIndex(
          (c) => c.id === id && (organizationId ? c.organizationId === organizationId : true),
        )
        if (idx === -1) {
          // Mirror Prisma's NotFoundError: throw with code P2025
          const err: Error & { code?: string } = new Error('Record not found')
          err.code = 'P2025'
          throw err
        }
        contactsState[idx] = { ...contactsState[idx], ...args.data }
        return contactsState[idx]
      },
      delete: async (args: { where: { id: string; organizationId?: string } }) => {
        const { id, organizationId } = args.where
        const idx = contactsState.findIndex(
          (c) => c.id === id && (organizationId ? c.organizationId === organizationId : true),
        )
        if (idx === -1) {
          const err: Error & { code?: string } = new Error('Record not found')
          err.code = 'P2025'
          throw err
        }
        const [removed] = contactsState.splice(idx, 1)
        return removed
      },
      deleteMany: async (args: { where: { id: string; organizationId?: string } }) => {
        // PATCH path uses updateMany / deleteMany with org-scoped where.
        const before = contactsState.length
        const { id, organizationId } = args.where
        const remaining = contactsState.filter(
          (c) => !(c.id === id && c.organizationId === organizationId),
        )
        const deleted = before - remaining.length
        contactsState.length = 0
        contactsState.push(...remaining)
        return { count: deleted }
      },
    },
  }),
}))

vi.mock('@/lib/philly/auth-helpers', () => ({
  requireSection: async () => activeScope(),
  jsonError: (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json' } }),
}))

vi.mock('@/lib/philly/audit', () => ({
  logAudit: async () => {},
  diffChanges: () => ({}),
}))

vi.mock('@/lib/philly/realtime/publish', () => ({
  publishEntityCreated: async () => {},
  publishEntityUpdated: async () => {},
  publishEntityDeleted: async () => {},
}))

vi.mock('@/lib/philly/rate-limit', () => ({
  enforceRateLimit: () => null, // always allow in tests
  PRESET_MUTATION: { capacity: 100, refillPerSec: 100 },
  PRESET_AUTH: { capacity: 100, refillPerSec: 100 },
}))

vi.mock('@/lib/philly/validation', () => ({
  validateBody: async (req: Request) => {
    const body = await req.json().catch(() => ({}))
    // Route expects `{ success: true, data }` on success and
    // `{ success: false, response }` on failure (mirrors zod-safeParse + Response shape).
    return { success: true as const, data: body }
  },
}))

vi.mock('@/lib/philly/ai/contact-attributes', () => ({
  runAndPersistContactAttributes: async () => {},
}))

vi.mock('@/lib/philly/features', () => ({
  isFeatureEnabled: async () => false,
  FEATURES: {},
}))

vi.mock('@/lib/philly/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}))

// Now safe to import the route handlers.
import { GET, PATCH, DELETE } from '@/app/api/contacts/[id]/route'
import { GET as LIST_GET } from '@/app/api/contacts/route'

// ── Test fixtures ──

beforeEach(() => {
  // Reset state between tests.
  contactsState.length = 0
  contactsState.push(
    makeContact({ id: 'contact-a1', organizationId: orgA.id, name: "Org-A's Contact 1" }),
    makeContact({ id: 'contact-a2', organizationId: orgA.id, name: "Org-A's Contact 2" }),
    makeContact({ id: 'contact-b1', organizationId: orgB.id, name: "Org-B's Contact 1" }),
    makeContact({ id: 'contact-b2', organizationId: orgB.id, name: "Org-B's Contact 2" }),
  )
  scopeState.active = 'a'
  scopeState.role = 'admin'
})

function makeReq(url: string, init: RequestInit = {}): NextRequest {
  return new NextRequest(new Request(`http://localhost${url}`, init))
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ── The actual tests ──

describe('cross-org isolation — runtime / route-handler layer', () => {
  describe('GET /api/contacts/[id]', () => {
    it("org-A scope cannot read org-B's contact — returns 404", async () => {
      scopeState.active = 'a'
      const res = await GET(makeReq('/api/contacts/contact-b1'), makeCtx('contact-b1'))
      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBe('Contact not found')
    })

    it("org-A scope CAN read org-A's contact — returns 200", async () => {
      scopeState.active = 'a'
      const res = await GET(makeReq('/api/contacts/contact-a1'), makeCtx('contact-a1'))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.id).toBe('contact-a1')
      expect(body.data.organizationId).toBe(orgA.id)
    })

    it("org-B scope cannot read org-A's contact — returns 404", async () => {
      scopeState.active = 'b'
      const res = await GET(makeReq('/api/contacts/contact-a1'), makeCtx('contact-a1'))
      expect(res.status).toBe(404)
    })

    it('admin role does NOT bypass org scope', async () => {
      // Even with admin role on org-A, cross-org access stays blocked.
      scopeState.active = 'a'
      scopeState.role = 'admin'
      const res = await GET(makeReq('/api/contacts/contact-b1'), makeCtx('contact-b1'))
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/contacts (list)', () => {
    it("org-A scope's list returns only org-A's contacts", async () => {
      scopeState.active = 'a'
      const res = await LIST_GET(makeReq('/api/contacts?page=1&limit=20'))
      expect(res.status).toBe(200)
      const body = await res.json()
      const returnedOrgIds = new Set(
        (body.data as Array<{ organizationId: string }>).map((c) => c.organizationId),
      )
      expect(returnedOrgIds.size).toBe(1)
      expect(returnedOrgIds.has(orgA.id)).toBe(true)
      expect(returnedOrgIds.has(orgB.id)).toBe(false)
      expect(body.data.length).toBe(2) // 2 org-A contacts
    })

    it("org-B scope's list returns only org-B's contacts", async () => {
      scopeState.active = 'b'
      const res = await LIST_GET(makeReq('/api/contacts?page=1&limit=20'))
      expect(res.status).toBe(200)
      const body = await res.json()
      const returnedOrgIds = new Set(
        (body.data as Array<{ organizationId: string }>).map((c) => c.organizationId),
      )
      expect(returnedOrgIds.size).toBe(1)
      expect(returnedOrgIds.has(orgB.id)).toBe(true)
      expect(returnedOrgIds.has(orgA.id)).toBe(false)
    })

    it('total count is per-org, not global', async () => {
      scopeState.active = 'a'
      const res = await LIST_GET(makeReq('/api/contacts?page=1&limit=20'))
      const body = await res.json()
      // Paginated response includes pagination metadata.
      expect(body.pagination?.total ?? body.data.length).toBe(2)
    })
  })

  describe('PATCH /api/contacts/[id]', () => {
    it("org-A scope cannot patch org-B's contact — returns 404", async () => {
      scopeState.active = 'a'
      const res = await PATCH(
        makeReq('/api/contacts/contact-b1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Hacked Name' }),
          headers: { 'content-type': 'application/json' },
        }),
        makeCtx('contact-b1'),
      )
      expect(res.status).toBe(404)
      // Confirm the row was NOT updated despite the attempt.
      const target = contactsState.find((c) => c.id === 'contact-b1')
      expect(target?.name).toBe("Org-B's Contact 1")
    })

    it("org-A admin can patch org-A's own contact", async () => {
      scopeState.active = 'a'
      scopeState.role = 'admin'
      const res = await PATCH(
        makeReq('/api/contacts/contact-a1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated By Org-A' }),
          headers: { 'content-type': 'application/json' },
        }),
        makeCtx('contact-a1'),
      )
      expect(res.status).toBe(200)
    })
  })

  describe('DELETE /api/contacts/[id]', () => {
    it("org-A scope cannot delete org-B's contact — returns 404", async () => {
      scopeState.active = 'a'
      const res = await DELETE(makeReq('/api/contacts/contact-b1', { method: 'DELETE' }), makeCtx('contact-b1'))
      expect(res.status).toBe(404)
      // Confirm the row STILL exists.
      expect(contactsState.find((c) => c.id === 'contact-b1')).toBeDefined()
    })

    it("org-A admin CAN delete org-A's own contact", async () => {
      scopeState.active = 'a'
      scopeState.role = 'admin'
      const beforeCount = contactsState.length
      const res = await DELETE(makeReq('/api/contacts/contact-a1', { method: 'DELETE' }), makeCtx('contact-a1'))
      expect([200, 204]).toContain(res.status)
      expect(contactsState.length).toBe(beforeCount - 1)
      expect(contactsState.find((c) => c.id === 'contact-a1')).toBeUndefined()
    })
  })
})
