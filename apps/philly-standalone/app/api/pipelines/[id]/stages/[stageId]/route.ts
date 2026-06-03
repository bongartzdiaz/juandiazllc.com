/* PATCH/DELETE /api/pipelines/[id]/stages/[stageId] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const patchSchema = z.object({
  name: z.string().trim().min(1, 'name cannot be empty').max(60).optional(),
  color: z.string().max(20).optional(),
  position: z.coerce.number().int().optional(),
})

type Ctx = { params: Promise<{ id: string; stageId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pipelines.stage.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id: pipelineId, stageId } = await ctx.params
  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId, pipeline: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Stage not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.color !== undefined) data.color = body.color
  if (body.position !== undefined) data.position = body.position

  const stage = await prisma.pipelineStage.update({ where: { id: stageId }, data })
  await logAudit({ scope, action: 'update', entity: 'pipelineStage', entityId: stageId })
  return NextResponse.json({ data: stage })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pipelines.stage.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id: pipelineId, stageId } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId, pipeline: { organizationId: scope.organizationId } },
    include: { _count: { select: { deals: true } } },
  })
  if (!existing) return jsonError('Stage not found', 404)

  if (existing._count.deals > 0) {
    return jsonError(`Cannot delete stage with ${existing._count.deals} deals. Move deals to another stage first.`, 400)
  }

  await prisma.pipelineStage.delete({ where: { id: stageId } })
  await logAudit({ scope, action: 'delete', entity: 'pipelineStage', entityId: stageId })
  return new NextResponse(null, { status: 204 })
}
