/* PATCH /api/projects/[id]/milestones/[msId] — update milestone (toggle status etc.)
   DELETE /api/projects/[id]/milestones/[msId] — remove milestone */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { validateBody } from '@/lib/validation'
import { logAudit } from '@/lib/audit'
import { publishEntityUpdated } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string; msId: string }> }

const patchMilestoneSchema = z.object({
  title: z.string().trim().min(1).optional(),
  dueDate: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Must be a valid ISO date string' }).optional(),
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
}).refine(o => Object.keys(o).length > 0, { message: 'At least one field is required' })

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id, msId } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.projectMilestone.findFirst({
    where: { id: msId, projectId: id, project: { organizationId: scope.organizationId } },
  })
  if (!existing) return jsonError('Milestone not found', 404)

  const parsed = await validateBody(req, patchMilestoneSchema)
  if (!parsed.success) return parsed.response
  const input = parsed.data

  const data: Record<string, unknown> = {}
  if (input.title !== undefined) data.title = input.title
  if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate)
  if (input.status !== undefined) {
    data.status = input.status
    data.completedAt = input.status === 'completed' ? new Date() : null
  }

  const updated = await prisma.projectMilestone.update({
    where: { id: msId },
    data,
  })

  await logAudit({ scope, action: 'update', entity: 'milestone', entityId: msId })
  publishEntityUpdated(scope.organizationId, 'project', id, scope.userId)

  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id, msId } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.projectMilestone.findFirst({
    where: { id: msId, projectId: id, project: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Milestone not found', 404)

  await prisma.projectMilestone.delete({ where: { id: msId } })
  await logAudit({ scope, action: 'delete', entity: 'milestone', entityId: msId })
  publishEntityUpdated(scope.organizationId, 'project', id, scope.userId)

  return new NextResponse(null, { status: 204 })
}
