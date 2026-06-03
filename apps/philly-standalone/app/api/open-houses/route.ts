/* GET  /api/open-houses — list open houses
   POST /api/open-houses — create open house */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  propertyId: z.string().trim().min(1, 'propertyId is required').max(120),
  date: z.string().min(1, 'date is required'),
  hostAgentId: z.string().max(120).optional(),
  startTime: z.string().max(40).optional(),
  endTime: z.string().max(40).optional(),
  notes: z.string().max(10000).optional(),
})

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

  const limited = enforceRateLimit(`open-houses.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

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
