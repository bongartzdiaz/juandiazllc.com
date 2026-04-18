/* PATCH/DELETE /api/client-portal/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.clientPortalAccess.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Access not found', 404)

  const data: Record<string, unknown> = {}
  if (body.enabled !== undefined) data.enabled = body.enabled
  if (body.permissions !== undefined) {
    data.permissions = typeof body.permissions === 'string' ? body.permissions : JSON.stringify(body.permissions)
  }
  if (body.expiresAt !== undefined) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt as string) : null
  }

  const access = await prisma.clientPortalAccess.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'clientPortalAccess', entityId: id })
  publishEntityUpdated(scope.organizationId, 'clientPortalAccess', id, scope.userId)
  return NextResponse.json({ data: access })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.clientPortalAccess.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Access not found', 404)

  await prisma.clientPortalAccess.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'clientPortalAccess', entityId: id })
  publishEntityDeleted(scope.organizationId, 'clientPortalAccess', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
