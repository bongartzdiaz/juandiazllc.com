/* GET  /api/housekeeping — list housekeeping tasks
   POST /api/housekeeping — create a task (manager+ only)

   Bundle AX wired the existing HousekeepingTask schema model up
   to a real route. Tenancy is enforced through the Room → org
   relation since HousekeepingTask doesn't carry its own
   organizationId column. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  roomId: z.string().trim().min(1, 'roomId is required').max(80),
  type: z.string().trim().max(60).optional(),
  status: z.string().trim().max(60).optional(),
  priority: z.string().trim().max(60).optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(10_000).optional(),
})

const ALLOWED_TYPES = new Set(['cleaning', 'inspection', 'maintenance', 'turnover'])
const ALLOWED_STATUSES = new Set(['pending', 'in_progress', 'completed'])
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const roomId = url.searchParams.get('roomId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    room: { organizationId: scope.organizationId },
    ...(status ? { status } : {}),
    ...(roomId ? { roomId } : {}),
  }

  const [tasks, total] = await Promise.all([
    prisma.housekeepingTask.findMany({
      where,
      orderBy: [
        { status: 'asc' }, // pending first, then in_progress, then completed
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip, take: limit,
      include: { room: { select: { id: true, name: true, type: true } } },
    }),
    prisma.housekeepingTask.count({ where }),
  ])

  return paginatedResponse(tasks, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`housekeeping:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const room = await prisma.room.findFirst({
    where: { id: body.roomId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!room) return jsonError('Room not found', 404)

  const type = body.type && ALLOWED_TYPES.has(body.type) ? body.type : 'cleaning'
  const status = body.status && ALLOWED_STATUSES.has(body.status) ? body.status : 'pending'
  const priority = body.priority && ALLOWED_PRIORITIES.has(body.priority) ? body.priority : 'medium'

  const task = await prisma.housekeepingTask.create({
    data: {
      roomId: body.roomId,
      type, status, priority,
      assignedTo: body.assignedTo ?? null,
      notes: body.notes ?? '',
    },
  })

  await logAudit({
    scope, action: 'create', entity: 'housekeepingTask', entityId: task.id,
  }).catch(() => { /* best-effort */ })

  publishEntityCreated(scope.organizationId, 'housekeepingTask', task.id, scope.userId)
  return NextResponse.json({ data: task }, { status: 201 })
}
