/* GET  /api/contacts/[id]/notes — list notes for a contact
   POST /api/contacts/[id]/notes — add a note */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { encryptPii, decryptPii } from '@/lib/philly/pii'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createNoteSchema = z.object({
  content: z.string().trim().min(1, 'content is required').max(10_000),
})

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

  const limited = enforceRateLimit(`contacts.notes.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const body = await parseBody(req, createNoteSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const plaintext = body.content
  const note = await prisma.contactNote.create({
    data: { contactId: id, userId: scope.userId, content: encryptPii(plaintext) ?? '' },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })

  await logAudit({ scope, action: 'create', entity: 'contact', entityId: id })
  // Return plaintext to the caller — the row is encrypted at rest, but
  // the response shape mirrors what the client just sent.
  return NextResponse.json({ data: { ...note, content: plaintext } }, { status: 201 })
}
