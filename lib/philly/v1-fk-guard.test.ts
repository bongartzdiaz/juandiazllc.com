import { describe, it, expect, vi } from 'vitest'
import { findCrossOrgForeignKey, V1_FK_FIELDS } from './v1-fk-guard'

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

  it('knows the expected FK fields', () => {
    expect(V1_FK_FIELDS).toEqual(
      expect.arrayContaining(['contactId', 'propertyId', 'roomId', 'agentId', 'dealId', 'stageId']),
    )
  })
})
