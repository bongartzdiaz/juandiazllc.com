// juandiazllc.com — new-lead notifier.
//
// Fires from a Postgres trigger on INSERT into public.leads, so it is
// independent of the Next.js app and of any Vercel environment variable. The
// server action already writes the row; this makes sure somebody hears about it.
//
// Two channels, both optional and independent — whichever is configured runs:
//   Resend:   RESEND_API_KEY + ALERT_EMAIL (+ RESEND_FROM)
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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? null
const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL') ?? null
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Juan Diaz LLC <onboarding@resend.dev>'
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

async function notifyResend(lead: Lead): Promise<string> {
  if (!RESEND_API_KEY) return 'skipped: RESEND_API_KEY unset'
  if (!ALERT_EMAIL) return 'skipped: ALERT_EMAIL unset'
  try {
    const html = `<!doctype html><html><body style="font-family:-apple-system,sans-serif;line-height:1.55;color:#222">
      <h2 style="margin:0 0 4px">New lead — juandiazllc.com</h2>
      <p style="color:#666;margin:0 0 20px">${esc(lead.created_at ?? new Date().toISOString())}</p>
      <table cellpadding="6" style="border-collapse:collapse;font-size:15px">
        <tr><td><strong>Name</strong></td><td>${esc(fallback(lead.name))}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${esc(lead.email)}">${esc(fallback(lead.email))}</a></td></tr>
        <tr><td><strong>Company</strong></td><td>${esc(fallback(lead.company))}</td></tr>
        <tr><td><strong>Sector</strong></td><td>${esc(fallback(lead.sector))}</td></tr>
        <tr><td><strong>Source</strong></td><td>${esc(fallback(lead.source))}</td></tr>
      </table>
      <h3 style="margin:24px 0 6px">Message</h3>
      <div style="white-space:pre-wrap;background:#f6f8f7;padding:14px;border-radius:8px">${esc(fallback(lead.message))}</div>
    </body></html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: ALERT_EMAIL,
        reply_to: lead.email || undefined,
        subject: `New lead — ${fallback(lead.name)}${lead.company ? ' @ ' + lead.company : ''}`,
        html,
      }),
    })
    if (!res.ok) return `failed: ${res.status} ${(await res.text()).slice(0, 200)}`
    return 'sent'
  } catch (err) {
    return `error: ${(err as Error).message}`
  }
}

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

  const [resend, telegram] = await Promise.all([notifyResend(lead), notifyTelegram(lead)])
  const delivered = resend === 'sent' || telegram === 'sent'

  console.log(`lead-notify: resend=${resend} telegram=${telegram}`)

  // 200 even when nothing was delivered: the lead row is already safe, and a
  // non-2xx would only make pg_net retry against a misconfiguration that a
  // retry cannot fix. The report says exactly what happened.
  return j({ ok: true, delivered, channels: { resend, telegram } })
})
