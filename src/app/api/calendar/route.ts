/* GET  /api/calendar — events in a date range
   POST /api/calendar — create an event */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const prisma = getAuthPrisma()
  const events = await prisma.calendarEvent.findMany({
    where: {
      organizationId: scope.organizationId,
      ...(from || to ? {
        startTime: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    orderBy: { startTime: 'asc' },
    include: {
      attendees: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json({ data: events })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: {
    title?: string; description?: string; startTime?: string; endTime?: string
    allDay?: boolean; location?: string; color?: string
    attendeeIds?: string[]
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.title?.trim()) return jsonError('title is required', 400)
  if (!body.startTime) return jsonError('startTime is required', 400)
  if (!body.endTime) return jsonError('endTime is required', 400)

  const prisma = getAuthPrisma()
  const event = await prisma.calendarEvent.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title.trim(),
      description: body.description ?? '',
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      allDay: body.allDay ?? false,
      location: body.location ?? '',
      color: body.color ?? '#3B82F6',
      attendees: body.attendeeIds?.length ? {
        create: body.attendeeIds.map(uid => ({ userId: uid })),
      } : undefined,
    },
    include: { attendees: { include: { user: { select: { id: true, name: true } } } } },
  })

  await logAudit({ scope, action: 'create', entity: 'calendarEvent' as any, entityId: event.id })
  return NextResponse.json({ data: event }, { status: 201 })
}
