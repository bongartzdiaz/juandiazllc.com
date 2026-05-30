import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// Mutable state the mocks close over (hoisted so vi.mock factories can
// reference it). Each test sets `h.user` (the Supabase session user) and
// `h.prisma` (the fake auth Prisma client) before calling the helper.
const h = vi.hoisted(() => ({
  user: null as { email: string | null; app_metadata?: Record<string, unknown> } | null,
  prisma: {} as Record<string, unknown>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: h.user } }),
      updateUser: async () => ({ data: {}, error: null }),
    },
  }),
}))

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => h.prisma,
}))

// Imported AFTER the mocks are registered.
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'

type FakeUser = {
  id: string
  email: string
  role: string
  organizationId: string | null
  deletedAt: Date | null
}

/** Build a fake Prisma auth client. `existing` = the row returned by
 *  user.findUnique (null = unknown email). `userCount` drives the
 *  auto-provision branch. Records created rows for assertions. */
function fakePrisma(opts: { existing?: FakeUser | null; userCount?: number }) {
  const created: Record<string, unknown>[] = []
  return {
    _created: created,
    user: {
      findUnique: vi.fn(async () => opts.existing ?? null),
      count: vi.fn(async () => opts.userCount ?? 0),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'new-user', email: data.email, role: data.role, organizationId: data.organizationId }
        created.push(row)
        return row
      }),
    },
    organization: {
      findFirst: vi.fn(async () => ({ id: 'org-1' })),
      create: vi.fn(async () => ({ id: 'org-1' })),
    },
  }
}

const status = (r: AuthResult) => (r as NextResponse).status
type AuthResult = Awaited<ReturnType<typeof requireScope>>

beforeEach(() => {
  delete process.env.ALLOW_AUTOPROVISION
  h.user = null
  h.prisma = {}
})

describe('requireScope — authentication', () => {
  it('returns 401 when there is no Supabase session', async () => {
    h.user = null
    const r = await requireScope()
    expect(r).toBeInstanceOf(NextResponse)
    expect(status(r)).toBe(401)
  })

  it('returns 401 when the session has no email', async () => {
    h.user = { email: null }
    const r = await requireScope()
    expect(status(r)).toBe(401)
  })

  it('returns the scope for an existing active user', async () => {
    h.user = { email: 'a@x.com', app_metadata: { role: 'admin' } }
    h.prisma = fakePrisma({
      existing: { id: 'u1', email: 'a@x.com', role: 'admin', organizationId: 'org-1', deletedAt: null },
    })
    const r = await requireScope()
    expect(r).not.toBeInstanceOf(NextResponse)
    expect(r).toMatchObject({ userId: 'u1', organizationId: 'org-1', role: 'admin', email: 'a@x.com' })
  })

  it('returns 410 for a soft-deleted user (no resurrection)', async () => {
    h.user = { email: 'gone@x.com' }
    h.prisma = fakePrisma({
      existing: { id: 'u2', email: 'gone@x.com', role: 'viewer', organizationId: 'org-1', deletedAt: new Date() },
    })
    const r = await requireScope()
    expect(status(r)).toBe(410)
  })
})

describe('requireScope — auto-provision deny-by-default (A-01)', () => {
  it('DENIES an unknown email with 403 when other users already exist', async () => {
    h.user = { email: 'attacker@evil.com' }
    const prisma = fakePrisma({ existing: null, userCount: 5 })
    h.prisma = prisma
    const r = await requireScope()
    expect(status(r)).toBe(403)
    // Critically: no user row was created — no silent tenant join.
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('bootstraps the FIRST user as admin (userCount === 0)', async () => {
    h.user = { email: 'founder@x.com' }
    const prisma = fakePrisma({ existing: null, userCount: 0 })
    h.prisma = prisma
    const r = await requireScope()
    expect(r).not.toBeInstanceOf(NextResponse)
    expect(r).toMatchObject({ role: 'admin', organizationId: 'org-1' })
    expect(prisma.user.create).toHaveBeenCalledTimes(1)
  })

  it('restores auto-join only when ALLOW_AUTOPROVISION=1 (opt-in)', async () => {
    process.env.ALLOW_AUTOPROVISION = '1'
    h.user = { email: 'newhire@x.com' }
    const prisma = fakePrisma({ existing: null, userCount: 5 })
    h.prisma = prisma
    const r = await requireScope()
    expect(r).not.toBeInstanceOf(NextResponse)
    expect(r).toMatchObject({ role: 'viewer', organizationId: 'org-1' })
  })
})

describe('requireRole — role enforcement', () => {
  it('returns 403 when the user role is not in the allowed list', async () => {
    h.user = { email: 'v@x.com', app_metadata: { role: 'viewer' } }
    h.prisma = fakePrisma({
      existing: { id: 'u3', email: 'v@x.com', role: 'viewer', organizationId: 'org-1', deletedAt: null },
    })
    const r = await requireRole(['admin'])
    expect(status(r)).toBe(403)
  })

  it('returns the scope when the role is allowed', async () => {
    h.user = { email: 'm@x.com', app_metadata: { role: 'manager' } }
    h.prisma = fakePrisma({
      existing: { id: 'u4', email: 'm@x.com', role: 'manager', organizationId: 'org-1', deletedAt: null },
    })
    const r = await requireRole(['admin', 'manager'])
    expect(r).not.toBeInstanceOf(NextResponse)
    expect(r).toMatchObject({ role: 'manager' })
  })

  it('propagates 401 from requireScope when unauthenticated', async () => {
    h.user = null
    const r = await requireRole(['admin'])
    expect(status(r)).toBe(401)
  })
})
