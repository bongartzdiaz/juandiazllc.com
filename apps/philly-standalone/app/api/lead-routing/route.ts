/* GET  /api/lead-routing — list routing rules
   POST /api/lead-routing — create routing rule */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { idSchema } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  strategy: z.string().trim().max(60).optional(),
  criteria: z.unknown().optional(),
  agentPool: z.unknown().optional(),
  enabled: z.boolean().optional(),
})

const patchSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120).optional(),
  strategy: z.string().trim().max(60).optional(),
  criteria: z.unknown().optional(),
  agentPool: z.unknown().optional(),
  enabled: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [rules, total] = await Promise.all([
    prisma.leadRoutingRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.leadRoutingRule.count({ where }),
  ])

  return paginatedResponse(rules, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`lead-routing.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const rule = await prisma.leadRoutingRule.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      strategy: body.strategy ?? 'round_robin',
      criteria: body.criteria ? JSON.stringify(body.criteria) : '{}',
      agentPool: body.agentPool ? JSON.stringify(body.agentPool) : '[]',
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'leadRoutingRule', entityId: rule.id })
  return NextResponse.json({ data: rule }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`lead-routing.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.leadRoutingRule.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Rule not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.strategy !== undefined) data.strategy = body.strategy
  if (body.enabled !== undefined) data.enabled = body.enabled
  if (body.criteria !== undefined) {
    data.criteria = typeof body.criteria === 'string' ? body.criteria : JSON.stringify(body.criteria)
  }
  if (body.agentPool !== undefined) {
    data.agentPool = typeof body.agentPool === 'string' ? body.agentPool : JSON.stringify(body.agentPool)
  }

  const rule = await prisma.leadRoutingRule.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'leadRoutingRule', entityId: body.id })
  return NextResponse.json({ data: rule })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`lead-routing.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.leadRoutingRule.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Rule not found', 404)

  await prisma.leadRoutingRule.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'leadRoutingRule', entityId: id })
  return new NextResponse(null, { status: 204 })
}
