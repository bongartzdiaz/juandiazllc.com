/* GET  /api/inbox/:id/messages — list messages in conversation
   POST /api/inbox/:id/messages — send new message */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated, publishEntityUpdated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await params
  const prisma = getAuthPrisma()

  // Verify conversation belongs to org
  const conv = await prisma.conversation.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!conv) return jsonError('Conversation not found', 404)

  const { page, limit, skip } = parsePagination(req)
  const where = { conversationId: id }
  const [messages, total] = await Promise.all([
    prisma.message.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: limit }),
    prisma.message.count({ where }),
  ])

  return paginatedResponse(messages, total, { page, limit, skip })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await params
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.body?.trim()) return jsonError('body is required', 400)

  const prisma = getAuthPrisma()
  const conv = await prisma.conversation.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!conv) return jsonError('Conversation not found', 404)

  const msg = await prisma.message.create({
    data: {
      conversationId: id,
      direction: body.direction ?? 'outbound',
      channel: conv.channel,
      fromAddress: body.fromAddress ?? '',
      toAddress: body.toAddress ?? '',
      subject: body.subject ?? conv.subject,
      body: body.body.trim(),
      bodyHtml: body.bodyHtml ?? '',
      status: body.direction === 'inbound' ? 'received' : 'sent',
    },
  })

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date(), status: 'open' },
  })

  await logAudit({ scope, action: 'create', entity: 'inboxMessage', entityId: msg.id })
  publishEntityCreated(scope.organizationId, 'inboxMessage', msg.id, undefined, msg)
  publishEntityUpdated(scope.organizationId, 'inboxConversation', id)
  return NextResponse.json({ data: msg }, { status: 201 })
}
