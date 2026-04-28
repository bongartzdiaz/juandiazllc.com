import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE importing the module under test so auth-helpers
// picks up the fakes. vi.mock() is hoisted to the top of the file by
// Vitest's transform, so this runs before the `import` on line 15.
const supabaseState = { email: null as string | null }
const cookieState = { activeOrg: null as string | null }
const prismaState = {
  existingUsers: [] as Array<{
    id: string; email: string; role: string; organizationId: string | null;
    dashboardSections?: unknown
    twoFactorEnabled?: boolean
    twoFactorSecret?: string | null
  }>,
  orgs: [] as Array<{ id: string; slug: string }>,
  userCreateCalls: [] as Array<{ email: string; role: string }>,
  // Bundle G — Membership rows. Keyed by (userId, organizationId).
  memberships: [] as Array<{
    userId: string; organizationId: string; role: string;
    dashboardSections?: unknown
  }>,
}

// Bundle G — requireScope reads next/headers cookies to resolve
// active org. Mock cookies() to return whatever cookieState.activeOrg
// is set to.
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'philly-active-org' && cookieState.activeOrg) {
        return { value: cookieState.activeOrg }
      }
      return undefined
    },
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: supabaseState.email
            ? { id: `sb_${supabaseState.email}`, email: supabaseState.email, app_metadata: {} }
            : null,
        },
      }),
      updateUser: async () => ({}),
    },
  }),
}))

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    user: {
      findUnique: async ({ where }: { where: { email: string } }) =>
        prismaState.existingUsers.find(u => u.email === where.email) ?? null,
      count: async () => prismaState.existingUsers.length,
      create: async ({ data }: { data: { email: string; role: string; organizationId: string } }) => {
        prismaState.userCreateCalls.push({ email: data.email, role: data.role })
        const row = {
          id: `user_${prismaState.existingUsers.length + 1}`,
          email: data.email,
          role: data.role,
          organizationId: data.organizationId,
        }
        prismaState.existingUsers.push(row)
        return row
      },
    },
    organization: {
      findFirst: async () => prismaState.orgs[0] ?? null,
      create: async ({ data }: { data: { name: string; slug: string } }) => {
        const row = { id: `org_${prismaState.orgs.length + 1}`, slug: data.slug }
        prismaState.orgs.push(row)
        return row
      },
    },
    membership: {
      findUnique: async ({ where }: { where: { userId_organizationId: { userId: string; organizationId: string } } }) => {
        const m = prismaState.memberships.find(
          (row) =>
            row.userId === where.userId_organizationId.userId &&
            row.organizationId === where.userId_organizationId.organizationId,
        )
        return m ?? null
      },
    },
  }),
}))

import { jsonError, requireScope, requireRole, requireSection, requireSupabaseUser } from './auth-helpers'
import { NextResponse } from 'next/server'

function reset() {
  supabaseState.email = null
  cookieState.activeOrg = null
  prismaState.memberships = []
  prismaState.existingUsers = []
  prismaState.orgs = []
  prismaState.userCreateCalls = []
}

async function readBody(res: NextResponse) {
  return JSON.parse(await res.text()) as { error?: string }
}

describe('jsonError', () => {
  it('returns a NextResponse with the given status + message', async () => {
    const res = jsonError('Nope', 418)
    expect(res).toBeInstanceOf(NextResponse)
    expect(res.status).toBe(418)
    const body = await readBody(res)
    expect(body.error).toBe('Nope')
  })
})

describe('requireScope', () => {
  beforeEach(reset)

  it('returns 401 when supabase session has no email', async () => {
    const result = await requireScope()
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
      expect((await readBody(result)).error).toBe('Unauthorized')
    }
  })

  it('returns 409 NEEDS_ONBOARDING when the Supabase user has no Philly row', async () => {
    supabaseState.email = 'newcomer@example.com'
    const result = await requireScope()

    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(409)
      const body = JSON.parse(await result.text()) as { error?: string; code?: string }
      expect(body.code).toBe('NEEDS_ONBOARDING')
    }
    // No auto-provisioning — that would defeat tenant isolation.
    expect(prismaState.userCreateCalls).toHaveLength(0)
    expect(prismaState.orgs).toHaveLength(0)
  })

  it('does not auto-create users into an existing organization', async () => {
    prismaState.orgs = [{ id: 'org_existing', slug: 'acme' }]
    prismaState.existingUsers = [
      { id: 'user_1', email: 'juan@example.com', role: 'admin', organizationId: 'org_existing' },
    ]
    supabaseState.email = 'stranger@example.com'

    const result = await requireScope()
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(409)
    }
    // Stranger never gets a row in someone else's org.
    expect(prismaState.userCreateCalls).toHaveLength(0)
  })

  it('returns 403 when the resolved user has no organizationId', async () => {
    prismaState.existingUsers = [
      { id: 'orphan_1', email: 'orphan@example.com', role: 'admin', organizationId: null },
    ]
    supabaseState.email = 'orphan@example.com'

    const result = await requireScope()
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
      expect((await readBody(result)).error).toBe('User has no organization scope')
    }
  })

  it('returns the existing user without creating a new one on repeat visits', async () => {
    prismaState.orgs = [{ id: 'org_existing', slug: 'volitfy' }]
    prismaState.existingUsers = [
      { id: 'user_1', email: 'juan@example.com', role: 'manager', organizationId: 'org_existing' },
    ]
    supabaseState.email = 'juan@example.com'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)

    expect(result.userId).toBe('user_1')
    expect(result.role).toBe('manager')
    expect(prismaState.userCreateCalls).toHaveLength(0)
  })
})

