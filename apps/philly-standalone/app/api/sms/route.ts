/* GET  /api/sms — list SMS/WhatsApp messages
   POST /api/sms — send a message via Twilio adapter */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { sendSms } from '@/lib/philly/sms/send'
import { serverError } from '@/lib/philly/safe-error'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_SEND } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (typeof body.toNumber !== 'string' || !body.toNumber.trim()) return jsonError('toNumber is required', 400)
  if (!body.templateId && (typeof body.body !== 'string' || !body.body.trim())) {
    return jsonError('body or templateId is required', 400)
  }

  try {
    const result = await sendSms(scope.organizationId, {
      toNumber: body.toNumber.trim(),
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
