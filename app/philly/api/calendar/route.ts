/* GET  /api/calendar — events in a date range
   POST /api/calendar — create an event */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createCalendarEventSchema } from '@/lib/philly/validation/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(from || to ? {
      startTime: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  }
  const [events, total] = await Promise.all([
    prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: 'asc' },
      skip,
      take: limit,
      include: {
        attendees: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    prisma.calendarEvent.count({ where }),
  ])

  return paginatedResponse(events, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createCalendarEventSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const event = await prisma.calendarEvent.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title,
      description: body.description,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay,
      location: body.location,
      color: body.color,
      attendees: body.attendeeIds.length ? {
        create: body.attendeeIds.map(uid => ({ userId: uid })),
      } : undefined,
    },
    include: { attendees: { include: { user: { select: { id: true, name: true } } } } },
  })

  await logAudit({ scope, action: 'create', entity: 'calendarEvent', entityId: event.id })
  publishEntityCreated(scope.organizationId, 'calendarEvent', event.id, scope.userId)
  return NextResponse.json({ data: event }, { status: 201 })
}
