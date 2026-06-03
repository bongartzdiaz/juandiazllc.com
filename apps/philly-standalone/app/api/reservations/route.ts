/* GET  /api/reservations — list reservations
   POST /api/reservations — create reservation */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  roomId: z.string().trim().min(1, 'roomId is required').max(80),
  guestName: z.string().trim().min(1, 'guestName is required').max(120),
  guestEmail: z.string().trim().max(255).optional(),
  guestPhone: z.string().trim().max(60).optional(),
  checkIn: z.string().min(1, 'checkIn and checkOut are required'),
  checkOut: z.string().min(1, 'checkIn and checkOut are required'),
  status: z.string().trim().max(60).optional(),
  totalCents: z.coerce.number().optional(),
  notes: z.string().trim().max(10_000).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const roomId = url.searchParams.get('roomId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    room: { organizationId: scope.organizationId },
    ...(status ? { status } : {}),
    ...(roomId ? { roomId } : {}),
  }

  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where, orderBy: { checkIn: 'desc' }, skip, take: limit,
      include: { room: { select: { id: true, name: true, type: true } } },
    }),
    prisma.reservation.count({ where }),
  ])

  return paginatedResponse(reservations, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`reservations.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const room = await prisma.room.findFirst({
    where: { id: body.roomId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!room) return jsonError('Room not found', 404)

  const reservation = await prisma.reservation.create({
    data: {
      roomId: body.roomId,
      guestName: body.guestName,
      guestEmail: body.guestEmail ?? '',
      guestPhone: body.guestPhone ?? '',
      checkIn: new Date(body.checkIn),
      checkOut: new Date(body.checkOut),
      status: body.status ?? 'confirmed',
      totalCents: body.totalCents ?? 0,
      notes: body.notes ?? '',
    },
  })

  publishEntityCreated(scope.organizationId, 'reservation', reservation.id, scope.userId)
  return NextResponse.json({ data: reservation }, { status: 201 })
}
