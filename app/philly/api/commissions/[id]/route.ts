/* GET/PATCH/DELETE /api/commissions/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const rec = await prisma.commissionRecord.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!rec) return jsonError('Commission not found', 404)
  return NextResponse.json({ data: rec })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.commissionRecord.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Commission not found', 404)

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes
  if (body.type !== undefined) data.type = body.type
  if (body.grossCents !== undefined) data.grossCents = body.grossCents
  if (body.splitPct !== undefined) data.splitPct = body.splitPct

  // Recompute net if gross or split changed
  if (data.grossCents !== undefined || data.splitPct !== undefined) {
    const gross = (data.grossCents as number | undefined) ?? existing.grossCents
    const split = (data.splitPct as number | undefined) ?? existing.splitPct
    data.netCents = Math.round(gross * (split / 100))
  }

  const rec = await prisma.commissionRecord.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'commissionRecord', entityId: id })
  publishEntityUpdated(scope.organizationId, 'commissionRecord', id, scope.userId)
  return NextResponse.json({ data: rec })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.commissionRecord.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Commission not found', 404)

  await prisma.commissionRecord.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'commissionRecord', entityId: id })
  publishEntityDeleted(scope.organizationId, 'commissionRecord', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
