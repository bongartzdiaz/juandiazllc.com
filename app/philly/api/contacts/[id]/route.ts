/* GET    /api/contacts/[id] — single contact (org-scoped)
   PATCH  /api/contacts/[id] — update (manager+ only)
   DELETE /api/contacts/[id] — delete (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { updateContactSchema } from '@/lib/philly/validation/schemas'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      contactProjects: { include: { project: true } },
    },
  })

  if (!contact) return jsonError('Contact not found', 404)
  return NextResponse.json({ data: contact })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params

  const parsed = await validateBody(req, updateContactSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Contact not found', 404)

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name
  if (input.email !== undefined) data.email = input.email
  if (input.phone !== undefined) data.phone = input.phone
  if (input.type !== undefined) data.type = input.type
  if (input.company !== undefined) data.company = input.company
  if (input.notes !== undefined) data.notes = input.notes
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl

  const contact = await prisma.contact.update({ where: { id }, data })

  const changes = diffChanges(existing as unknown as Record<string, unknown>, input as Record<string, unknown>)
  await logAudit({ scope, action: 'update', entity: 'contact', entityId: id, changes })
  publishEntityUpdated(scope.organizationId, 'contact', id, scope.userId)

  return NextResponse.json({ data: contact })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Contact not found', 404)

  await prisma.contact.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'contact', entityId: id })
  publishEntityDeleted(scope.organizationId, 'contact', id, scope.userId)

  return new NextResponse(null, { status: 204 })
}
