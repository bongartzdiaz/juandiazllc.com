/* GET/PATCH/DELETE /api/deals/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { updateDealSchema } from '@/lib/philly/validation/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const dealInclude = {
  stage: { select: { id: true, name: true, color: true } },
  contact: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  pipeline: { select: { id: true, name: true } },
  project: { select: { id: true, title: true } },
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const deal = await prisma.deal.findFirst({
    where: { id, pipeline: { organizationId: scope.organizationId } },
    include: dealInclude,
  })
  if (!deal) return jsonError('Deal not found', 404)
  return NextResponse.json({ data: deal })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const parsed = await validateBody(req, updateDealSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const existing = await prisma.deal.findFirst({
    where: { id, pipeline: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Deal not found', 404)

  const { expectedClose, actualClose, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (expectedClose !== undefined) {
    data.expectedClose = expectedClose ? new Date(expectedClose) : null
  }
  if (actualClose !== undefined) {
    data.actualClose = actualClose ? new Date(actualClose) : null
  }

  const deal = await prisma.deal.update({ where: { id }, data, include: dealInclude })
  await logAudit({ scope, action: 'update', entity: 'deal', entityId: id })
  publishEntityUpdated(scope.organizationId, 'deal', id, scope.userId)
  return NextResponse.json({ data: deal })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.deal.findFirst({
    where: { id, pipeline: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Deal not found', 404)

  await prisma.deal.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'deal', entityId: id })
  publishEntityDeleted(scope.organizationId, 'deal', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
