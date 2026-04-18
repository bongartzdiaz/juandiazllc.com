/* GET    /api/showings/[id] — single showing
   PATCH  /api/showings/[id] — update showing (status, feedback, rating)
   DELETE /api/showings/[id] — remove showing */

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
  const showing = await prisma.showing.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    include: {
      property: { select: { id: true, title: true, address: true, city: true } },
    },
  })
  if (!showing) return jsonError('Showing not found', 404)
  return NextResponse.json({ data: showing })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.showing.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Showing not found', 404)

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.feedback !== undefined) data.feedback = body.feedback
  if (body.rating !== undefined) data.rating = Math.min(5, Math.max(1, body.rating))
  if (body.notes !== undefined) data.notes = body.notes
  if (body.date !== undefined) data.date = new Date(body.date)

  const showing = await prisma.showing.update({
    where: { id }, data,
    include: { property: { select: { id: true, title: true, address: true, city: true } } },
  })
  await logAudit({ scope, action: 'update', entity: 'showing', entityId: id })
  publishEntityUpdated(scope.organizationId, 'showing', id, scope.userId)
  return NextResponse.json({ data: showing })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.showing.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Showing not found', 404)
  await prisma.showing.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'showing', entityId: id })
  publishEntityDeleted(scope.organizationId, 'showing', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
