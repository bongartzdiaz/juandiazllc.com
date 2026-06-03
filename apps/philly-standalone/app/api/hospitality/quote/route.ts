/* POST /api/hospitality/quote — compute a price quote for a stay
   Body: { roomId, checkIn, checkOut } */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { computeStayPrice } from '@/lib/philly/hospitality/pricing'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const quoteSchema = z.object({
  roomId: z.string().trim().min(1, 'roomId is required').max(80),
  checkIn: z.string().min(1, 'checkIn and checkOut required'),
  checkOut: z.string().min(1, 'checkIn and checkOut required'),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`hospitality.quote:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, quoteSchema)
  if (body instanceof NextResponse) return body

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
