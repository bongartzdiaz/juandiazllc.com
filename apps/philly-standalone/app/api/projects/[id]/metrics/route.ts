/* GET  /api/projects/[id]/metrics — impact metrics for a project
   POST /api/projects/[id]/metrics — record a new impact metric (manager+) */

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

const createMetricSchema = z.object({
  metricType: z.string().trim().min(1, 'metricType required'),
  value: z.number().finite(),
  unit: z.string().optional().default(''),
  date: z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Must be a valid ISO date string' }).optional(),
  notes: z.string().optional().default(''),
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

  const metrics = await prisma.impactMetric.findMany({
    where: { projectId: id },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json({ data: metrics })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`projects.metrics.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const parsed = await validateBody(req, createMetricSchema)
  if (!parsed.success) return parsed.response
  const input = parsed.data

  const prisma = getAuthPrisma()

  const project = await prisma.project.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!project) return jsonError('Project not found', 404)

  const metric = await prisma.impactMetric.create({
    data: {
      projectId: id,
      metricType: input.metricType,
      value: input.value,
      unit: input.unit,
      date: input.date ? new Date(input.date) : new Date(),
      notes: input.notes,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'impactMetric', entityId: metric.id })
  publishEntityUpdated(scope.organizationId, 'project', id, scope.userId)

  return NextResponse.json({ data: metric }, { status: 201 })
}
