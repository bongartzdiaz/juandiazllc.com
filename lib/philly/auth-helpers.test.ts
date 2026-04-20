import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE importing the module under test so auth-helpers
// picks up the fakes. vi.mock() is hoisted to the top of the file by
// Vitest's transform, so this runs before the `import` on line 15.
const supabaseState = { email: null as string | null }
const prismaState = {
  existingUsers: [] as Array<{ id: string; email: string; role: string; organizationId: string | null }>,
  orgs: [] as Array<{ id: string; slug: string }>,
  userCreateCalls: [] as Array<{ email: string; role: string }>,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: supabaseState.email
            ? { email: supabaseState.email, app_metadata: {} }
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
  }),
}))

import { jsonError, requireScope, requireRole } from './auth-helpers'
import { NextResponse } from 'next/server'

function reset() {
  supabaseState.email = null
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

  it('auto-provisions the first user as admin in a new Volitfy org', async () => {
    supabaseState.email = 'juan@example.com'
    const result = await requireScope()

    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)
    expect(result.email).toBe('juan@example.com')
    expect(result.role).toBe('admin')
    expect(prismaState.orgs).toHaveLength(1)
    expect(prismaState.orgs[0].slug).toBe('volitfy')
    expect(prismaState.userCreateCalls).toEqual([{ email: 'juan@example.com', role: 'admin' }])
  })

  it('auto-provisions the second user as viewer in the existing org', async () => {
    prismaState.orgs = [{ id: 'org_existing', slug: 'volitfy' }]
    prismaState.existingUsers = [
      { id: 'user_1', email: 'juan@example.com', role: 'admin', organizationId: 'org_existing' },
    ]
    supabaseState.email = 'newcomer@example.com'

    const result = await requireScope()
    if (result instanceof NextResponse) throw new Error(`expected scope, got ${result.status}`)

    expect(result.role).toBe('viewer')
    expect(result.organizationId).toBe('org_existing')
    expect(prismaState.userCreateCalls).toEqual([{ email: 'newcomer@example.com', role: 'viewer' }])
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
