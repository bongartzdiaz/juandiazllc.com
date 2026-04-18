/* GET/PATCH/DELETE /api/reservations/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const reservation = await prisma.reservation.findFirst({
    where: { id, room: { organizationId: scope.organizationId } },
    include: { room: { select: { id: true, name: true } } },
  })
  if (!reservation) return jsonError('Reservation not found', 404)
  return NextResponse.json({ data: reservation })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.reservation.findFirst({
    where: { id, room: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Reservation not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = ['guestName', 'guestEmail', 'guestPhone', 'status', 'totalCents', 'notes', 'roomId'] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.checkIn !== undefined) data.checkIn = new Date(body.checkIn as string)
  if (body.checkOut !== undefined) data.checkOut = new Date(body.checkOut as string)

  const reservation = await prisma.reservation.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'reservation', entityId: id })
  publishEntityUpdated(scope.organizationId, 'reservation', id, scope.userId)
  return NextResponse.json({ data: reservation })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.reservation.findFirst({
    where: { id, room: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Reservation not found', 404)

  await prisma.reservation.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'reservation', entityId: id })
  publishEntityDeleted(scope.organizationId, 'reservation', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
