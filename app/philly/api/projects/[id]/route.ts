/* GET    /api/projects/[id] — single project (org-scoped)
   PATCH  /api/projects/[id] — update (manager+ only)
   DELETE /api/projects/[id] — delete   (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { updateProjectSchema } from '@/lib/philly/validation/schemas'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('projects')
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const project = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      milestones: { orderBy: { dueDate: 'asc' } },
      impactMetrics: { orderBy: { date: 'desc' } },
      contactProjects: { include: { contact: true } },
    },
  })

  if (!project) return jsonError('Project not found', 404)
  return NextResponse.json({ data: project })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('projects', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params

  const parsed = await validateBody(req, updateProjectSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Project not found', 404)

  const data: Record<string, unknown> = {}
  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.status !== undefined) data.status = input.status
  if (input.category !== undefined) data.category = input.category
  if (input.startDate !== undefined) data.startDate = new Date(input.startDate)
  if (input.endDate !== undefined) data.endDate = input.endDate ? new Date(input.endDate) : null
  if (input.budgetCents !== undefined) data.budgetCents = input.budgetCents
  if (input.spentCents !== undefined) data.spentCents = input.spentCents
  if (input.sdgGoals !== undefined) data.sdgGoals = input.sdgGoals

  const project = await prisma.project.update({ where: { id }, data })

  const changes = diffChanges(existing as unknown as Record<string, unknown>, input as Record<string, unknown>)
  await logAudit({ scope, action: 'update', entity: 'project', entityId: id, changes })
  publishEntityUpdated(scope.organizationId, 'project', id, scope.userId)

  return NextResponse.json({ data: project })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('projects', ['admin'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, title: true },
  })
  if (!existing) return jsonError('Project not found', 404)

  await prisma.project.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'project', entityId: id })
  publishEntityDeleted(scope.organizationId, 'project', id, scope.userId)

  return new NextResponse(null, { status: 204 })
}
