/* ---------------------------------------------------------------
   Twilio SMS/WhatsApp wrapper (zero external deps, uses fetch)
   - Credentials come from env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
   - For WhatsApp, prefix `whatsapp:` on from/to numbers
   --------------------------------------------------------------- */

import { logger } from '@/lib/philly/logger'

export interface TwilioSendInput {
  to: string
  from?: string
  body: string
  channel?: 'sms' | 'whatsapp'
}

export interface TwilioSendResult {
  ok: boolean
  sid?: string
  errorCode?: string
  errorMessage?: string
}

function getCreds() {
  return {
    sid: process.env.TWILIO_ACCOUNT_SID ?? '',
    token: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '',
    waFrom: process.env.TWILIO_WHATSAPP_FROM ?? '',
  }
}

export function hasTwilioCreds(): boolean {
  const c = getCreds()
  return !!(c.sid && c.token)
}

export async function sendTwilioMessage(input: TwilioSendInput): Promise<TwilioSendResult> {
  const creds = getCreds()
  const channel = input.channel ?? 'sms'

  if (!creds.sid || !creds.token) {
    // Dev fallback — pretend it was sent
    logger.debug('sms:null dispatch', { to: input.to, channel, body: input.body })
    return { ok: true, sid: `null-${Date.now()}` }
  }

  const from = input.from ?? (channel === 'whatsapp' ? creds.waFrom : creds.from)
  if (!from) return { ok: false, errorCode: 'E_NO_FROM', errorMessage: 'No from number configured' }

  const to = channel === 'whatsapp' && !input.to.startsWith('whatsapp:')
    ? `whatsapp:${input.to}`
    : input.to
  const fromNum = channel === 'whatsapp' && !from.startsWith('whatsapp:')
    ? `whatsapp:${from}`
    : from

  try {
    const auth = Buffer.from(`${creds.sid}:${creds.token}`).toString('base64')
    const form = new URLSearchParams()
    form.set('To', to)
    form.set('From', fromNum)
    form.set('Body', input.body)

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${creds.sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    )
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      return {
        ok: false,
        errorCode: json.code ? String(json.code) : String(res.status),
        errorMessage: json.message ?? 'Twilio error',
      }
    }
    return { ok: true, sid: json.sid }
  } catch (err) {
    return {
      ok: false,
      errorCode: 'E_REQUEST',
      errorMessage: err instanceof Error ? err.message : 'request failed',
    }
  }
}
