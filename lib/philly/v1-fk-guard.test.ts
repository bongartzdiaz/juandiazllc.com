import { describe, it, expect, vi } from 'vitest'
import {
  findCrossOrgForeignKey,
  findForeignKeyNotInOrg,
  stageBelongsToPipeline,
  someUserNotInOrg,
  V1_FK_FIELDS,
} from './v1-fk-guard'

/** Fake Prisma: each model's findFirst returns a row only when the where
 *  clause's org matches `ownedOrg` (direct column or nested pipeline). */
function fakePrisma(ownedOrg: string) {
  const make = () => ({
    findFirst: vi.fn(async (args: { where: Record<string, any> }) => {
      const w = args.where
      const org = w.organizationId ?? w.pipeline?.organizationId
      return org === ownedOrg ? { id: w.id } : null
    }),
  })
  return {
    contact: make(),
    property: make(),
    room: make(),
    user: make(),
    deal: make(),
    pipelineStage: make(),
  }
}

describe('findCrossOrgForeignKey', () => {
  it('returns null when no FK fields are present', async () => {
    const prisma = fakePrisma('org-A')
    expect(await findCrossOrgForeignKey(prisma, 'org-A', { name: 'x', email: 'a@b.c' })).toBeNull()
  })

  it('returns null when all supplied FKs belong to the org', async () => {
    const prisma = fakePrisma('org-A')
    const r = await findCrossOrgForeignKey(prisma, 'org-A', { propertyId: 'p1', contactId: 'c1' })
    expect(r).toBeNull()
  })

  it('flags a propertyId that belongs to another org (the A-02 BOLA case)', async () => {
    const prisma = fakePrisma('org-A')
    // caller is org-B; the property is owned by org-A -> not found for org-B
    const r = await findCrossOrgForeignKey(prisma, 'org-B', { propertyId: 'p1' })
    expect(r).toBe('propertyId')
  })

  it('flags a cross-org roomId (reservation case)', async () => {
    const prisma = fakePrisma('org-A')
    expect(await findCrossOrgForeignKey(prisma, 'org-B', { roomId: 'r1' })).toBe('roomId')
  })

  it('checks dealId / stageId via the pipeline relation', async () => {
    const prisma = fakePrisma('org-A')
    expect(await findCrossOrgForeignKey(prisma, 'org-A', { dealId: 'd1', stageId: 's1' })).toBeNull()
    expect(prisma.deal.findFirst).toHaveBeenCalledWith({
      where: { id: 'd1', pipeline: { organizationId: 'org-A' } },
      select: { id: true },
    })
    expect(await findCrossOrgForeignKey(prisma, 'org-B', { stageId: 's1' })).toBe('stageId')
  })

  it('ignores empty / null FK values', async () => {
    const prisma = fakePrisma('org-A')
    expect(await findCrossOrgForeignKey(prisma, 'org-A', { propertyId: '', contactId: null })).toBeNull()
    expect(prisma.property.findFirst).not.toHaveBeenCalled()
  })

  it('knows the expected FK fields (incl. projectId added for internal routes)', () => {
    expect(V1_FK_FIELDS).toEqual(
      expect.arrayContaining([
        'contactId', 'propertyId', 'roomId', 'agentId', 'dealId', 'stageId', 'projectId',
      ]),
    )
  })
})

describe('findForeignKeyNotInOrg (generic, BE-09)', () => {
  it('returns null when all explicit checks pass', async () => {
    const prisma = fakePrisma('org-A')
    const bad = await findForeignKeyNotInOrg(prisma, 'org-A', [
      { field: 'buyerContactId', model: 'contact', value: 'c1' },
      { field: 'dealId', model: 'deal', value: 'd1' },
    ])
    expect(bad).toBeNull()
  })

  it('flags the first cross-org field using its request-specific name', async () => {
    const prisma = fakePrisma('org-A')
    const bad = await findForeignKeyNotInOrg(prisma, 'org-B', [
      { field: 'sellerAgentId', model: 'user', value: 'u1' },
    ])
    expect(bad).toBe('sellerAgentId')
  })

  it('skips empty/null values', async () => {
    const prisma = fakePrisma('org-A')
    const bad = await findForeignKeyNotInOrg(prisma, 'org-B', [
      { field: 'dealId', model: 'deal', value: null },
      { field: 'propertyId', model: 'property', value: '' },
    ])
    expect(bad).toBeNull()
  })
})

describe('stageBelongsToPipeline (BE-02)', () => {
  function pipelineStageFake(pipelineId: string) {
    return {
      pipelineStage: {
        findFirst: vi.fn(async (args: { where: Record<string, unknown> }) =>
          args.where.pipelineId === pipelineId ? { id: args.where.id } : null,
        ),
      },
    }
  }
  it('true when the stage is in the pipeline', async () => {
    expect(await stageBelongsToPipeline(pipelineStageFake('p1'), 's1', 'p1')).toBe(true)
  })
  it('false when the stage is in another pipeline', async () => {
    expect(await stageBelongsToPipeline(pipelineStageFake('p1'), 's1', 'p2')).toBe(false)
  })
  it('false for an empty/null stage id', async () => {
    expect(await stageBelongsToPipeline(pipelineStageFake('p1'), '', 'p1')).toBe(false)
    expect(await stageBelongsToPipeline(pipelineStageFake('p1'), null, 'p1')).toBe(false)
  })
})

describe('someUserNotInOrg (BE-09 calendar attendees)', () => {
  function userCountFake(orgUsers: string[]) {
    return {
      user: {
        count: vi.fn(async (args: { where: { id: { in: string[] }; organizationId: string } }) =>
          args.where.id.in.filter((id) => orgUsers.includes(id)).length,
        ),
      },
    }
  }
  it('false when every attendee is in the org', async () => {
    expect(await someUserNotInOrg(userCountFake(['u1', 'u2']), 'org-A', ['u1', 'u2'])).toBe(false)
  })
  it('true when an attendee is from another org', async () => {
    expect(await someUserNotInOrg(userCountFake(['u1']), 'org-A', ['u1', 'u2'])).toBe(true)
  })
  it('false for an empty attendee list (no query)', async () => {
    const fake = userCountFake([])
    expect(await someUserNotInOrg(fake, 'org-A', [])).toBe(false)
    expect(fake.user.count).not.toHaveBeenCalled()
  })
  it('dedupes ids before counting', async () => {
    const fake = userCountFake(['u1'])
    expect(await someUserNotInOrg(fake, 'org-A', ['u1', 'u1'])).toBe(false)
    expect(fake.user.count).toHaveBeenCalledWith({
      where: { id: { in: ['u1'] }, organizationId: 'org-A' },
    })
  })
})
