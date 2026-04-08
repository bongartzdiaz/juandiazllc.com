/* GET    /api/contacts/[id] — single contact (org-scoped)
   PATCH  /api/contacts/[id] — update (manager+ only)
   DELETE /api/contacts/[id] — delete (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'

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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as Partial<{
    name: string
    email: string
    phone: string
    type: string
    company: string
    notes: string
    avatarUrl: string | null
  }>

  const prisma = getAuthPrisma()
  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Contact not found', 404)

  const data: Record<string, unknown> = {}
  if (input.name !== undefined) data.name = input.name.trim()
  if (input.email !== undefined) data.email = input.email.trim()
  if (input.phone !== undefined) data.phone = input.phone.trim()
  if (input.type !== undefined) data.type = input.type
  if (input.company !== undefined) data.company = input.company.trim()
  if (input.notes !== undefined) data.notes = input.notes
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl

  const contact = await prisma.contact.update({ where: { id }, data })
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
  return new NextResponse(null, { status: 204 })
}
