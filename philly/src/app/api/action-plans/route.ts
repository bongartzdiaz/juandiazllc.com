/* GET  /api/action-plans — list action plans
   POST /api/action-plans — create action plan */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'
import { publishEntityCreated, publishEntityUpdated, publishEntityDeleted } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [plans, total] = await Promise.all([
    prisma.actionPlan.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { enrollments: true } } },
    }),
    prisma.actionPlan.count({ where }),
  ])

  return paginatedResponse(plans, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const plan = await prisma.actionPlan.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      description: body.description ?? '',
      triggerEvent: body.triggerEvent ?? 'manual',
      stepsJson: body.steps ? JSON.stringify(body.steps) : '[]',
      status: body.status ?? 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'actionPlan', entityId: plan.id })
  publishEntityCreated(scope.organizationId, 'actionPlan', plan.id, scope.userId, plan)
  return NextResponse.json({ data: plan }, { status: 201 })
}

const ALLOWED_STATUSES = ['active', 'paused', 'archived']

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (typeof body.id !== 'string' || !body.id) return jsonError('id is required', 400)

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.description === 'string') data.description = body.description
  if (typeof body.triggerEvent === 'string') data.triggerEvent = body.triggerEvent
  if (typeof body.status === 'string') {
    if (!ALLOWED_STATUSES.includes(body.status)) return jsonError(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400)
    data.status = body.status
  }
  if (Array.isArray(body.steps)) data.stepsJson = JSON.stringify(body.steps)

  if (Object.keys(data).length === 0) return jsonError('No valid fields to update', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.actionPlan.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Action plan not found', 404)

  const updated = await prisma.actionPlan.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'actionPlan', entityId: body.id })
  publishEntityUpdated(scope.organizationId, 'actionPlan', body.id, scope.userId, updated, existing)
  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.actionPlan.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Action plan not found', 404)

  await prisma.actionPlan.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'actionPlan', entityId: id })
  publishEntityDeleted(scope.organizationId, 'actionPlan', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
