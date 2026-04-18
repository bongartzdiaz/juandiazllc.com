/* GET /api/impact — aggregated impact metrics for the org
   Query params:
     ?projectId=<id>   restrict to one project (must belong to org)
     ?from=<iso>       only metrics on/after this date
     ?to=<iso>         only metrics on/before this date

   Returns:
     {
       totals:    { co2_kg: number, people_helped: number, ... },
       byProject: [{ projectId, projectTitle, totals: {...} }],
       count:     number  // total metric rows considered
     }
*/

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'

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

  // If projectId is given, verify org ownership first
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

  // Aggregate totals by metricType
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as {
    projectId?: string
    metricType?: string
    value?: number
    unit?: string
    date?: string
    notes?: string
  }

  if (!input.projectId) return jsonError('projectId is required', 400)
  if (!input.metricType) return jsonError('metricType is required', 400)
  if (typeof input.value !== 'number' || isNaN(input.value)) {
    return jsonError('value must be a number', 400)
  }

  const prisma = getAuthPrisma()

  // Verify project belongs to caller's org
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!project) return jsonError('Project not found', 404)

  let date: Date | undefined
  if (input.date) {
    const d = new Date(input.date)
    if (isNaN(d.getTime())) return jsonError('date must be a valid date', 400)
    date = d
  }

  const metric = await prisma.impactMetric.create({
    data: {
      projectId: input.projectId,
      metricType: input.metricType,
      value: input.value,
      unit: input.unit ?? '',
      notes: input.notes ?? '',
      ...(date ? { date } : {}),
    },
  })

  return NextResponse.json({ data: metric }, { status: 201 })
}
