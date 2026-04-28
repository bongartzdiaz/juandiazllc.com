import { describe, it, expect } from 'vitest'
import { removeMembership, type RemovalPrisma } from './remove'

interface UserRow {
  id: string
  email: string | null
  organizationId: string
}
interface MembershipRow {
  id: string
  userId: string
  organizationId: string
  role: string
}

function makePrisma(initial: { users?: UserRow[]; memberships?: MembershipRow[] } = {}): {
  prisma: RemovalPrisma
  state: { users: UserRow[]; memberships: MembershipRow[] }
} {
  const users = [...(initial.users ?? [])]
  const memberships = [...(initial.memberships ?? [])]

  const prisma: RemovalPrisma = {
    user: {
      findUnique: async ({ where }) => {
        const u = users.find((row) => row.id === where.id)
        return u ? { id: u.id, email: u.email, organizationId: u.organizationId } : null
      },
    },
    membership: {
      findUnique: async ({ where }) => {
        const m = memberships.find(
          (row) =>
            row.userId === where.userId_organizationId.userId &&
            row.organizationId === where.userId_organizationId.organizationId,
        )
        return m ? { id: m.id, role: m.role } : null
      },
      count: async ({ where }) =>
        memberships.filter(
          (row) => row.organizationId === where.organizationId && row.role === where.role,
        ).length,
      delete: async ({ where }) => {
        const idx = memberships.findIndex(
          (row) =>
            row.userId === where.userId_organizationId.userId &&
            row.organizationId === where.userId_organizationId.organizationId,
        )
        if (idx >= 0) memberships.splice(idx, 1)
        return {}
      },
    },
  }
  return { prisma, state: { users, memberships } }
}

describe('removeMembership', () => {
  it('removes a viewer membership and reports the deleted row', async () => {
    const { prisma, state } = makePrisma({
      users: [{ id: 'u1', email: 'jane@acme.test', organizationId: 'home_jane' }],
      memberships: [
        { id: 'm1', userId: 'u1', organizationId: 'home_jane', role: 'admin' },
        { id: 'm2', userId: 'u1', organizationId: 'consulting_org', role: 'viewer' },
      ],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u1',
      organizationId: 'consulting_org',
    })
    if ('code' in result) throw new Error(`unexpected ${result.code}`)
    expect(result.removed.role).toBe('viewer')
    expect(state.memberships).toHaveLength(1)
    expect(state.memberships[0].organizationId).toBe('home_jane')
  })

  it('returns USER_NOT_FOUND for an unknown user id', async () => {
    const { prisma } = makePrisma()
    const result = await removeMembership(prisma, {
      targetUserId: 'ghost',
      organizationId: 'org_x',
    })
    expect(result).toEqual({ code: 'USER_NOT_FOUND' })
  })

  it('refuses to remove a user from their home org', async () => {
    // Removing a user from their home org would orphan them. Force
    // the caller to use the user-deletion path instead.
    const { prisma, state } = makePrisma({
      users: [{ id: 'u1', email: 'jane@acme.test', organizationId: 'home_jane' }],
      memberships: [{ id: 'm1', userId: 'u1', organizationId: 'home_jane', role: 'admin' }],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u1',
      organizationId: 'home_jane',
    })
    expect(result).toEqual({ code: 'IS_HOME_ORG' })
    expect(state.memberships).toHaveLength(1)
  })

  it('returns NOT_A_MEMBER when no membership exists for the org', async () => {
    const { prisma } = makePrisma({
      users: [{ id: 'u1', email: 'jane@acme.test', organizationId: 'home_jane' }],
      memberships: [{ id: 'm1', userId: 'u1', organizationId: 'home_jane', role: 'admin' }],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u1',
      organizationId: 'unrelated_org',
    })
    expect(result).toEqual({ code: 'NOT_A_MEMBER' })
  })

  it('refuses to remove the last admin of an org', async () => {
    // org_x has a single admin (membership m_x). Removing it would
    // leave the org with zero admins → org becomes unmanageable.
    const { prisma, state } = makePrisma({
      users: [
        { id: 'u_admin', email: 'admin@x.test', organizationId: 'home_admin' },
      ],
      memberships: [
        { id: 'm_home', userId: 'u_admin', organizationId: 'home_admin', role: 'admin' },
        { id: 'm_x', userId: 'u_admin', organizationId: 'org_x', role: 'admin' },
      ],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u_admin',
      organizationId: 'org_x',
    })
    expect(result).toEqual({ code: 'LAST_ADMIN' })
    // Membership row stays put.
    expect(state.memberships.find((m) => m.id === 'm_x')).toBeDefined()
  })

  it('allows removing one admin when another admin remains in the org', async () => {
    const { prisma, state } = makePrisma({
      users: [
        { id: 'u1', email: 'a@x.test', organizationId: 'home_a' },
        { id: 'u2', email: 'b@x.test', organizationId: 'home_b' },
      ],
      memberships: [
        { id: 'm1_home', userId: 'u1', organizationId: 'home_a', role: 'admin' },
        { id: 'm2_home', userId: 'u2', organizationId: 'home_b', role: 'admin' },
        { id: 'm1_x', userId: 'u1', organizationId: 'org_x', role: 'admin' },
        { id: 'm2_x', userId: 'u2', organizationId: 'org_x', role: 'admin' },
      ],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u1',
      organizationId: 'org_x',
    })
    if ('code' in result) throw new Error(`unexpected ${result.code}`)
    expect(state.memberships.find((m) => m.id === 'm1_x')).toBeUndefined()
    // The other admin is still there.
    expect(
      state.memberships.find((m) => m.id === 'm2_x' && m.role === 'admin'),
    ).toBeDefined()
  })

  it('does not consult the admin count when removing a non-admin', async () => {
    // Even if removing this viewer membership would leave zero
    // admins (it can't, since they're a viewer, but the guard
    // shouldn't fire either way), the operation succeeds.
    const { prisma, state } = makePrisma({
      users: [{ id: 'u_viewer', email: 'v@x.test', organizationId: 'home_v' }],
      memberships: [
        { id: 'mv_home', userId: 'u_viewer', organizationId: 'home_v', role: 'admin' },
        { id: 'mv_x', userId: 'u_viewer', organizationId: 'org_x', role: 'viewer' },
        // Note: org_x has no admins. The guard is on admin removal,
        // not on the org's overall admin count, so this still passes.
      ],
    })
    const result = await removeMembership(prisma, {
      targetUserId: 'u_viewer',
      organizationId: 'org_x',
    })
    if ('code' in result) throw new Error(`unexpected ${result.code}`)
    expect(state.memberships.find((m) => m.id === 'mv_x')).toBeUndefined()
  })
})
