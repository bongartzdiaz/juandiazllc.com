/* GET/PATCH/DELETE /api/documents/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const patchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  type: z.string().trim().max(40).optional(),
  mimeType: z.string().trim().max(120).optional(),
  entityType: z.string().trim().max(40).optional(),
  entityId: z.string().trim().max(80).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireSection('documents')
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
  const scope = await requireSection('documents', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`documents.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

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
  const scope = await requireSection('documents', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`documents.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

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
