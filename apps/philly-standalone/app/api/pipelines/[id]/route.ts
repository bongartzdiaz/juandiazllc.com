/* GET/PATCH/DELETE /api/pipelines/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const patchSchema = z.object({
  name: z.string().trim().min(1, 'name cannot be empty').max(120).optional(),
  industry: z.string().trim().max(60).optional(),
})

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

  const limited = enforceRateLimit(`pipelines.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.pipeline.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Pipeline not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
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

  const limited = enforceRateLimit(`pipelines.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

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
