/* PATCH/DELETE /api/client-portal/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  permissions: z.any().optional(),
  expiresAt: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`client-portal.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

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

  const limited = enforceRateLimit(`client-portal.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

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
