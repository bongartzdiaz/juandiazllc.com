/* GET/PATCH/DELETE /api/offers/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  amountCents: z.number().optional(),
  status: z.string().max(60).optional(),
  counterJson: z.any().optional(),
  contingencies: z.any().optional(),
  earnestCents: z.number().optional(),
  closingCostsCents: z.number().optional(),
  inspectionDays: z.number().optional(),
  financingType: z.string().max(60).optional(),
  notes: z.string().max(10000).optional(),
  contactId: z.string().max(120).optional(),
  dealId: z.string().max(120).optional(),
  expiresAt: z.string().nullable().optional(),
  respondedAt: z.string().nullable().optional(),
})

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('offers')
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const offer = await prisma.offer.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
  })
  if (!offer) return jsonError('Offer not found', 404)
  return NextResponse.json({ data: offer })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('offers', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`offers.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.offer.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Offer not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = [
    'amountCents', 'status', 'counterJson', 'contingencies', 'earnestCents',
    'closingCostsCents', 'inspectionDays', 'financingType', 'notes', 'contactId', 'dealId',
  ] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.expiresAt !== undefined) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt as string) : null
  }
  if (body.respondedAt !== undefined) {
    data.respondedAt = body.respondedAt ? new Date(body.respondedAt as string) : null
  }

  const offer = await prisma.offer.update({
    where: { id }, data,
    include: {
      property: { select: { id: true, title: true, address: true, city: true, priceCents: true } },
      contact: { select: { id: true, name: true, email: true } },
      deal: { select: { id: true, title: true } },
    },
  })
  await logAudit({ scope, action: 'update', entity: 'offer', entityId: id })
  publishEntityUpdated(scope.organizationId, 'offer', id, scope.userId)
  return NextResponse.json({ data: offer })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('offers', ['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`offers.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.offer.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Offer not found', 404)

  await prisma.offer.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'offer', entityId: id })
  publishEntityDeleted(scope.organizationId, 'offer', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
