/* POST /api/hospitality/quote — compute a price quote for a stay
   Body: { roomId, checkIn, checkOut } */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'
import { computeStayPrice } from '@/lib/hospitality/pricing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  let body: { roomId?: string; checkIn?: string; checkOut?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.roomId) return jsonError('roomId is required', 400)
  if (!body.checkIn || !body.checkOut) return jsonError('checkIn and checkOut required', 400)

  const checkIn = new Date(body.checkIn)
  const checkOut = new Date(body.checkOut)
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return jsonError('Invalid dates', 400)
  if (checkOut <= checkIn) return jsonError('checkOut must be after checkIn', 400)

  const prisma = getAuthPrisma()
  const room = await prisma.room.findFirst({
    where: { id: body.roomId, organizationId: scope.organizationId },
  })
  if (!room) return jsonError('Room not found', 404)

  // Occupancy = share of all org rooms booked overlapping this stay
  const [totalRooms, overlapping] = await Promise.all([
    prisma.room.count({ where: { organizationId: scope.organizationId } }),
    prisma.reservation.count({
      where: {
        room: { organizationId: scope.organizationId },
        status: { in: ['confirmed', 'checked_in'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    }),
  ])
  const occupancy = totalRooms > 0 ? overlapping / totalRooms : 0

  const leadTimeDays = Math.max(0, Math.floor((checkIn.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const quote = computeStayPrice({
    basePriceCents: room.priceCentsNight,
    checkIn,
    checkOut,
    occupancy,
    leadTimeDays,
  })

  return NextResponse.json({
    data: {
      ...quote,
      roomId: room.id,
      roomName: room.name,
      occupancy,
      leadTimeDays,
    },
  })
}
