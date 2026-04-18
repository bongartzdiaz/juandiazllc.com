/* GET/PATCH/DELETE /api/pipelines/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      stages: { orderBy: { position: 'asc' } },
      _count: { select: { deals: true } },
    },
  })
  if (!pipeline) return jsonError('Pipeline not found', 404)
  return NextResponse.json({ data: pipeline })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.pipeline.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Pipeline not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const n = String(body.name).trim()
    if (!n) return jsonError('name cannot be empty', 400)
    data.name = n
  }
  if (body.industry !== undefined) data.industry = body.industry

  const pipeline = await prisma.pipeline.update({
    where: { id }, data,
    include: { stages: { orderBy: { position: 'asc' } }, _count: { select: { deals: true } } },
  })
  await logAudit({ scope, action: 'update', entity: 'pipeline', entityId: id })
  return NextResponse.json({ data: pipeline })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.pipeline.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: { _count: { select: { deals: true } } },
  })
  if (!existing) return jsonError('Pipeline not found', 404)

  if (existing._count.deals > 0) {
    return jsonError(`Cannot delete pipeline with ${existing._count.deals} deals. Move or delete deals first.`, 400)
  }

  await prisma.pipeline.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'pipeline', entityId: id })
  return new NextResponse(null, { status: 204 })
}
