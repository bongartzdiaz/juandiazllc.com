/* GET  /api/showings — list showings (filterable by property/date)
   POST /api/showings — schedule a showing */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireSection('showings')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const propertyId = url.searchParams.get('propertyId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const prisma = getAuthPrisma()
  const where = {
    property: { organizationId: scope.organizationId },
    ...(propertyId ? { propertyId } : {}),
    ...(status ? { status } : {}),
    ...(from || to ? {
      date: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  }

  const [showings, total] = await Promise.all([
    prisma.showing.findMany({
      where, orderBy: { date: 'desc' }, skip, take: limit,
      include: {
        property: { select: { id: true, title: true, address: true, city: true } },
      },
    }),
    prisma.showing.count({ where }),
  ])

  return paginatedResponse(showings, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('showings', ['admin', 'manager'])
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

  const showing = await prisma.showing.create({
    data: {
      propertyId: body.propertyId,
      agentId: body.agentId ?? scope.userId,
      contactId: body.contactId ?? null,
      date: new Date(body.date),
      duration: body.duration ?? 30,
      status: body.status ?? 'scheduled',
      notes: body.notes ?? '',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'showing', entityId: showing.id })
  publishEntityCreated(scope.organizationId, 'showing', showing.id, scope.userId)
  return NextResponse.json({ data: showing }, { status: 201 })
}
