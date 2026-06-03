import { describe, it, expect, vi } from 'vitest'
import { realEstateBlock, hospitalityBlock } from './dashboard-aggregates'

/** Fake Prisma capturing the where clauses each call receives, returning
 *  deterministic counts so we can assert org-scoping + math. */
function fakeDb(counts: Record<string, number>, sums: Record<string, number>) {
  const calls: Array<{ model: string; op: string; where: any }> = []
  const model = (name: string) => ({
    count: vi.fn(async (args: { where: any }) => {
      calls.push({ model: name, op: 'count', where: args.where })
      // key by a status discriminator so different counts can be returned
      const k = `${name}:${args.where.status?.in ? args.where.status.in.join('|') : args.where.status ?? 'all'}`
      return counts[k] ?? 0
    }),
    aggregate: vi.fn(async (args: { where: any }) => {
      calls.push({ model: name, op: 'aggregate', where: args.where })
      const k = `${name}:sum`
      return { _sum: { priceCents: sums[k], totalCents: sums[k] } }
    }),
  })
  return { db: { property: model('property'), room: model('room'), reservation: model('reservation') }, calls }
}

describe('realEstateBlock', () => {
  it('aggregates org-scoped property counts + portfolio value', async () => {
    const { db, calls } = fakeDb(
      { 'property:all': 12, 'property:available': 7, 'property:sold|rented': 4 },
      { 'property:sum': 4_200_000 },
    )
    const block = await realEstateBlock(db, 'org-A')
    expect(block).toEqual({
      properties: 12,
      activeListings: 7,
      soldOrRented: 4,
      portfolioValueCents: 4_200_000,
    })
    // every property query is org-scoped
    expect(calls.every((c) => c.where.organizationId === 'org-A')).toBe(true)
  })

  it('defaults portfolio value to 0 when no available listings', async () => {
    const { db } = fakeDb({ 'property:all': 0, 'property:available': 0, 'property:sold|rented': 0 }, {})
    const block = await realEstateBlock(db, 'org-A')
    expect(block.portfolioValueCents).toBe(0)
  })
})

describe('hospitalityBlock', () => {
  const now = new Date('2026-06-03T00:00:00Z')

  it('aggregates rooms + occupancy + reservations, reservations scoped via room relation', async () => {
    const { db, calls } = fakeDb(
      {
        'room:all': 20,
        'room:occupied': 15,
        'room:available': 5,
        'reservation:confirmed|checked_in': 8,
      },
      { 'reservation:sum': 96_000 },
    )
    const block = await hospitalityBlock(db, 'org-A', now)
    expect(block).toEqual({
      rooms: 20,
      occupied: 15,
      available: 5,
      occupancyPct: 75,
      upcomingReservations: 8,
      reservationRevenueCents: 96_000,
    })
    // room queries scope on organizationId directly; reservation via room relation
    const roomCalls = calls.filter((c) => c.model === 'room')
    expect(roomCalls.every((c) => c.where.organizationId === 'org-A')).toBe(true)
    const resCalls = calls.filter((c) => c.model === 'reservation')
    expect(resCalls.every((c) => c.where.room?.organizationId === 'org-A')).toBe(true)
  })

  it('occupancyPct is 0 (not NaN) when there are no rooms', async () => {
    const { db } = fakeDb({ 'room:all': 0, 'room:occupied': 0, 'room:available': 0 }, {})
    const block = await hospitalityBlock(db, 'org-A', now)
    expect(block.occupancyPct).toBe(0)
  })
})