describe('requireRole', () => {
  beforeEach(reset)

  it('passes through when the user role is allowed', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [
      { id: 'user_1', email: 'manager@example.com', role: 'manager', organizationId: 'org_1' },
    ]
    supabaseState.email = 'manager@example.com'

    const result = await requireRole(['admin', 'manager'])
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.role).toBe('manager')
  })

  it('returns 403 when the user role is not in the allowed list', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [
      { id: 'user_1', email: 'viewer@example.com', role: 'viewer', organizationId: 'org_1' },
    ]
    supabaseState.email = 'viewer@example.com'

    const result = await requireRole(['admin', 'manager'])
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
      expect((await readBody(result)).error).toBe('Forbidden')
    }
  })

  it('propagates the 401 from requireScope when the user is unauthenticated', async () => {
    const result = await requireRole(['admin'])
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(401)
    }
  })
})

describe('requireSection', () => {
  beforeEach(reset)

  it('returns the scope when the user has that section in their allow-list', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'viewer@example.com', role: 'viewer',
      organizationId: 'org_1', dashboardSections: ['dashboard', 'deals'],
    }]
    supabaseState.email = 'viewer@example.com'

    const result = await requireSection('deals')
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.role).toBe('viewer')
    expect(result.dashboardSections).toEqual(['dashboard', 'deals'])
  })

  it('returns 403 when the section is not in the allow-list', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'viewer@example.com', role: 'viewer',
      organizationId: 'org_1', dashboardSections: ['dashboard'],
    }]
    supabaseState.email = 'viewer@example.com'

    const result = await requireSection('deals')
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(403)
      expect((await readBody(result)).error).toBe('Forbidden')
    }
  })

  it('always allows admins regardless of their allow-list', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: ['dashboard'],
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireSection('settings')
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.role).toBe('admin')
  })

  it('treats dashboardSections === null as full access (legacy users)', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'legacy@example.com', role: 'viewer',
      organizationId: 'org_1', dashboardSections: null,
    }]
    supabaseState.email = 'legacy@example.com'

    const result = await requireSection('deals')
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.dashboardSections).toBeNull()
  })

  it('fails closed on unknown slugs even for admins', async () => {
    prismaState.orgs = [{ id: 'org_1', slug: 'volitfy' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireSection('this-slug-does-not-exist')
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) expect(result.status).toBe(403)
  })
})

describe('mandatory admin 2FA enforcement', () => {
  beforeEach(() => {
    reset()
    delete process.env.ADMIN_MFA_ENFORCED
  })

  it('admin without 2FA + enforcement ON returns 409 NEEDS_2FA from requireRole(["admin"])', async () => {
    process.env.ADMIN_MFA_ENFORCED = 'true'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: false, twoFactorSecret: null,
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireRole(['admin'])
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(409)
      const body = JSON.parse(await result.text()) as { code?: string }
      expect(body.code).toBe('NEEDS_2FA')
    }
  })

  it('admin WITH 2FA + enforcement ON passes through requireRole(["admin"])', async () => {
    process.env.ADMIN_MFA_ENFORCED = 'true'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: true, twoFactorSecret: 'enc.iv.tag',
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireRole(['admin'])
    if (result instanceof NextResponse) {
      throw new Error(`expected scope, got ${result.status}`)
    }
    expect(result.role).toBe('admin')
    expect(result.mfaEnrolled).toBe(true)
  })

  it('admin without 2FA + enforcement OFF passes through (dev convenience)', async () => {
    process.env.ADMIN_MFA_ENFORCED = 'false'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: false, twoFactorSecret: null,
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireRole(['admin'])
    if (result instanceof NextResponse) {
      throw new Error(`expected scope, got ${result.status}`)
    }
    expect(result.mfaEnrolled).toBe(false)
  })

  it('manager without 2FA passes through unconditionally — only admins are gated', async () => {
    process.env.ADMIN_MFA_ENFORCED = 'true'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'manager@example.com', role: 'manager',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: false, twoFactorSecret: null,
    }]
    supabaseState.email = 'manager@example.com'

    const result = await requireRole(['admin', 'manager'])
    if (result instanceof NextResponse) {
      throw new Error(`expected scope, got ${result.status}`)
    }
    expect(result.role).toBe('manager')
  })

  it('mfaEnrolled is false when twoFactorEnabled is true but secret is missing', async () => {
    // Defensive: a flipped flag without a secret would let an admin
    // bypass enrollment. Treat both as required.
    process.env.ADMIN_MFA_ENFORCED = 'true'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: true, twoFactorSecret: null,
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireRole(['admin'])
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(409)
    }
  })

  it('admin-only requireSection enforces 2FA the same way', async () => {
    process.env.ADMIN_MFA_ENFORCED = 'true'
    prismaState.orgs = [{ id: 'org_1', slug: 'acme' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'admin@example.com', role: 'admin',
      organizationId: 'org_1', dashboardSections: null,
      twoFactorEnabled: false, twoFactorSecret: null,
    }]
    supabaseState.email = 'admin@example.com'

    const result = await requireSection('settings', ['admin'])
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) {
      expect(result.status).toBe(409)
      const body = JSON.parse(await result.text()) as { code?: string }
      expect(body.code).toBe('NEEDS_2FA')
    }
  })
})

