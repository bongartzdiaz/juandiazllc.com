/* POST /api/pipelines/[id]/stages — add a stage to a pipeline
   PUT  /api/pipelines/[id]/stages — reorder all stages (body: [{id, position}]) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pipelines.stage.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id: pipelineId } = await ctx.params
  let body: { name?: string; color?: string; position?: number }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId: scope.organizationId },
    include: { stages: { orderBy: { position: 'desc' }, take: 1 } },
  })
  if (!pipeline) return jsonError('Pipeline not found', 404)

  const position = body.position ?? ((pipeline.stages[0]?.position ?? -1) + 1)
  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId,
      name: body.name.trim(),
      position,
      color: body.color ?? '#94A3B8',
    },
  })
  await logAudit({ scope, action: 'create', entity: 'pipelineStage', entityId: stage.id })
  return NextResponse.json({ data: stage }, { status: 201 })
}

/* PUT body: { stages: [{id, position}] } — updates many positions in a transaction */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pipelines.stage.reorder:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id: pipelineId } = await ctx.params
  let body: { stages?: { id: string; position: number }[] }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!Array.isArray(body.stages)) return jsonError('stages array required', 400)

  const prisma = getAuthPrisma()
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!pipeline) return jsonError('Pipeline not found', 404)

  await prisma.$transaction(
    body.stages.map(s =>
      prisma.pipelineStage.update({
        where: { id: s.id },
        data: { position: s.position },
      }),
    ),
  )
  await logAudit({ scope, action: 'update', entity: 'pipeline', entityId: pipelineId })
  return NextResponse.json({ ok: true })
}
