// juandiazllc.com — new-lead notifier.
//
// Fires from a Postgres trigger on INSERT into public.leads, so it is
// independent of the Next.js app and of any Vercel environment variable. The
// server action already writes the row; this makes sure somebody hears about it.
//
// Two channels, both optional and independent — whichever is configured runs:
//   Brevo:    BREVO_API_KEY + ALERT_EMAIL + NOTIFY_FROM (tot 2026-09-20: Resend)
//   Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
//
// Always answers 200 with a per-channel report. A notifier that 500s would make
// pg_net retry and could, at worst, slow the insert path that actually matters —
// the lead is already safely stored by the time we run.
//
// Auth: de trigger stuurt LEAD_NOTIFY_SECRET als bearer-token. FAIL-CLOSED
// sinds 2026-09-04: zonder bruikbare sleutel gaat er niets door.
//
// Tot die datum stond hier het omgekeerde, in twee lagen tegelijk. De
// controle zat in `if (LEAD_NOTIFY_SECRET)`, met als else-tak letterlijk
//
//     console.warn('LEAD_NOTIFY_SECRET unset - endpoint is open')
//
// waarna de aanroep gewoon doorging naar Telegram en Resend, met een
// volledig door de aanroeper geleverd lichaam. En de vergelijking was
// `auth.includes(LEAD_NOTIFY_SECRET)` - een substringtest zonder ondergrens,
// dus met een sleutel van een teken kwam elke header erdoor die dat teken
// bevatte. Beide regels staan hierboven met opzet voluit: de poort in
// lib/lead-notify-auth.test.ts bewijst er zijn commentaarstrip mee.
//
// De poort staat in `auth.ts`, byte-identiek aan die van lead-acknowledge,
// die deze twee gaten op 2026-08-25 al kwijtraakte. Drie uitkomsten: 503
// not-configured, 401 unauthorized, of door. Zie de kopnotitie daar.
//
// "Altijd 200" hierboven geldt voor het zakelijke pad NA de poort. Voor de
// poort zelf gold het al niet: die gaf 405.

import { beoordeelAuth } from './auth.ts'
import { verstuur } from '../_shared/brevo.ts'
import { citaatHtml, omhulsel } from '../_shared/huisstijl.ts'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? null
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') ?? null
// Geen standaardwaarde meer: de oude (`onboarding@resend.dev`) was Resends
// zandbak. Een afzender hoort op het geauthenticeerde domein, zoals ACK_FROM.
const NOTIFY_FROM = Deno.env.get('NOTIFY_FROM') ?? null
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? null
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID') ?? null
const LEAD_NOTIFY_SECRET = Deno.env.get('LEAD_NOTIFY_SECRET') ?? null

interface Lead {
  id?: string
  name?: string | null
  email?: string | null
  company?: string | null
  sector?: string | null
  message?: string | null
  source?: string | null
  created_at?: string | null
}

const j = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function fallback(v: unknown): string {
  const s = String(v ?? '').trim()
  return s || '—'
}

