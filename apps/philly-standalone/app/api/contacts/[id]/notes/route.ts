/* GET  /api/contacts/[id]/notes — list notes for a contact
   POST /api/contacts/[id]/notes — add a note */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { encryptPii, decryptPii } from '@/lib/philly/pii'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const { page, limit, skip } = parsePagination(req)
  const where = { contactId: id }
  const [notes, total] = await Promise.all([
    prisma.contactNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.contactNote.count({ where }),
  ])

  const decrypted = notes.map((n) => ({ ...n, content: decryptPii(n.content) ?? '' }))
  return paginatedResponse(decrypted, total, { page, limit, skip })
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

  const plaintext = body.content.trim()
  const note = await prisma.contactNote.create({
    data: { contactId: id, userId: scope.userId, content: encryptPii(plaintext) ?? '' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  await logAudit({ scope, action: 'create', entity: 'contact', entityId: id })
  // Return plaintext to the caller — the row is encrypted at rest, but
  // the response shape mirrors what the client just sent.
  return NextResponse.json({ data: { ...note, content: plaintext } }, { status: 201 })
}
