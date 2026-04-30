/* GET / PATCH / DELETE /api/automations/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { updateAutomationRuleSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function toJsonString(v: unknown): string {
  if (v === undefined || v === null) return '{}'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const rule = await prisma.automationRule.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: { _count: { select: { automationLogs: true } } },
  })
  if (!rule) return jsonError('Rule not found', 404)
  return NextResponse.json({ data: rule })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`automations.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  const parsed = await validateBody(req, updateAutomationRuleSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const existing = await prisma.automationRule.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Rule not found', 404)

  const { id: _ignored, triggerConfig, actionConfig, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (triggerConfig !== undefined) data.triggerConfig = toJsonString(triggerConfig)
  if (actionConfig !== undefined) data.actionConfig = toJsonString(actionConfig)

  const updated = await prisma.automationRule.update({ where: { id }, data })
  const changes = diffChanges(existing as unknown as Record<string, unknown>, data)
  await logAudit({ scope, action: 'update', entity: 'automationRule', entityId: id, changes })
  publishEntityUpdated(scope.organizationId, 'automationRule', id, scope.userId, updated, existing)
  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`automations.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  const prisma = getAuthPrisma()
  const existing = await prisma.automationRule.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Rule not found', 404)

  await prisma.automationRule.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'automationRule', entityId: id })
  publishEntityDeleted(scope.organizationId, 'automationRule', id, scope.userId)
  return NextResponse.json({ data: { id } })
}
