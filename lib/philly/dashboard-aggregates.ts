/* ---------------------------------------------------------------
   Dashboard vertical aggregations (org-scoped).

   Used by GET /api/dashboard/summary to back the Real-Estate and Hospitality
   dashboards with live data. MySQL/MariaDB has no RLS, so every aggregate here
   MUST carry an organizationId filter — Property/Room directly, Reservation
   through its room relation (it has no organizationId column of its own).
   --------------------------------------------------------------- */

// Duck-typed Prisma boundary so these stay unit-testable with a fake client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = Record<string, any>

export interface RealEstateBlock {
  properties: number
  activeListings: number
  soldOrRented: number
  portfolioValueCents: number
}

export interface HospitalityBlock {
  rooms: number
  occupied: number
  available: number
  occupancyPct: number
  upcomingReservations: number
  reservationRevenueCents: number
}

/** Real-estate vertical block — Property is org-scoped directly. */
export async function realEstateBlock(prisma: Db, orgId: string): Promise<RealEstateBlock> {
  const [properties, activeListings, soldOrRented, portfolio] = await Promise.all([
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.property.count({ where: { organizationId: orgId, status: 'available' } }),
    prisma.property.count({ where: { organizationId: orgId, status: { in: ['sold', 'rented'] } } }),
    prisma.property.aggregate({ where: { organizationId: orgId, status: 'available' }, _sum: { priceCents: true } }),
  ])
  return {
    properties,
    activeListings,
    soldOrRented,
    portfolioValueCents: portfolio._sum?.priceCents ?? 0,
  }
}

/** Hospitality vertical block — Room is org-scoped directly; Reservation has
 *  no organizationId and is scoped through its room relation. */
export async function hospitalityBlock(prisma: Db, orgId: string, now: Date): Promise<HospitalityBlock> {
  const [rooms, occupied, available, upcomingReservations, revenue] = await Promise.all([
    prisma.room.count({ where: { organizationId: orgId } }),
    prisma.room.count({ where: { organizationId: orgId, status: 'occupied' } }),
    prisma.room.count({ where: { organizationId: orgId, status: 'available' } }),
    prisma.reservation.count({
      where: { room: { organizationId: orgId }, checkIn: { gte: now }, status: { in: ['confirmed', 'checked_in'] } },
    }),
    prisma.reservation.aggregate({
      where: { room: { organizationId: orgId }, status: { in: ['confirmed', 'checked_in', 'checked_out'] } },
      _sum: { totalCents: true },
    }),
  ])
  return {
    rooms,
    occupied,
    available,
    occupancyPct: rooms > 0 ? Math.round((occupied / rooms) * 100) : 0,
    upcomingReservations,
    reservationRevenueCents: revenue._sum?.totalCents ?? 0,
  }
}