describe('requireSupabaseUser', () => {
  beforeEach(reset)

  it('returns the supabase identity without requiring a Philly row', async () => {
    supabaseState.email = 'newcomer@example.com'
    // Crucially: no Philly user provisioned.
    const result = await requireSupabaseUser()
    if (result instanceof NextResponse) throw new Error(`expected subject, got ${result.status}`)
    expect(result.email).toBe('newcomer@example.com')
    expect(result.supabaseUserId).toBe('sb_newcomer@example.com')
  })

  it('returns 401 when there is no Supabase session', async () => {
    const result = await requireSupabaseUser()
    expect(result).toBeInstanceOf(NextResponse)
    if (result instanceof NextResponse) expect(result.status).toBe(401)
  })
})

describe('multi-org active-org resolution (Bundle G)', () => {
  beforeEach(reset)

  it('falls back to home org when no cookie is set', async () => {
    prismaState.orgs = [{ id: 'org_home', slug: 'home' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'jane@example.com', role: 'admin',
      organizationId: 'org_home', dashboardSections: null,
    }]
    supabaseState.email = 'jane@example.com'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.organizationId).toBe('org_home')
    expect(result.role).toBe('admin')
  })

  it('returns the cookie-named org when the user has a membership in it', async () => {
    prismaState.orgs = [
      { id: 'org_home', slug: 'home' },
      { id: 'org_other', slug: 'other' },
    ]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'jane@example.com', role: 'admin',
      organizationId: 'org_home', dashboardSections: null,
    }]
    prismaState.memberships = [
      { userId: 'user_1', organizationId: 'org_other', role: 'manager', dashboardSections: null },
    ]
    supabaseState.email = 'jane@example.com'
    cookieState.activeOrg = 'org_other'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.organizationId).toBe('org_other')
    // Role comes from the Membership, not from the User row
    expect(result.role).toBe('manager')
  })

  it('falls back to home org silently when cookie points at an org without a membership', async () => {
    // The cookie could be stale (user was removed) or forged (script).
    // Either way: do not return that org. Resolve to home.
    prismaState.orgs = [
      { id: 'org_home', slug: 'home' },
      { id: 'org_other', slug: 'other' },
    ]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'jane@example.com', role: 'admin',
      organizationId: 'org_home', dashboardSections: null,
    }]
    // No membership row for user_1 in org_other
    supabaseState.email = 'jane@example.com'
    cookieState.activeOrg = 'org_other'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.organizationId).toBe('org_home')
    expect(result.role).toBe('admin')
  })

  it('cookie equal to home org id is a no-op (skips the lookup)', async () => {
    prismaState.orgs = [{ id: 'org_home', slug: 'home' }]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'jane@example.com', role: 'admin',
      organizationId: 'org_home', dashboardSections: null,
    }]
    // No membership row at all — but the cookie matches home, so the
    // resolver shouldn't query memberships.
    supabaseState.email = 'jane@example.com'
    cookieState.activeOrg = 'org_home'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.organizationId).toBe('org_home')
  })

  it('per-org membership dashboardSections override the home-org sections', async () => {
    prismaState.orgs = [
      { id: 'org_home', slug: 'home' },
      { id: 'org_other', slug: 'other' },
    ]
    prismaState.existingUsers = [{
      id: 'user_1', email: 'jane@example.com', role: 'admin',
      organizationId: 'org_home',
      dashboardSections: ['dashboard', 'contacts', 'deals'],
    }]
    prismaState.memberships = [{
      userId: 'user_1', organizationId: 'org_other', role: 'viewer',
      dashboardSections: ['dashboard'],
    }]
    supabaseState.email = 'jane@example.com'
    cookieState.activeOrg = 'org_other'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.dashboardSections).toEqual(['dashboard'])
    expect(result.role).toBe('viewer')
  })
})
