/* GET  /api/inbox/:id/messages — list messages in conversation
   POST /api/inbox/:id/messages — send new message */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated, publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_SEND } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  body: z.string().trim().min(1, 'body is required').max(50_000),
  direction: z.string().max(20).optional(),
  fromAddress: z.string().max(255).optional(),
  toAddress: z.string().max(255).optional(),
  subject: z.string().max(255).optional(),
  bodyHtml: z.string().max(500_000).optional(),
})

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

  const limited = enforceRateLimit(`inbox.messages.send:${scope.userId}`, PRESET_SEND)
  if (limited) return limited

  const { id } = await params
  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

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
      body: body.body,
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
