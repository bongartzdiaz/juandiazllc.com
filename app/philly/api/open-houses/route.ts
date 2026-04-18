/* GET  /api/open-houses — list open houses
   POST /api/open-houses — create open house */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { property: { organizationId: scope.organizationId } }

  const [openHouses, total] = await Promise.all([
    prisma.openHouse.findMany({
      where, orderBy: { date: 'desc' }, skip, take: limit,
      include: {
        property: { select: { id: true, title: true, address: true, city: true, priceCents: true } },
        _count: { select: { visitors: true } },
      },
    }),
    prisma.openHouse.count({ where }),
  ])

  return paginatedResponse(openHouses, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.propertyId) return jsonError('propertyId is required', 400)
  if (!body.date) return jsonError('date is required', 400)

  const prisma = getAuthPrisma()
  const prop = await prisma.property.findFirst({
    where: { id: body.propertyId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!prop) return jsonError('Property not found', 404)

  const oh = await prisma.openHouse.create({
    data: {
      propertyId: body.propertyId,
      hostAgentId: body.hostAgentId ?? scope.userId,
      date: new Date(body.date),
      startTime: body.startTime ?? '10:00',
      endTime: body.endTime ?? '14:00',
      notes: body.notes ?? '',
    },
    include: {
      property: { select: { id: true, title: true, address: true, city: true, priceCents: true } },
      _count: { select: { visitors: true } },
    },
  })

  await logAudit({ scope, action: 'create', entity: 'openHouse', entityId: oh.id })
  publishEntityCreated(scope.organizationId, 'openHouse', oh.id, scope.userId)
  return NextResponse.json({ data: oh }, { status: 201 })
}
