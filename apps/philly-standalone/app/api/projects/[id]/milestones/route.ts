/* GET  /api/projects/[id]/milestones — list milestones for a project
   POST /api/projects/[id]/milestones — add a milestone (manager+) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const createMilestoneSchema = z.object({
  title: z.string().trim().min(1, 'Title required'),
  dueDate: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Must be a valid ISO date string' }),
  status: z.enum(['pending', 'completed', 'overdue']).optional().default('pending'),
})

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const project = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!project) return jsonError('Project not found', 404)

  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId: id },
    orderBy: { dueDate: 'asc' },
  })

  return NextResponse.json({ data: milestones })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`projects.milestones.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const parsed = await validateBody(req, createMilestoneSchema)
  if (!parsed.success) return parsed.response
  const input = parsed.data

  const prisma = getAuthPrisma()

  const project = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!project) return jsonError('Project not found', 404)

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId: id,
      title: input.title,
      dueDate: new Date(input.dueDate),
      status: input.status,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'milestone', entityId: milestone.id })
  publishEntityUpdated(scope.organizationId, 'project', id, scope.userId)

  return NextResponse.json({ data: milestone }, { status: 201 })
}
