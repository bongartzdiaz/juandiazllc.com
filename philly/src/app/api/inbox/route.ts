/* GET  /api/inbox — list conversations (paginated)
   POST /api/inbox — create new conversation */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  const contactIds = Array.from(new Set(conversations.map(c => c.contactId).filter(Boolean)))
  const contacts = contactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: contactIds }, organizationId: scope.organizationId },
        select: { id: true, name: true, email: true, phone: true },
      })
    : []
  const contactById = new Map(contacts.map(c => [c.id, c]))

  const enriched = conversations.map(c => ({
    ...c,
    contact: contactById.get(c.contactId) ?? null,
  }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.contactId?.trim()) return jsonError('contactId is required', 400)

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
