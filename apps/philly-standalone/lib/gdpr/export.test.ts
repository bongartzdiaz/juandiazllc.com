import { describe, it, expect } from 'vitest'
import { collectOperatorData, collectContactSubjectData, rowCounts } from './export'
import type { PrismaForExport } from './export'

function makeOperatorPrisma(overrides: Partial<PrismaForExport> = {}): PrismaForExport {
  // Defaults: empty arrays / null user — tests override what they need.
  const base: PrismaForExport = {
    user: { findUnique: async () => null },
    session: { findMany: async () => [] },
    account: { findMany: async () => [] },
    contactNote: { findMany: async () => [] },
    activity: { findMany: async () => [] },
    auditLog: { findMany: async () => [] },
    twoFactorRecoveryCode: { count: async () => 0 },
    contact: { findMany: async () => [] },
    reservation: { findMany: async () => [] },
    volunteer: { findMany: async () => [] },
    openHouseVisit: { findMany: async () => [] },
    message: { findMany: async () => [] },
    eSignature: { findMany: async () => [] },
    gdprConsentRecord: { findMany: async () => [] },
  }
  return { ...base, ...overrides }
}

describe('collectOperatorData', () => {
  it('redacts passwordHash, twoFactorSecret, and tokensInvalidAfter on the user row', async () => {
    const prisma = makeOperatorPrisma({
      user: {
        findUnique: async () => ({
          id: 'u1',
          email: 'alice@example.com',
          passwordHash: 'super-secret-bcrypt-hash',
          twoFactorSecret: 'JBSWY3DPEHPK3PXP',
          tokensInvalidAfter: new Date('2026-01-01'),
          name: 'Alice',
        }),
      },
    })
    const out = await collectOperatorData(prisma, 'u1')
    expect(out.user).not.toBeNull()
    expect(out.user!.passwordHash).toBe('[redacted]')
    expect(out.user!.twoFactorSecret).toBe('[redacted]')
    expect(out.user!.tokensInvalidAfter).toBe('[redacted]')
    // Non-secret fields preserved
    expect(out.user!.email).toBe('alice@example.com')
    expect(out.user!.name).toBe('Alice')
  })

  it('redacts session tokens and account OAuth tokens', async () => {
    const prisma = makeOperatorPrisma({
      session: {
        findMany: async () => [{ id: 's1', userId: 'u1', sessionToken: 'jwt.payload.sig' }],
      },
      account: {
        findMany: async () => [
          {
            id: 'a1',
            userId: 'u1',
            access_token: 'leaky-access',
            refresh_token: 'leaky-refresh',
            id_token: 'leaky-id',
            session_state: 'leaky-session-state',
            provider: 'google',
          },
        ],
      },
    })
    const out = await collectOperatorData(prisma, 'u1')
    expect(out.sessions[0].sessionToken).toBe('[redacted]')
    expect(out.accounts[0].access_token).toBe('[redacted]')
    expect(out.accounts[0].refresh_token).toBe('[redacted]')
    expect(out.accounts[0].id_token).toBe('[redacted]')
    expect(out.accounts[0].session_state).toBe('[redacted]')
    // Non-secret fields preserved
    expect(out.accounts[0].provider).toBe('google')
  })

  it('returns subjectKind = operator and a generatedAt timestamp', async () => {
    const out = await collectOperatorData(makeOperatorPrisma(), 'u1')
    expect(out.subjectKind).toBe('operator')
    expect(typeof out.generatedAt).toBe('string')
    expect(new Date(out.generatedAt).getTime()).toBeGreaterThan(0)
  })
})

describe('collectContactSubjectData', () => {
  it('lowercases + trims the email before querying', async () => {
    const captured: Array<Record<string, unknown>> = []
    const prisma = makeOperatorPrisma({
      contact: {
        findMany: async ({ where }) => {
          captured.push(where as Record<string, unknown>)
          return []
        },
      },
    })
    await collectContactSubjectData(prisma, 'org1', '  Alice@EXAMPLE.com ', 'fakehash')
    expect(captured[0].email).toBe('alice@example.com')
  })

  it('scopes Reservation/OpenHouseVisit/Message/ESignature via parent table organizationId', async () => {
    const captured: Record<string, Record<string, unknown>> = {}
    const prisma = makeOperatorPrisma({
      reservation: {
        findMany: async ({ where }) => {
          captured.reservation = where as Record<string, unknown>
          return []
        },
      },
      openHouseVisit: {
        findMany: async ({ where }) => {
          captured.openHouseVisit = where as Record<string, unknown>
          return []
        },
      },
      message: {
        findMany: async ({ where }) => {
          captured.message = where as Record<string, unknown>
          return []
        },
      },
      eSignature: {
        findMany: async ({ where }) => {
          captured.eSignature = where as Record<string, unknown>
          return []
        },
      },
    })
    await collectContactSubjectData(prisma, 'org1', 'alice@example.com', 'fakehash')

    // Reservation: room → organizationId
    expect((captured.reservation.room as { organizationId: string }).organizationId).toBe('org1')
    // OpenHouseVisit: openHouse.property → organizationId
    expect(
      ((captured.openHouseVisit.openHouse as { property: { organizationId: string } }).property)
        .organizationId,
    ).toBe('org1')
    // Message: conversation → organizationId; OR matches fromAddress / toAddress
    expect((captured.message.conversation as { organizationId: string }).organizationId).toBe('org1')
    expect(captured.message.OR).toEqual([
      { fromAddress: 'alice@example.com' },
      { toAddress: 'alice@example.com' },
    ])
    // ESignature: transaction → organizationId
    expect((captured.eSignature.transaction as { organizationId: string }).organizationId).toBe('org1')
  })

  it('queries consent records by hash, not plaintext email', async () => {
    let capturedWhere: Record<string, unknown> | null = null
    const prisma = makeOperatorPrisma({
      gdprConsentRecord: {
        findMany: async ({ where }) => {
          capturedWhere = where as Record<string, unknown>
          return []
        },
      },
    })
    await collectContactSubjectData(prisma, 'org1', 'alice@example.com', 'h4sh')
    expect(capturedWhere).toEqual({ organizationId: 'org1', subjectEmailHash: 'h4sh' })
  })
})

describe('rowCounts', () => {
  it('counts every collection in the operator export', () => {
    const counts = rowCounts({
      schemaVersion: 1,
      generatedAt: '',
      subjectKind: 'operator',
      user: { id: 'u1' },
      sessions: [{}, {}],
      accounts: [{}],
      contactNotes: [],
      activities: [{}, {}, {}],
      auditLogs: [],
      twoFactorRecoveryCodeCount: 4,
    })
    expect(counts).toEqual({
      User: 1,
      Session: 2,
      Account: 1,
      ContactNote: 0,
      Activity: 3,
      AuditLog: 0,
      TwoFactorRecoveryCode: 4,
    })
  })

  it('counts every collection in the contact-subject export', () => {
    const counts = rowCounts({
      schemaVersion: 1,
      generatedAt: '',
      subjectKind: 'contact',
      subjectEmail: 'alice@example.com',
      organizationId: 'org1',
      contacts: [{}],
      reservations: [],
      volunteers: [{}, {}],
      openHouseVisits: [],
      messages: [{}, {}, {}],
      eSignatures: [],
      consentRecords: [{}],
    })
    expect(counts).toEqual({
      Contact: 1,
      Reservation: 0,
      Volunteer: 2,
      OpenHouseVisit: 0,
      Message: 3,
      ESignature: 0,
      GdprConsentRecord: 1,
    })
  })
})
