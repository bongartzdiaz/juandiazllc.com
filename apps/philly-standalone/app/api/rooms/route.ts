/* GET  /api/rooms — list rooms
   POST /api/rooms — create room */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const room = await prisma.room.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
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
