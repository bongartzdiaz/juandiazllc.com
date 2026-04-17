/* GET /api/impact — aggregated impact metrics for the org
   POST /api/impact — create a new impact metric

   Query params:
     ?projectId=<id>   restrict to one project (must belong to org)
     ?from=<iso>       only metrics on/after this date
     ?to=<iso>         only metrics on/before this date
*/

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { validateBody } from '@/lib/validation'
import { createImpactMetricSchema } from '@/lib/validation/schemas'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const projectId = url.searchParams.get('projectId') ?? undefined
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')

  let from: Date | undefined
  let to: Date | undefined
  if (fromStr) {
    const d = new Date(fromStr)
    if (isNaN(d.getTime())) return jsonError('from must be a valid date', 400)
    from = d
  }
  if (toStr) {
    const d = new Date(toStr)
    if (isNaN(d.getTime())) return jsonError('to must be a valid date', 400)
    to = d
  }

  const prisma = getAuthPrisma()

  if (projectId) {
    const owned = await prisma.project.findFirst({
      where: { id: projectId, organizationId: scope.organizationId },
      select: { id: true },
    })
    if (!owned) return jsonError('Project not found', 404)
  }

  const metrics = await prisma.impactMetric.findMany({
    where: {
      project: { organizationId: scope.organizationId },
      ...(projectId ? { projectId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    select: {
      projectId: true,
      metricType: true,
      value: true,
      project: { select: { id: true, title: true } },
    },
  })

  const totals: Record<string, number> = {}
  const byProjectMap = new Map<
    string,
    { projectId: string; projectTitle: string; totals: Record<string, number> }
  >()

  for (const m of metrics) {
    totals[m.metricType] = (totals[m.metricType] ?? 0) + m.value

    let bucket = byProjectMap.get(m.projectId)
    if (!bucket) {
      bucket = {
        projectId: m.projectId,
        projectTitle: m.project.title,
        totals: {},
      }
      byProjectMap.set(m.projectId, bucket)
    }
    bucket.totals[m.metricType] = (bucket.totals[m.metricType] ?? 0) + m.value
  }

  return NextResponse.json({
    data: {
      totals,
      byProject: Array.from(byProjectMap.values()),
      count: metrics.length,
    },
  })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createImpactMetricSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!project) return jsonError('Project not found', 404)

  const metric = await prisma.impactMetric.create({
    data: {
      projectId: input.projectId,
      metricType: input.metricType,
      value: input.value,
      unit: input.unit,
      notes: input.notes,
      ...(input.date ? { date: new Date(input.date) } : {}),
    },
  })

  await logAudit({ scope, action: 'create', entity: 'impactMetric', entityId: metric.id })

  return NextResponse.json({ data: metric }, { status: 201 })
}
