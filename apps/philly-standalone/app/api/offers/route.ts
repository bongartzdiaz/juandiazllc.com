/* GET  /api/offers — list offers (filterable by property/deal/status)
   POST /api/offers — submit an offer */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  propertyId: z.string().trim().min(1, 'propertyId is required').max(120),
  amountCents: z.number().positive('amountCents must be positive'),
  dealId: z.string().max(120).optional(),
  contactId: z.string().max(120).optional(),
  expiresAt: z.string().optional(),
  earnestCents: z.number().optional(),
  closingCostsCents: z.number().optional(),
  inspectionDays: z.number().optional(),
  financingType: z.string().max(60).optional(),
  contingencies: z.any().optional(),
  notes: z.string().max(10000).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireSection('offers')
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
        property: { select: { id: true, title: true, address: true, city: true, priceCents: true } },
        contact: { select: { id: true, name: true, email: true } },
        deal: { select: { id: true, title: true } },
      },
    }),
    prisma.offer.count({ where }),
  ])

  return paginatedResponse(offers, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('offers', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`offers.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

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

  await logAudit({ scope, action: 'create', entity: 'offer', entityId: offer.id })
  publishEntityCreated(scope.organizationId, 'offer', offer.id, scope.userId)
  return NextResponse.json({ data: offer }, { status: 201 })
}
