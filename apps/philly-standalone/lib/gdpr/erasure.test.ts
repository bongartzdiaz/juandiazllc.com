import { describe, it, expect } from 'vitest'
import {
  scheduleAccountDeletion,
  cancelAccountDeletion,
  eraseContactSubject,
  runScheduledErasures,
} from './erasure'
import type { PrismaForErasure } from './erasure'

interface UserRow {
  id: string
  email: string
  deletionScheduledAt: Date | null
  deletionRequestedAt?: Date | null
}

function makePrisma(
  state: { users?: UserRow[]; deleteCounts?: Record<string, number> } = {},
): {
  prisma: PrismaForErasure
  state: { users: UserRow[]; deletedUserIds: string[]; deleteCalls: Record<string, number> }
} {
  const users = state.users ?? []
  const deleteCounts = state.deleteCounts ?? {}
  const deletedUserIds: string[] = []
  const deleteCalls: Record<string, number> = {}

  const deleteManyFor = (key: string) =>
    async () => {
      deleteCalls[key] = (deleteCalls[key] ?? 0) + 1
      return { count: deleteCounts[key] ?? 0 }
    }

  const prisma: PrismaForErasure = {
    user: {
      findUnique: async ({ where }) => users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }) => {
        const u = users.find((row) => row.id === where.id)
        if (!u) throw new Error('user not found')
        if ('deletionScheduledAt' in data) u.deletionScheduledAt = data.deletionScheduledAt as Date | null
        if ('deletionRequestedAt' in data)
          u.deletionRequestedAt = data.deletionRequestedAt as Date | null
        return u
      },
      delete: async ({ where }) => {
        deletedUserIds.push(where.id)
        return users.splice(users.findIndex((u) => u.id === where.id), 1)[0]
      },
      findMany: async ({ where }) => {
        // Tests pass { deletionScheduledAt: { lte: now } }
        const w = where as { deletionScheduledAt?: { lte: Date } }
        if (!w.deletionScheduledAt?.lte) return users
        const cutoff = w.deletionScheduledAt.lte
        return users.filter((u) => u.deletionScheduledAt && u.deletionScheduledAt <= cutoff)
      },
    },
    contact: {
      findMany: async () => [],
      deleteMany: deleteManyFor('contact'),
    },
    reservation: { deleteMany: deleteManyFor('reservation') },
    volunteer: { deleteMany: deleteManyFor('volunteer') },
    openHouseVisit: { deleteMany: deleteManyFor('openHouseVisit') },
    message: { deleteMany: deleteManyFor('message') },
    eSignature: { deleteMany: deleteManyFor('eSignature') },
    callLog: { deleteMany: deleteManyFor('callLog') },
    smsMessage: { deleteMany: deleteManyFor('smsMessage') },
  }
  return { prisma, state: { users, deletedUserIds, deleteCalls } }
}

describe('scheduleAccountDeletion', () => {
  it('sets deletionScheduledAt 30 days in the future on a fresh user', async () => {
    const now = new Date('2026-04-25T10:00:00Z')
    const { prisma, state } = makePrisma({
      users: [{ id: 'u1', email: 'a@b.com', deletionScheduledAt: null }],
    })
    const { scheduledFor } = await scheduleAccountDeletion(prisma, 'u1', now)
    const expected = new Date('2026-05-25T10:00:00Z')
    expect(scheduledFor.getTime()).toBe(expected.getTime())
    expect(state.users[0].deletionScheduledAt?.getTime()).toBe(expected.getTime())
    expect(state.users[0].deletionRequestedAt?.getTime()).toBe(now.getTime())
  })

  it('is idempotent — already-scheduled users do not get their grace extended', async () => {
    const original = new Date('2026-04-01T00:00:00Z')
    const { prisma } = makePrisma({
      users: [{ id: 'u1', email: 'a@b.com', deletionScheduledAt: original }],
    })
    const { scheduledFor } = await scheduleAccountDeletion(
      prisma,
      'u1',
      new Date('2026-04-25T10:00:00Z'),
    )
    expect(scheduledFor.getTime()).toBe(original.getTime())
  })
})

