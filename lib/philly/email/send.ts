/* ---------------------------------------------------------------
   High-level email send orchestrator
   - Renders template if templateId provided
   - Writes draft → calls provider → updates status
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'
import { resolveProvider, SendPayload } from './providers'
import { renderTemplate } from '@/lib/philly/templates/renderer'

export interface SendEmailInput {
  accountId: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject?: string
  bodyHtml?: string | null
  bodyText?: string | null
  contactId?: string | null
  templateId?: string | null
  templateContext?: Record<string, unknown>
}

export interface SendEmailResult {
  ok: boolean
  emailId: string
  providerMessageId?: string
  error?: string
}

function toArr(v: string | string[] | undefined): string[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export async function sendEmail(
  organizationId: string,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const prisma = getAuthPrisma()

  const account = await prisma.emailAccount.findFirst({
    where: { id: input.accountId, organizationId },
  })
  if (!account) throw new Error('Email account not found for org')

  // Resolve template (if any)
  let subject = input.subject ?? ''
  let html = input.bodyHtml ?? null
  let text = input.bodyText ?? null

  if (input.templateId) {
    const tpl = await prisma.template.findFirst({
      where: { id: input.templateId, organizationId },
    })
    if (tpl) {
      subject = renderTemplate(tpl.subject, input.templateContext ?? {}) || subject
      const rendered = renderTemplate(tpl.body, input.templateContext ?? {})
      if (tpl.type === 'email') {
        html = html ?? rendered
        text = text ?? stripHtml(rendered)
      }
    }
  }

  const toList = toArr(input.to)
  const ccList = toArr(input.cc)
  const bccList = toArr(input.bcc)

  // Persist as draft first
  const email = await prisma.email.create({
    data: {
      accountId: account.id,
      contactId: input.contactId ?? null,
      direction: 'outbound',
      fromAddress: account.email,
      toAddresses: JSON.stringify(toList),
      ccAddresses: JSON.stringify(ccList),
      bccAddresses: JSON.stringify(bccList),
      subject,
      bodyHtml: html,
      bodyText: text,
      status: 'queued',
    },
  })

  const provider = resolveProvider(account)
  const payload: SendPayload = {
    from: account.email,
    fromName: account.displayName || undefined,
    to: toList,
    cc: ccList.length ? ccList : undefined,
    bcc: bccList.length ? bccList : undefined,
    subject,
    html,
    text,
  }

  const result = await provider.send(payload)

  const now = new Date()
  await prisma.email.update({
    where: { id: email.id },
    data: {
      status: result.ok ? 'sent' : 'failed',
      sentAt: result.ok ? now : null,
      messageId: result.providerMessageId ?? null,
    },
  })

  return {
    ok: result.ok,
    emailId: email.id,
    providerMessageId: result.providerMessageId,
    error: result.error,
  }
}

function stripHtml(html: string): string {
  // CodeQL: js/incomplete-multi-character-sanitization — a single pass
  // of /<[^>]+>/g can leave partial tags when input contains overlapping
  // brackets like '<<script>X</script>'. Loop until stable, then strip
  // any stray angle brackets that might remain (e.g., '<x without close).
  // This output is used as the plain-text alternative of HTML emails;
  // it's NOT rendered as HTML downstream, so the regression isn't a
  // live XSS — but defense-in-depth keeps a future re-use safe.
  let prev = ''
  let result = html
  while (result !== prev) {
    prev = result
    result = result.replace(/<[^>]+>/g, '')
  }
  return result.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim()
}
