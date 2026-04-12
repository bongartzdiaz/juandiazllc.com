/* GET  /api/contacts/[id]/notes — list notes for a contact
   POST /api/contacts/[id]/notes — add a note */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const notes = await prisma.contactNote.findMany({
    where: { contactId: id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  return NextResponse.json({ data: notes })
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params

  let body: { content?: string }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.content?.trim()) return jsonError('content is required', 400)

  const prisma = getAuthPrisma()
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const note = await prisma.contactNote.create({
    data: { contactId: id, userId: scope.userId, content: body.content.trim() },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  await logAudit({ scope, action: 'create', entity: 'contact', entityId: id })
  return NextResponse.json({ data: note }, { status: 201 })
}
