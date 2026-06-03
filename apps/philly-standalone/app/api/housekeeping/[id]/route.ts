/* PATCH /api/housekeeping/[id] — update status / priority / assignee
   DELETE /api/housekeeping/[id] — delete (admin/manager only)

   Tenancy enforced via the Room relation. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  status: z.string().trim().max(60).optional(),
  type: z.string().trim().max(60).optional(),
  priority: z.string().trim().max(60).optional(),
  assignedTo: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(10_000).optional(),
})

const ALLOWED_TYPES = new Set(['cleaning', 'inspection', 'maintenance', 'turnover'])
const ALLOWED_STATUSES = new Set(['pending', 'in_progress', 'completed'])
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`housekeeping:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const body = await parseBody(req, updateSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.housekeepingTask.findFirst({
    where: { id, room: { organizationId: scope.organizationId } },
    select: { id: true, status: true },
  })
  if (!existing) return jsonError('Task not found', 404)

  const data: Record<string, unknown> = {}
  if (body.status && ALLOWED_STATUSES.has(body.status)) {
    data.status = body.status
    // Stamp completion time on transition to completed.
    if (body.status === 'completed' && existing.status !== 'completed') {
      data.completedAt = new Date()
    }
    if (body.status !== 'completed') data.completedAt = null
  }
  if (body.type && ALLOWED_TYPES.has(body.type)) data.type = body.type
  if (body.priority && ALLOWED_PRIORITIES.has(body.priority)) data.priority = body.priority
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo
  if (typeof body.notes === 'string') data.notes = body.notes

  if (Object.keys(data).length === 0) return jsonError('No editable fields supplied', 400)

  const task = await prisma.housekeepingTask.update({ where: { id }, data })

  await logAudit({
    scope, action: 'update', entity: 'housekeepingTask', entityId: id,
  }).catch(() => { /* best-effort */ })

  return NextResponse.json({ data: task })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`housekeeping:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.housekeepingTask.findFirst({
    where: { id, room: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Task not found', 404)

  await prisma.housekeepingTask.delete({ where: { id } })
  await logAudit({
    scope, action: 'delete', entity: 'housekeepingTask', entityId: id,
  }).catch(() => { /* best-effort */ })
  return new NextResponse(null, { status: 204 })
}
