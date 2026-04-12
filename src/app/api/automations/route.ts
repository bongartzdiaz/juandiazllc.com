/* GET  /api/automations — list automation rules
   POST /api/automations — create a rule */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const rules = await prisma.automationRule.findMany({
    where: { organizationId: scope.organizationId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { automationLogs: true } } },
  })

  return NextResponse.json({ data: rules })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: {
    name?: string; trigger?: string; triggerConfig?: string
    actionType?: string; actionConfig?: string; enabled?: boolean
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.name?.trim()) return jsonError('name is required', 400)
  if (!body.trigger) return jsonError('trigger is required', 400)
  if (!body.actionType) return jsonError('actionType is required', 400)

  const prisma = getAuthPrisma()
  const rule = await prisma.automationRule.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      trigger: body.trigger,
      triggerConfig: body.triggerConfig ?? '{}',
      actionType: body.actionType,
      actionConfig: body.actionConfig ?? '{}',
      enabled: body.enabled ?? true,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'automationRule', entityId: rule.id })
  return NextResponse.json({ data: rule }, { status: 201 })
}
