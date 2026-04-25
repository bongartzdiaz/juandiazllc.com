import { describe, it, expect } from 'vitest'
import { runRetentionPurge } from './retention'
import type { PrismaForRetention } from './retention'
import { PII_REGISTRY } from './pii-registry'

interface CaptureBag {
  byModel: Record<string, { cutoff: Date }>
  totalCalls: number
}

function makePrisma(deleteCounts: Record<string, number> = {}): {
  prisma: PrismaForRetention
  capture: CaptureBag
} {
  const capture: CaptureBag = { byModel: {}, totalCalls: 0 }
  const factory = (model: string) => ({
    deleteMany: async (args: { where: { createdAt: { lt: Date } } }) => {
      capture.totalCalls += 1
      capture.byModel[model] = { cutoff: args.where.createdAt.lt }
      return { count: deleteCounts[model] ?? 0 }
    },
  })
  const prisma: PrismaForRetention = {
    contact: factory('Contact'),
    contactNote: factory('ContactNote'),
    activity: factory('Activity'),
    reservation: factory('Reservation'),
    volunteer: factory('Volunteer'),
    openHouseVisit: factory('OpenHouseVisit'),
    message: factory('Message'),
    eSignature: factory('ESignature'),
    callLog: factory('CallLog'),
    smsMessage: factory('SmsMessage'),
    auditLog: factory('AuditLog'),
  }
  return { prisma, capture }
}

const MS_PER_DAY = 86_400_000

describe('runRetentionPurge', () => {
  it('uses each registry entry retentionDays as the cutoff offset', async () => {
    const now = new Date('2026-04-25T00:00:00Z')
    const { prisma, capture } = makePrisma()
    await runRetentionPurge(prisma, now)

    for (const entry of PII_REGISTRY) {
      // Skip User — runRetentionPurge does not own User deletion;
      // the deletion-grace flow does.
      if (entry.model === 'User') continue
      const captured = capture.byModel[entry.model]
      expect(captured, `expected ${entry.model} to be queried`).toBeDefined()
      const expected = new Date(now.getTime() - entry.retentionDays * MS_PER_DAY)
      expect(captured.cutoff.getTime()).toBe(expected.getTime())
    }
  })

  it('totalRows is the sum of every per-model count', async () => {
    const { prisma } = makePrisma({
      Contact: 3,
      ContactNote: 7,
      Activity: 2,
      Reservation: 1,
      Volunteer: 0,
      OpenHouseVisit: 4,
      Message: 5,
      ESignature: 0,
      CallLog: 0,
      SmsMessage: 0,
      AuditLog: 11,
    })
    const result = await runRetentionPurge(prisma)
    expect(result.totalRows).toBe(3 + 7 + 2 + 1 + 0 + 4 + 5 + 0 + 0 + 0 + 11)
  })

  it('records per-model cutoffs as ISO strings', async () => {
    const now = new Date('2026-04-25T00:00:00Z')
    const { prisma } = makePrisma()
    const result = await runRetentionPurge(prisma, now)
    for (const [model, iso] of Object.entries(result.cutoffs)) {
      expect(typeof iso).toBe('string')
      expect(iso, `${model} cutoff should be ISO`).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    }
  })

  it('does not touch the User table (User is owned by the deletion-grace flow)', async () => {
    const { prisma, capture } = makePrisma()
    await runRetentionPurge(prisma)
    expect(capture.byModel.User).toBeUndefined()
  })
})
