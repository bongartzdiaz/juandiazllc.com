/* GET  /api/rooms — list rooms
   POST /api/rooms — create room */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  type: z.string().trim().max(60).optional(),
  status: z.string().trim().max(60).optional(),
  floor: z.coerce.number().optional(),
  capacity: z.coerce.number().optional(),
  priceCentsNight: z.coerce.number().optional(),
  amenities: z.any().optional(),
  images: z.any().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
  }

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where, orderBy: { name: 'asc' }, skip, take: limit,
      include: { _count: { select: { reservations: true, housekeeping: true } } },
    }),
    prisma.room.count({ where }),
  ])

  return paginatedResponse(rooms, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`rooms.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const room = await prisma.room.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      type: body.type ?? 'standard',
      status: body.status ?? 'available',
      floor: body.floor ?? 1,
      capacity: body.capacity ?? 2,
      priceCentsNight: body.priceCentsNight ?? 0,
      amenities: body.amenities ? JSON.stringify(body.amenities) : '[]',
      images: body.images ? JSON.stringify(body.images) : '[]',
    },
  })

  publishEntityCreated(scope.organizationId, 'room', room.id, scope.userId)
  return NextResponse.json({ data: room }, { status: 201 })
}
