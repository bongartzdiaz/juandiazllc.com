/* POST /api/email/send — send an email (via provider adapter) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSection } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { sendEmail } from '@/lib/philly/email/send'
import { serverError } from '@/lib/philly/safe-error'
import { enforceRateLimit, PRESET_SEND } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const recipients = z.union([z.string().max(255), z.array(z.string().max(255)).max(500)])

const sendSchema = z
  .object({
    accountId: z.string().trim().min(1, 'accountId is required').max(255),
    to: recipients.refine((v) => v.length > 0, 'to is required'),
    cc: recipients.optional(),
    bcc: recipients.optional(),
    subject: z.string().max(998).optional(),
    bodyHtml: z.string().max(500_000).optional(),
    bodyText: z.string().max(500_000).optional(),
    body: z.string().max(500_000).optional(),
    contactId: z.string().max(255).optional(),
    templateId: z.string().max(255).optional(),
    templateContext: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => (typeof b.templateId === 'string' && b.templateId) || (typeof b.subject === 'string' && b.subject.trim()), {
    message: 'subject or templateId is required',
    path: ['subject'],
  })

export async function POST(req: NextRequest) {
  const scope = await requireSection('email', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  // Strict rate limit for outbound email (per org).
  const limited = enforceRateLimit(`email:send:${scope.organizationId}`, PRESET_SEND)
  if (limited) return limited

  const body = await parseBody(req, sendSchema)
  if (body instanceof NextResponse) return body

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
