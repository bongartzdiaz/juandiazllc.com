/* GET / PATCH / DELETE /api/templates/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { extractVariables } from '@/lib/philly/templates/renderer'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { updateTemplateSchema } from '@/lib/philly/validation/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const tpl = await prisma.template.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!tpl) return jsonError('Template not found', 404)
  return NextResponse.json({ data: tpl })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const parsed = await validateBody(req, updateTemplateSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const existing = await prisma.template.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Template not found', 404)

  const { variables, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if (variables !== undefined) {
    data.variables = JSON.stringify(variables)
  } else if (typeof body.body === 'string') {
    // Auto-detect variables when body changes and variables not explicitly provided
    data.variables = JSON.stringify(extractVariables(body.body))
  }

  const updated = await prisma.template.update({ where: { id }, data })
  const changes = diffChanges(existing as unknown as Record<string, unknown>, data)
  await logAudit({ scope, action: 'update', entity: 'template', entityId: id, changes })
  publishEntityUpdated(scope.organizationId, 'template', id, scope.userId, updated, existing)
  return NextResponse.json({ data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const existing = await prisma.template.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Template not found', 404)

  await prisma.template.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'template', entityId: id })
  publishEntityDeleted(scope.organizationId, 'template', id, scope.userId)
  return NextResponse.json({ data: { id } })
}
