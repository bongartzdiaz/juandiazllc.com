/* Hermetic tests for the super-admin grant/revoke library.
   ──────────────────────────────────────────────────────────────────
   Covers:
     - First-grant happy path (self-grant, bootstrap pattern)
     - Subsequent grant with explicit grantor
     - Idempotency: granting an already-superAdmin user → no-op,
       no duplicate AuditLog row
     - Revoke happy path
     - Revoke idempotency: revoking a non-superAdmin → no-op
     - Custom revokeToRole
     - Defensive: user-not-found, grantor-not-found
     - Audit chain: each write reads the previous tip + computes
       a fresh hash that chains forward

   Mock pattern matches adapter.test.ts (hand-rolled Prisma mock,
   no vi.mock complexity). */

import { describe, it, expect, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { grantSuperAdmin, revokeSuperAdmin } from './super-admin-grant'

// ── Mock Prisma ────────────────────────────────────────────────────

interface MockUser {
  id: string
  email: string
  role: string
  organizationId: string
  twoFactorEnabled: boolean
}

interface MockAuditRow {
  id: string
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  changes: string
  createdAt: Date
  prevHash: string | null
  hash: string
}

interface MockState {
  users: MockUser[]
  audit: MockAuditRow[]
  updateCalls: Array<{ id: string; data: Record<string, unknown> }>
}

function makeMockPrisma(state: MockState): PrismaClient {
  return {
    user: {
      findUnique: async (args: { where: { email?: string; id?: string } }) => {
        if (args.where.email) {
          return state.users.find(u => u.email === args.where.email) ?? null
        }
        if (args.where.id) {
          return state.users.find(u => u.id === args.where.id) ?? null
        }
        return null
      },
      update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        state.updateCalls.push({ id: args.where.id, data: args.data })
        const user = state.users.find(u => u.id === args.where.id)
        if (user && typeof args.data.role === 'string') user.role = args.data.role
        return user
      },
    },
    auditLog: {
      findFirst: async (args: {
        where: { organizationId: string }
        orderBy?: unknown
      }) => {
        const rows = state.audit
          .filter(r => r.organizationId === args.where.organizationId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        return rows[0] ?? null
      },
      create: async (args: { data: Omit<MockAuditRow, 'id'> }) => {
        const row: MockAuditRow = {
          ...args.data,
          id: `audit_${state.audit.length + 1}`,
        }
        state.audit.push(row)
        return row
      },
    },
  } as unknown as PrismaClient
}

/**
 * Deep-clone users into the state so test fixtures aren't shared
 * across tests via reference. The Prisma mock mutates `user.role`
 * in-place on update(), and without cloning, the second test sees
 * the first test's role change.
 */
function makeState(users: MockUser[]): MockState {
  return {
    users: users.map(u => ({ ...u })),
    audit: [],
    updateCalls: [],
  }
}

// Fixture factories — call to get a fresh object every test.
const juan = (): MockUser => ({
  id: 'user_juan_001',
  email: 'juan@kompasagency.nl',
  role: 'admin',
  organizationId: 'org_juan_001',
  twoFactorEnabled: true,
})

const newStaff = (): MockUser => ({
  id: 'user_new_001',
  email: 'new-staff@lucenai.eu',
  role: 'admin',
  organizationId: 'org_new_001',
  twoFactorEnabled: false,
})

// Stable identifiers (independent of fixture mutation).
const JUAN_EMAIL = 'juan@kompasagency.nl'
const JUAN_ID = 'user_juan_001'
const JUAN_ORG_ID = 'org_juan_001'
const NEW_STAFF_EMAIL = 'new-staff@lucenai.eu'
const NEW_STAFF_ID = 'user_new_001'
const NEW_STAFF_ORG_ID = 'org_new_001'

// ── grantSuperAdmin ────────────────────────────────────────────────

describe('grantSuperAdmin()', () => {
  it('first-grant happy path (self-grant / bootstrap)', async () => {
    const state = makeState([juan()])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({ prisma, granteeEmail: JUAN_EMAIL })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.action).toBe('granted')
    expect(result.previousRole).toBe('admin')

    // Role updated
    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0]?.data.role).toBe('superAdmin')

    // AuditLog row exists
    expect(state.audit).toHaveLength(1)
    const audit = state.audit[0]!
    expect(audit.action).toBe('update')
    expect(audit.entity).toBe('user')
    expect(audit.entityId).toBe(JUAN_ID)
    expect(audit.organizationId).toBe(JUAN_ORG_ID)
    // Self-grant: actor === target
    expect(audit.userId).toBe(JUAN_ID)

    const changes = JSON.parse(audit.changes)
    expect(changes.role.old).toBe('admin')
    expect(changes.role.new).toBe('superAdmin')
    expect(changes.grantor.new).toBe(JUAN_EMAIL)
    expect(changes.mfaEnrolled.new).toBe(true)
  })

  it('explicit grantor lands as audit actor', async () => {
    const state = makeState([juan(), newStaff()])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({
      prisma,
      granteeEmail: NEW_STAFF_EMAIL,
      grantorEmail: JUAN_EMAIL,
    })

    expect(result.ok).toBe(true)
    expect(state.audit).toHaveLength(1)
    const audit = state.audit[0]!
    // Audit lives on the GRANTEE's home org
    expect(audit.organizationId).toBe(NEW_STAFF_ORG_ID)
    // But the ACTOR is the grantor
    expect(audit.userId).toBe(JUAN_ID)
    expect(audit.entityId).toBe(NEW_STAFF_ID)
  })

  it('idempotent: already-super-admin → no-op, no duplicate audit', async () => {
    const alreadyAdmin = { ...juan(), role: 'superAdmin' }
    const state = makeState([alreadyAdmin])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({ prisma, granteeEmail: alreadyAdmin.email })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.action).toBe('already-super-admin')

    // CRITICAL: no role update, no audit row
    expect(state.updateCalls).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it('user-not-found returns failure without side effects', async () => {
    const state = makeState([])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({
      prisma,
      granteeEmail: 'nobody@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error()
    expect(result.reason).toBe('user-not-found')
    expect(state.updateCalls).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it('grantor-not-found returns failure without side effects', async () => {
    const state = makeState([newStaff()])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({
      prisma,
      granteeEmail: NEW_STAFF_EMAIL,
      grantorEmail: 'ghost@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error()
    expect(result.reason).toBe('grantor-not-found')
    expect(state.updateCalls).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it('MFA-not-enrolled is logged in audit but does NOT block the grant', async () => {
    // requireSuperAdmin enforces MFA at request time; the grant itself
    // succeeds. The MFA state is recorded in audit for the "did Juan
    // grant someone without MFA?" forensics question.
    const noMfa = { ...newStaff(), twoFactorEnabled: false }
    const state = makeState([noMfa])
    const prisma = makeMockPrisma(state)

    const result = await grantSuperAdmin({ prisma, granteeEmail: noMfa.email })

    expect(result.ok).toBe(true)
    expect(state.audit).toHaveLength(1)
    const changes = JSON.parse(state.audit[0]!.changes)
    expect(changes.mfaEnrolled.new).toBe(false)
  })
})

// ── revokeSuperAdmin ───────────────────────────────────────────────

describe('revokeSuperAdmin()', () => {
  it('happy path: superAdmin → admin', async () => {
    const sa = { ...juan(), role: 'superAdmin' }
    const state = makeState([sa])
    const prisma = makeMockPrisma(state)

    const result = await revokeSuperAdmin({ prisma, granteeEmail: sa.email })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.action).toBe('revoked')

    expect(state.updateCalls).toHaveLength(1)
    expect(state.updateCalls[0]?.data.role).toBe('admin')

    expect(state.audit).toHaveLength(1)
    const changes = JSON.parse(state.audit[0]!.changes)
    expect(changes.role.old).toBe('superAdmin')
    expect(changes.role.new).toBe('admin')
  })

  it('custom revokeToRole demotes to viewer', async () => {
    const sa = { ...juan(), role: 'superAdmin' }
    const state = makeState([sa])
    const prisma = makeMockPrisma(state)

    const result = await revokeSuperAdmin({
      prisma,
      granteeEmail: sa.email,
      revokeToRole: 'viewer',
    })

    expect(result.ok).toBe(true)
    expect(state.updateCalls[0]?.data.role).toBe('viewer')
  })

  it('idempotent: not-currently-superAdmin → no-op, no audit', async () => {
    // Already 'admin' — revoke should be a no-op.
    const state = makeState([juan()])
    const prisma = makeMockPrisma(state)

    const result = await revokeSuperAdmin({ prisma, granteeEmail: JUAN_EMAIL })

    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error()
    expect(result.action).toBe('not-super-admin')

    expect(state.updateCalls).toHaveLength(0)
    expect(state.audit).toHaveLength(0)
  })

  it('user-not-found returns failure', async () => {
    const state = makeState([])
    const prisma = makeMockPrisma(state)

    const result = await revokeSuperAdmin({
      prisma,
      granteeEmail: 'nobody@example.com',
    })

    expect(result.ok).toBe(false)
    if (result.ok) throw new Error()
    expect(result.reason).toBe('user-not-found')
  })
})

// ── Audit chain integrity ──────────────────────────────────────────

describe('Audit chain integrity', () => {
  it('two consecutive grants chain correctly (prevHash = previous hash)', async () => {
    const state = makeState([juan(), newStaff()])
    const prisma = makeMockPrisma(state)

    // First grant — to JUAN
    await grantSuperAdmin({ prisma, granteeEmail: JUAN_EMAIL })

    // Second grant — to new-staff, by JUAN (now super-admin)
    // The Prisma mock already mutated state.users[0].role to 'superAdmin'
    // after the first grant, so the grantor lookup finds Juan as super-admin.
    await grantSuperAdmin({
      prisma,
      granteeEmail: NEW_STAFF_EMAIL,
      grantorEmail: JUAN_EMAIL,
    })

    expect(state.audit).toHaveLength(2)

    // Each audit row's hash is a 64-char hex SHA-256 digest
    expect(state.audit[0]!.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(state.audit[1]!.hash).toMatch(/^[a-f0-9]{64}$/)

    // Different orgs → different chains → both first-rows have prevHash=null
    // (audit chain is per-organizationId)
    expect(state.audit[0]!.prevHash).toBeNull()
    expect(state.audit[1]!.prevHash).toBeNull()
  })

  it('two grants on the same org chain via prevHash', async () => {
    // Both users in same org — simulates two staff members at lucenai.eu
    // both being promoted to superAdmin
    const staff1: MockUser = {
      id: 'user_s1',
      email: 's1@lucenai.eu',
      role: 'admin',
      organizationId: 'org_lucenai',
      twoFactorEnabled: true,
    }
    const staff2: MockUser = {
      id: 'user_s2',
      email: 's2@lucenai.eu',
      role: 'admin',
      organizationId: 'org_lucenai',
      twoFactorEnabled: true,
    }
    const state = makeState([staff1, staff2])
    const prisma = makeMockPrisma(state)

    await grantSuperAdmin({ prisma, granteeEmail: staff1.email })
    await grantSuperAdmin({
      prisma,
      granteeEmail: staff2.email,
      grantorEmail: staff1.email,
    })

    expect(state.audit).toHaveLength(2)
    expect(state.audit[0]!.prevHash).toBeNull()
    expect(state.audit[1]!.prevHash).toBe(state.audit[0]!.hash)
  })
})
