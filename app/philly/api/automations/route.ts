/* GET   /api/automations — list automation rules
   POST  /api/automations — create a rule
   PATCH /api/automations — toggle enabled */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated, publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createAutomationRuleSchema, updateAutomationRuleSchema } from '@/lib/philly/validation/schemas'

function toJsonString(v: unknown): string {
  if (v === undefined || v === null) return '{}'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [rules, total] = await Promise.all([
    prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { _count: { select: { automationLogs: true } } },
    }),
    prisma.automationRule.count({ where }),
  ])

  return paginatedResponse(rules, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createAutomationRuleSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const rule = await prisma.automationRule.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      trigger: body.trigger,
      triggerConfig: toJsonString(body.triggerConfig),
      actionType: body.actionType,
      actionConfig: toJsonString(body.actionConfig),
      enabled: body.enabled,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'automationRule', entityId: rule.id })
  publishEntityCreated(scope.organizationId, 'automationRule', rule.id, scope.userId, rule)
  return NextResponse.json({ data: rule }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, updateAutomationRuleSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  if (!body.id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()

  // Verify the rule belongs to this organization
  const existing = await prisma.automationRule.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Rule not found', 404)

  const { id, triggerConfig, actionConfig, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (triggerConfig !== undefined) data.triggerConfig = toJsonString(triggerConfig)
  if (actionConfig !== undefined) data.actionConfig = toJsonString(actionConfig)

  const rule = await prisma.automationRule.update({
    where: { id },
    data,
  })

  await logAudit({ scope, action: 'update', entity: 'automationRule', entityId: rule.id })
  publishEntityUpdated(scope.organizationId, 'automationRule', rule.id, scope.userId, rule)
  return NextResponse.json({ data: rule })
}
