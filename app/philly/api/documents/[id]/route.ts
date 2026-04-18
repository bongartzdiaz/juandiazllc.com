/* GET/PATCH/DELETE /api/documents/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!doc) return jsonError('Document not found', 404)
  return NextResponse.json({ data: doc })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.document.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Document not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.type !== undefined) data.type = body.type
  if (body.mimeType !== undefined) data.mimeType = body.mimeType
  if (body.entityType !== undefined) data.entityType = body.entityType
  if (body.entityId !== undefined) data.entityId = body.entityId

  const doc = await prisma.document.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'document', entityId: id })
  publishEntityUpdated(scope.organizationId, 'document', id, scope.userId)
  return NextResponse.json({ data: doc })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.document.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Document not found', 404)

  await prisma.document.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'document', entityId: id })
  publishEntityDeleted(scope.organizationId, 'document', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
