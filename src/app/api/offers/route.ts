/* GET  /api/offers — list offers (filterable by property/deal/status)
   POST /api/offers — submit an offer */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const propertyId = url.searchParams.get('propertyId') ?? undefined
  const dealId = url.searchParams.get('dealId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    property: { organizationId: scope.organizationId },
    ...(propertyId ? { propertyId } : {}),
    ...(dealId ? { dealId } : {}),
    ...(status ? { status } : {}),
  }

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: {
        property: { select: { id: true, title: true, priceCents: true } },
        contact: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    prisma.offer.count({ where }),
  ])

  return paginatedResponse(offers, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.propertyId) return jsonError('propertyId is required', 400)
  if (!body.amountCents || body.amountCents <= 0) return jsonError('amountCents must be positive', 400)

  const prisma = getAuthPrisma()
  const prop = await prisma.property.findFirst({
    where: { id: body.propertyId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!prop) return jsonError('Property not found', 404)

  const offer = await prisma.offer.create({
    data: {
      propertyId: body.propertyId,
      dealId: body.dealId ?? null,
      contactId: body.contactId ?? null,
      amountCents: body.amountCents,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      earnestCents: body.earnestCents ?? 0,
      closingCostsCents: body.closingCostsCents ?? 0,
      inspectionDays: body.inspectionDays ?? 10,
      financingType: body.financingType ?? 'conventional',
      contingencies: body.contingencies ? JSON.stringify(body.contingencies) : '[]',
      notes: body.notes ?? '',
    },
    include: {
      property: { select: { id: true, title: true } },
      contact: { select: { id: true, name: true } },
    },
  })

  await logAudit({ scope, action: 'create', entity: 'deal' as any, entityId: offer.id })
  return NextResponse.json({ data: offer }, { status: 201 })
}
