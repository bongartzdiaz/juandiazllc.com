/* GET  /api/scoring-rules — list scoring rules
   POST /api/scoring-rules — create rule */

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
  event: z.string().trim().min(1, 'event is required').max(120),
  points: z.coerce.number().optional(),
  decay: z.boolean().optional(),
  decayDays: z.coerce.number().optional(),
  enabled: z.boolean().optional(),
})

const patchSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(120).optional(),
  event: z.string().trim().min(1).max(120).optional(),
  points: z.coerce.number().optional(),
  decay: z.boolean().optional(),
  decayDays: z.coerce.number().optional(),
  enabled: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [rules, total] = await Promise.all([
    prisma.scoringRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.scoringRule.count({ where }),
  ])

  return paginatedResponse(rules, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`scoring-rules.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const rule = await prisma.scoringRule.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      event: body.event,
      points: body.points ?? 5,
      decay: body.decay ?? false,
      decayDays: body.decayDays ?? 90,
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'scoringRule', entityId: rule.id })
  return NextResponse.json({ data: rule }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`scoring-rules.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.scoringRule.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Rule not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.event !== undefined) data.event = body.event
  if (body.points !== undefined) data.points = body.points
  if (body.decay !== undefined) data.decay = body.decay
  if (body.decayDays !== undefined) data.decayDays = body.decayDays
  if (body.enabled !== undefined) data.enabled = body.enabled

  const rule = await prisma.scoringRule.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'scoringRule', entityId: body.id })
  return NextResponse.json({ data: rule })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`scoring-rules.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.scoringRule.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Rule not found', 404)

  await prisma.scoringRule.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'scoringRule', entityId: id })
  return new NextResponse(null, { status: 204 })
}
