/* ---------------------------------------------------------------
   Email provider abstraction
   - Supports SendGrid, Mailgun, Resend and a NullProvider (dev)
   - Provider is chosen per EmailAccount via provider + credentials
   - All providers return a normalized SendResult
   --------------------------------------------------------------- */

import { logger } from '@/lib/philly/logger'

export interface SendPayload {
  from: string
  fromName?: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html?: string | null
  text?: string | null
}

export interface SendResult {
  ok: boolean
  providerMessageId?: string
  error?: string
}

export interface EmailProvider {
  send(payload: SendPayload): Promise<SendResult>
}

/** Fallback provider — used when no credentials are configured.
    Pretends the email was sent so the UI flow works end-to-end in dev. */
class NullProvider implements EmailProvider {
  async send(payload: SendPayload): Promise<SendResult> {
    logger.debug('email:null dispatch', {
      from: payload.from, to: payload.to, subject: payload.subject,
    })
    return { ok: true, providerMessageId: `null-${Date.now()}` }
  }
}

class SendgridProvider implements EmailProvider {
  constructor(private apiKey: string) {}
  async send(p: SendPayload): Promise<SendResult> {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: p.to.map(email => ({ email })),
            cc: p.cc?.map(email => ({ email })),
            bcc: p.bcc?.map(email => ({ email })),
          }],
          from: { email: p.from, name: p.fromName },
          subject: p.subject,
          content: [
            ...(p.text ? [{ type: 'text/plain', value: p.text }] : []),
            ...(p.html ? [{ type: 'text/html', value: p.html }] : []),
          ],
        }),
      })
      if (!res.ok) return { ok: false, error: `SendGrid ${res.status}: ${await res.text()}` }
      const id = res.headers.get('X-Message-Id') ?? undefined
      return { ok: true, providerMessageId: id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'sendgrid error' }
    }
  }
}

class ResendProvider implements EmailProvider {
  constructor(private apiKey: string) {}
  async send(p: SendPayload): Promise<SendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: p.fromName ? `${p.fromName} <${p.from}>` : p.from,
          to: p.to,
          cc: p.cc,
          bcc: p.bcc,
          subject: p.subject,
          html: p.html ?? undefined,
          text: p.text ?? undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${json.message ?? 'error'}` }
      return { ok: true, providerMessageId: json.id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'resend error' }
    }
  }
}

class MailgunProvider implements EmailProvider {
  constructor(private apiKey: string, private domain: string) {}
  async send(p: SendPayload): Promise<SendResult> {
    try {
      const form = new URLSearchParams()
      form.set('from', p.fromName ? `${p.fromName} <${p.from}>` : p.from)
      for (const t of p.to) form.append('to', t)
      for (const c of p.cc ?? []) form.append('cc', c)
      for (const b of p.bcc ?? []) form.append('bcc', b)
      form.set('subject', p.subject)
      if (p.text) form.set('text', p.text)
      if (p.html) form.set('html', p.html)

      const auth = Buffer.from(`api:${this.apiKey}`).toString('base64')
      const res = await fetch(`https://api.mailgun.net/v3/${this.domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: `Mailgun ${res.status}: ${json.message ?? 'error'}` }
      return { ok: true, providerMessageId: json.id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'mailgun error' }
    }
  }
}

interface AccountLike {
  provider: string
  accessToken?: string | null
  metadata?: string | null
}

/** Resolves the right provider for an account. Falls back to NullProvider. */
export function resolveProvider(account: AccountLike): EmailProvider {
  const apiKey = account.accessToken ?? ''
  switch (account.provider) {
    case 'sendgrid':
      return apiKey ? new SendgridProvider(apiKey) : new NullProvider()
    case 'resend':
      return apiKey ? new ResendProvider(apiKey) : new NullProvider()
    case 'mailgun': {
      let domain = ''
      try { domain = JSON.parse(account.metadata ?? '{}').domain ?? '' } catch {}
      return apiKey && domain ? new MailgunProvider(apiKey, domain) : new NullProvider()
    }
    default:
      return new NullProvider()
  }
}