describe('cancelAccountDeletion', () => {
  it('clears deletionScheduledAt + deletionRequestedAt', async () => {
    const { prisma, state } = makePrisma({
      users: [
        {
          id: 'u1',
          email: 'a@b.com',
          deletionScheduledAt: new Date('2026-05-25'),
          deletionRequestedAt: new Date('2026-04-25'),
        },
      ],
    })
    await cancelAccountDeletion(prisma, 'u1')
    expect(state.users[0].deletionScheduledAt).toBeNull()
    expect(state.users[0].deletionRequestedAt).toBeNull()
  })
})

describe('eraseContactSubject', () => {
  it('issues deleteMany on every PII model and returns aggregate row counts', async () => {
    const { prisma, state } = makePrisma({
      deleteCounts: {
        contact: 2,
        reservation: 1,
        volunteer: 0,
        openHouseVisit: 3,
        message: 5,
        eSignature: 0,
        callLog: 0,
        smsMessage: 0,
      },
    })
    const result = await eraseContactSubject(prisma, 'org1', 'alice@example.com')

    expect(result.totalRows).toBe(2 + 1 + 0 + 3 + 5 + 0 + 0 + 0)
    expect(result.rowCounts).toEqual({
      Contact: 2,
      Reservation: 1,
      Volunteer: 0,
      OpenHouseVisit: 3,
      Message: 5,
      ESignature: 0,
      CallLog: 0,
      SmsMessage: 0,
    })

    // Every PII model should have been touched once (the contact-id-keyed
    // deletes for CallLog/SmsMessage are skipped when there are no contacts,
    // since findMany returns []).
    expect(state.deleteCalls).toEqual({
      contact: 1,
      reservation: 1,
      volunteer: 1,
      openHouseVisit: 1,
      message: 1,
      eSignature: 1,
    })
  })

  it('deletes phone-keyed CallLog/SmsMessage rows when contacts match', async () => {
    let capturedCallLogWhere: Record<string, unknown> | null = null
    let capturedSmsWhere: Record<string, unknown> | null = null
    const { prisma } = makePrisma({})
    // Override findMany to return matching contacts so the contactId-scoped
    // deleteMany branches fire.
    prisma.contact.findMany = async () => [{ id: 'c1' }, { id: 'c2' }]
    prisma.callLog.deleteMany = async ({ where }) => {
      capturedCallLogWhere = where as Record<string, unknown>
      return { count: 7 }
    }
    prisma.smsMessage.deleteMany = async ({ where }) => {
      capturedSmsWhere = where as Record<string, unknown>
      return { count: 3 }
    }

    const result = await eraseContactSubject(prisma, 'org1', 'alice@example.com')
    expect(result.rowCounts.CallLog).toBe(7)
    expect(result.rowCounts.SmsMessage).toBe(3)
    expect(capturedCallLogWhere).toEqual({ contactId: { in: ['c1', 'c2'] } })
    expect(capturedSmsWhere).toEqual({ contactId: { in: ['c1', 'c2'] } })
  })
})

describe('runScheduledErasures', () => {
  it('deletes only users whose deletionScheduledAt has elapsed', async () => {
    const now = new Date('2026-04-25T00:00:00Z')
    const { prisma, state } = makePrisma({
      users: [
        { id: 'u1', email: 'a@b.com', deletionScheduledAt: new Date('2026-04-20') }, // due
        { id: 'u2', email: 'b@b.com', deletionScheduledAt: new Date('2026-05-25') }, // future
        { id: 'u3', email: 'c@b.com', deletionScheduledAt: null }, // never
      ],
    })
    const { erasedUserIds } = await runScheduledErasures(prisma, now)
    expect(erasedUserIds).toEqual(['u1'])
    expect(state.deletedUserIds).toEqual(['u1'])
  })

  it('returns an empty list when nothing is due', async () => {
    const { prisma } = makePrisma({
      users: [{ id: 'u1', email: 'a@b.com', deletionScheduledAt: new Date('2099-01-01') }],
    })
    const { erasedUserIds } = await runScheduledErasures(prisma, new Date('2026-04-25'))
    expect(erasedUserIds).toEqual([])
  })
})
