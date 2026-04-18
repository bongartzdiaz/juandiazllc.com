/* POST /api/email/send — send an email (via provider adapter) */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { sendEmail } from '@/lib/email/send'
import { serverError } from '@/lib/safe-error'
import { enforceRateLimit, PRESET_SEND } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  // Strict rate limit for outbound email (per org).
  const limited = enforceRateLimit(`email:send:${scope.organizationId}`, PRESET_SEND)
  if (limited) return limited

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (typeof body.accountId !== 'string' || !body.accountId.trim()) {
    return jsonError('accountId is required', 400)
  }
  if (!body.to) return jsonError('to is required', 400)
  if (!body.templateId && (typeof body.subject !== 'string' || !body.subject.trim())) {
    return jsonError('subject or templateId is required', 400)
  }

  try {
    const result = await sendEmail(scope.organizationId, {
      accountId: body.accountId,
      to: body.to as string | string[],
      cc: body.cc as string | string[] | undefined,
      bcc: body.bcc as string | string[] | undefined,
      subject: typeof body.subject === 'string' ? body.subject : undefined,
      bodyHtml: typeof body.bodyHtml === 'string' ? body.bodyHtml : null,
      bodyText: typeof body.bodyText === 'string' ? body.bodyText : (typeof body.body === 'string' ? body.body : null),
      contactId: typeof body.contactId === 'string' ? body.contactId : null,
      templateId: typeof body.templateId === 'string' ? body.templateId : null,
      templateContext: (body.templateContext as Record<string, unknown>) ?? {},
    })

    await logAudit({ scope, action: 'create', entity: 'email', entityId: result.emailId })

    if (!result.ok) {
      return NextResponse.json(
        { data: { id: result.emailId }, error: result.error ?? 'Provider error' },
        { status: 502 },
      )
    }
    return NextResponse.json({ data: { id: result.emailId, providerMessageId: result.providerMessageId } }, { status: 201 })
  } catch (err) {
    return serverError(err, 'Send failed', 400)
  }
}
