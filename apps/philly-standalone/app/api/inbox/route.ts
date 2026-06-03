/* GET  /api/inbox — list conversations (paginated)
   POST /api/inbox — create new conversation */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { decryptPii } from '@/lib/philly/pii'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  contactId: z.string().trim().min(1, 'contactId is required').max(255),
  channel: z.string().max(20).optional(),
  subject: z.string().max(255).optional(),
  assignedTo: z.string().max(255).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const channel = url.searchParams.get('channel') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
    ...(contactId ? { contactId } : {}),
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where, orderBy: { lastMessageAt: 'desc' }, skip, take: limit,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.conversation.count({ where }),
  ])

  // Batch-load contacts (no relation in schema — manual join)
  const contactIds = Array.from(new Set(conversations.map((c: any) => c.contactId).filter(Boolean)))
  const contacts = contactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId: scope.organizationId },
        select: { id: true, name: true, email: true, phone: true },
      })
    : []
  // Decrypt email/phone (Bundle P) for the inline-display join.
  const contactById = new Map(
    contacts.map((c: any) => [c.id, {
      ...c,
      email: decryptPii(c.email) ?? '',
      phone: decryptPii(c.phone) ?? '',
    }]),
  )

  const enriched = conversations.map((c: any) => ({
    ...c,
    contact: contactById.get(c.contactId) ?? null,
  }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`inbox.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const conv = await prisma.conversation.create({
    data: {
      organizationId: scope.organizationId,
      contactId: body.contactId,
      channel: body.channel ?? 'email',
      subject: body.subject ?? '',
      status: 'open',
      assignedTo: body.assignedTo ?? scope.userId,
      lastMessageAt: new Date(),
    },
  })

  await logAudit({ scope, action: 'create', entity: 'inboxConversation', entityId: conv.id })
  return NextResponse.json({ data: conv }, { status: 201 })
}
