/* GET    /api/calendar/[id] — single event
   PATCH  /api/calendar/[id] — update event
   DELETE /api/calendar/[id] — delete event */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const event = await prisma.calendarEvent.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: { attendees: { include: { user: { select: { id: true, name: true } } } } },
  })
  if (!event) return jsonError('Event not found', 404)
  return NextResponse.json({ data: event })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Event not found', 404)

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = (body.title as string).trim()
  if (body.description !== undefined) data.description = body.description
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime as string)
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime as string)
  if (body.allDay !== undefined) data.allDay = body.allDay
  if (body.location !== undefined) data.location = body.location
  if (body.color !== undefined) data.color = body.color

  const event = await prisma.calendarEvent.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'calendarEvent' as any, entityId: id })
  return NextResponse.json({ data: event })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Event not found', 404)

  await prisma.calendarEvent.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'calendarEvent' as any, entityId: id })
  return new NextResponse(null, { status: 204 })
}