async function notifyBrevo(lead: Lead): Promise<string> {
  if (!BREVO_API_KEY) return 'skipped: BREVO_API_KEY unset'
  if (!ALERT_EMAIL) return 'skipped: ALERT_EMAIL unset'
  if (!NOTIFY_FROM) return 'skipped: NOTIFY_FROM unset'

  const rij = (k: string, v: unknown) =>
    `<tr><td style="padding:6px 10px 6px 0;color:#5F6F67;font-size:14px;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:15px">${esc(fallback(v))}</td></tr>`
  const tabel = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border-collapse:collapse">${[
    rij('Name', lead.name),
    `<tr><td style="padding:6px 10px 6px 0;color:#5F6F67;font-size:14px">Email</td><td style="padding:6px 0;font-size:15px"><a href="mailto:${esc(lead.email)}" style="color:#1A8B60">${esc(fallback(lead.email))}</a></td></tr>`,
    rij('Company', lead.company),
    rij('Sector', lead.sector),
    rij('Source', lead.source),
    rij('Received', lead.created_at ?? new Date().toISOString()),
  ].join('')}</table>`

  const text = [
    `New lead — juandiazllc.com`,
    ``,
    `Name:     ${fallback(lead.name)}`,
    `Email:    ${fallback(lead.email)}`,
    `Company:  ${fallback(lead.company)}`,
    `Sector:   ${fallback(lead.sector)}`,
    `Source:   ${fallback(lead.source)}`,
    `Received: ${fallback(lead.created_at ?? new Date().toISOString())}`,
    ``,
    fallback(lead.message),
  ].join('\n')

  const html = omhulsel({
    taal: 'en',
    kop: 'New lead',
    preheader: `${fallback(lead.name)}${lead.company ? ' @ ' + lead.company : ''}: ${fallback(lead.message).slice(0, 120)}`,
    blokken: [
      tabel,
      `<p style="margin:0 0 6px;font-size:13px;letter-spacing:.4px;text-transform:uppercase;color:#5F6F67">Message</p>`,
      citaatHtml(fallback(lead.message)),
    ],
    groet: ['Reply to this email to answer the lead directly.'],
    voet: 'Internal notification from the contact form on juandiazllc.com.',
  })

  const r = await verstuur(
    {
      from: NOTIFY_FROM,
      to: ALERT_EMAIL,
      replyTo: lijktOpEmail(lead.email) ? String(lead.email).trim() : ALERT_EMAIL,
      onderwerp: `New lead — ${fallback(lead.name)}${lead.company ? ' @ ' + lead.company : ''}`,
      text,
      html,
    },
    { apiKey: BREVO_API_KEY },
  )
  return r.ok ? 'sent' : `failed: ${r.reden}`
}

// Bewust ruim: verzendfilter voor reply-to, geen validatie.
const lijktOpEmail = (v: unknown): boolean =>
  typeof v === 'string' && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v.trim())

async function notifyTelegram(lead: Lead): Promise<string> {
  if (!TELEGRAM_BOT_TOKEN) return 'skipped: TELEGRAM_BOT_TOKEN unset'
  if (!TELEGRAM_CHAT_ID) return 'skipped: TELEGRAM_CHAT_ID unset'
  try {
    // Plain text, no parse_mode: lead fields are attacker-controlled input and
    // Telegram's Markdown/HTML parsing on untrusted text is an injection foot-gun.
    const text =
      `🟢 New lead — juandiazllc.com\n\n` +
      `Name:    ${fallback(lead.name)}\n` +
      `Email:   ${fallback(lead.email)}\n` +
      `Company: ${fallback(lead.company)}\n` +
      `Sector:  ${fallback(lead.sector)}\n` +
      `Source:  ${fallback(lead.source)}\n\n` +
      `${fallback(lead.message)}`

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text.slice(0, 3900) }),
    })
    if (!res.ok) return `failed: ${res.status} ${(await res.text()).slice(0, 200)}`
    return 'sent'
  } catch (err) {
    return `error: ${(err as Error).message}`
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return j({ ok: false, error: 'method-not-allowed' }, 405)

  const oordeel = beoordeelAuth(LEAD_NOTIFY_SECRET, req.headers.get('authorization'))
  if (!oordeel.ok) return j({ ok: false, error: oordeel.error }, oordeel.status)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return j({ ok: false, error: 'invalid-json' }, 400)
  }

  // Accepts either a Supabase webhook envelope ({ type, record }) or a bare
  // lead object, so it can be invoked directly for a smoke test.
  const lead: Lead = payload?.record ?? payload?.lead ?? payload ?? {}

  const [email, telegram] = await Promise.all([notifyBrevo(lead), notifyTelegram(lead)])
  const delivered = email === 'sent' || telegram === 'sent'

  console.log(`lead-notify: email=${email} telegram=${telegram}`)

  // 200 even when nothing was delivered: the lead row is already safe, and a
  // non-2xx would only make pg_net retry against a misconfiguration that a
  // retry cannot fix. The report says exactly what happened.
  return j({ ok: true, delivered, channels: { email, telegram } })
})
