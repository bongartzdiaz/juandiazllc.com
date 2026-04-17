/* PATCH/DELETE /api/pipelines/[id]/stages/[stageId] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string; stageId: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id: pipelineId, stageId } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId, pipeline: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Stage not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const n = String(body.name).trim()
    if (!n) return jsonError('name cannot be empty', 400)
    data.name = n
  }
  if (body.color !== undefined) data.color = body.color
  if (body.position !== undefined) data.position = body.position

  const stage = await prisma.pipelineStage.update({ where: { id: stageId }, data })
  await logAudit({ scope, action: 'update', entity: 'pipelineStage', entityId: stageId })
  return NextResponse.json({ data: stage })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
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
