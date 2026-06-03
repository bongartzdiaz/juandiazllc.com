/* GET  /api/sms — list SMS/WhatsApp messages
   POST /api/sms — send a message via Twilio adapter */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { sendSms } from '@/lib/philly/sms/send'
import { serverError } from '@/lib/philly/safe-error'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_SEND } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const sendSchema = z
  .object({
    toNumber: z.string().trim().min(1, 'toNumber is required').max(40),
    fromNumber: z.string().max(40).optional(),
    body: z.string().max(50_000).optional(),
    channel: z.string().max(20).optional(),
    contactId: z.string().max(255).optional(),
    templateId: z.string().max(255).optional(),
    templateContext: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => (typeof b.templateId === 'string' && b.templateId) || (typeof b.body === 'string' && b.body.trim()), {
    message: 'body or templateId is required',
    path: ['body'],
  })

export async function GET(req: NextRequest) {
  const scope = await requireSection('sms')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const channel = url.searchParams.get('channel') ?? undefined
  const status = url.searchParams.get('status') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
    ...(contactId ? { contactId } : {}),
  }

  const [messages, total] = await Promise.all([
    prisma.smsMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.smsMessage.count({ where }),
  ])

  return paginatedResponse(messages, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('sms', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  // Strict rate limit for outbound SMS (per org) to block runaway loops & abuse.
  const limited = enforceRateLimit(`sms:send:${scope.organizationId}`, PRESET_SEND)
  if (limited) return limited

  const body = await parseBody(req, sendSchema)
  if (body instanceof NextResponse) return body

  try {
    const result = await sendSms(scope.organizationId, {
      toNumber: body.toNumber,
      fromNumber: typeof body.fromNumber === 'string' ? body.fromNumber : undefined,
      body: typeof body.body === 'string' ? body.body : undefined,
      channel: body.channel === 'whatsapp' ? 'whatsapp' : 'sms',
      contactId: typeof body.contactId === 'string' ? body.contactId : null,
      templateId: typeof body.templateId === 'string' ? body.templateId : null,
      templateContext: (body.templateContext as Record<string, unknown>) ?? {},
    })

    await logAudit({ scope, action: 'create', entity: 'sms', entityId: result.id })
    publishEntityCreated(scope.organizationId, 'sms', result.id, scope.userId, result)

    if (!result.ok) return NextResponse.json({ data: { id: result.id }, error: result.error }, { status: 502 })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    return serverError(err, 'Send failed', 400)
  }
}
