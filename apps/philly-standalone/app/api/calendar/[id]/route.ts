/* GET    /api/calendar/[id] — single event
   PATCH  /api/calendar/[id] — update event
   DELETE /api/calendar/[id] — delete event */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const patchSchema = z.object({
  title: z.string().trim().max(255).optional(),
  description: z.string().max(20000).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(255).optional(),
  color: z.string().max(20).optional(),
})

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

  const limited = enforceRateLimit(`calendar.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Event not found', 404)

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime)
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime)
  if (body.allDay !== undefined) data.allDay = body.allDay
  if (body.location !== undefined) data.location = body.location
  if (body.color !== undefined) data.color = body.color

  const event = await prisma.calendarEvent.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'calendarEvent', entityId: id })
  publishEntityUpdated(scope.organizationId, 'calendarEvent', id, scope.userId)
  return NextResponse.json({ data: event })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`calendar.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.calendarEvent.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Event not found', 404)

  await prisma.calendarEvent.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'calendarEvent', entityId: id })
  publishEntityDeleted(scope.organizationId, 'calendarEvent', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
