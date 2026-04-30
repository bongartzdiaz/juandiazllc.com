/* GET/PATCH/DELETE /api/grants/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { updateGrantSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const grant = await prisma.grant.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!grant) return jsonError('Grant not found', 404)
  return NextResponse.json({ data: grant })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`grants.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const parsed = await validateBody(req, updateGrantSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const existing = await prisma.grant.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Grant not found', 404)

  const { appliedDate, awardedDate, startDate, endDate, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (appliedDate !== undefined) data.appliedDate = appliedDate ? new Date(appliedDate) : null
  if (awardedDate !== undefined) data.awardedDate = awardedDate ? new Date(awardedDate) : null
  if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
  if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null

  const grant = await prisma.grant.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'grant', entityId: id })
  publishEntityUpdated(scope.organizationId, 'grant', id, scope.userId)
  return NextResponse.json({ data: grant })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`grants.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.grant.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Grant not found', 404)

  await prisma.grant.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'grant', entityId: id })
  publishEntityDeleted(scope.organizationId, 'grant', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
