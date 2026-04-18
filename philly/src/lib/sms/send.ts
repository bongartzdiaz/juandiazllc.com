/* High-level SMS sender: template render → persist → provider → update status */

import { getAuthPrisma } from '@/lib/auth'
import { sendTwilioMessage } from './twilio'
import { renderTemplate } from '@/lib/templates/renderer'

export interface SendSmsInput {
  toNumber: string
  fromNumber?: string
  body?: string
  channel?: 'sms' | 'whatsapp'
  contactId?: string | null
  templateId?: string | null
  templateContext?: Record<string, unknown>
}

export async function sendSms(organizationId: string, input: SendSmsInput) {
  const prisma = getAuthPrisma()

  let body = input.body ?? ''
  if (input.templateId) {
    const tpl = await prisma.template.findFirst({
      where: { id: input.templateId, organizationId },
    })
    if (tpl) body = renderTemplate(tpl.body, input.templateContext ?? {})
  }
  if (!body.trim()) throw new Error('Empty message body')

  const channel = input.channel ?? 'sms'

  const msg = await prisma.smsMessage.create({
    data: {
      organizationId,
      contactId: input.contactId ?? null,
      direction: 'outbound',
      channel,
      fromNumber: input.fromNumber ?? '',
      toNumber: input.toNumber,
      body,
      status: 'queued',
    },
  })

  const result = await sendTwilioMessage({
    to: input.toNumber,
    from: input.fromNumber,
    body,
    channel,
  })

  await prisma.smsMessage.update({
    where: { id: msg.id },
    data: {
      status: result.ok ? 'sent' : 'failed',
      sentAt: result.ok ? new Date() : null,
      providerSid: result.sid ?? null,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
    },
  })

  return { id: msg.id, ok: result.ok, sid: result.sid, error: result.errorMessage }
}
