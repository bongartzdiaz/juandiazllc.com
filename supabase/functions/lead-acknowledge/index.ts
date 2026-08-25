// juandiazllc.com — ontvangstbevestiging aan de aanvrager.
//
// Tegenhanger van `lead-notify`. Die meldt een lead aan Juan; deze bevestigt
// aan de indiener dat zijn bericht is aangekomen, in zijn eigen taal, en legt
// vast wanneer dat gebeurde. Daarmee wordt responstijd een meetbaar getal in
// plaats van een belofte — zie de view `marketing.lead_response`.
//
// Aangeroepen door trigger `leads_acknowledge_new` op marketing.leads.
//
// DRIE EIGENSCHAPPEN DIE BEWUST ZO ZIJN:
//
// 1. `acknowledged_at` wordt ALLEEN gezet als er echt een mail uit is gegaan.
//    Een mislukte of overgeslagen poging laat de kolom leeg en schrijft de
//    reden in `ack_channel`. Anders zou de responstijdstatistiek meten hoe
//    snel we het proberen in plaats van hoe snel de aanvrager iets hoort.
//
// 2. Verzenden vanaf een `@resend.dev`-adres wordt geweigerd. Dat is Resends
//    zandbak-afzender: die levert alleen aan de accounthouder zelf. Aan een
//    willekeurige aanvrager bouncet hij, of komt aan als iets wat niet van
//    Juan lijkt. `lead-notify` mag hem gebruiken (die mailt naar Juan), deze
//    functie niet. ACK_FROM moet een geverifieerd domein zijn.
//
// 3. Het ontvangeradres komt UITSLUITEND uit de database, nooit uit de
//    envelop, en zonder bestaande rij wordt er niets verstuurd. Zou de envelop
//    het adres mogen bepalen, dan is dit een open mailrelay die namens Juan
//    verstuurt.
//
//    DE ONDERBOUWING HIERONDER IS OP 2026-08-25 GECORRIGEERD. Er stond dat
//    `lead_notify_secret` op 2026-08-16 niet in de vault stond en dat dus
//    iedereen die de URL kende mocht posten. Die sleutel is diezelfde dag om
//    16:22:38 UTC alsnog toegevoegd — de regel was waar op het moment van
//    schrijven en een paar uur later niet meer. Wat wél bleef staan was de
//    functiekant: `LEAD_NOTIFY_SECRET` was nooit gezet, en de poort liet bij
//    een ontbrekende sleutel dóór in plaats van te weigeren. Sinds
//    `auth.ts` is dat fail-closed.
//
//    Deze eigenschap blijft desondanks staan, en niet uit netheid: hij is de
//    tweede laag. Valt de poort ooit open — verkeerde env, een regressie —
//    dan kan een vreemde hooguit een bevestiging herhalen voor een lead die
//    toch al een bevestiging zou krijgen, en punt 3b vangt zelfs dat af.
//
// 3b. Een al bevestigde rij wordt overgeslagen. Idempotent bij herhaling.
//
// Altijd 200 NA DE POORT, net als lead-notify: de lead staat op dat moment al
// veilig in de database, en het antwoordlichaam zegt precies wat er gebeurd is
// en wordt door pg_net bewaard in net._http_response.
//
// Die regel gold nooit voor de poort zelf — die gaf al 405 en 401. Sinds
// 2026-08-25 komt daar 503 `not-configured` bij, zodat een ontbrekende sleutel
// te onderscheiden is van een verkeerde. Zie de kopnotitie van auth.ts.

import { beoordeelAuth } from './auth.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? null
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? null
const ACK_FROM = Deno.env.get('ACK_FROM') ?? null
const ACK_REPLY_TO = Deno.env.get('ACK_REPLY_TO') ?? Deno.env.get('ALERT_EMAIL') ?? null
// Dezelfde sleutel als lead-notify: één interne DB→functie-sleutel, niet twee.
const LEAD_NOTIFY_SECRET = Deno.env.get('LEAD_NOTIFY_SECRET') ?? null

type Taal = 'en' | 'nl' | 'de' | 'es'
const TALEN: Taal[] = ['en', 'nl', 'de', 'es']

interface Lead {
  id?: string
  name?: string | null
  email?: string | null
  sector?: string | null
  message?: string | null
  metadata?: Record<string, unknown> | null
}

const j = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

// Bewust ruim: dit is een verzendfilter, geen validatie. De server-action
// controleert het adres al bij binnenkomst.
const lijktOpEmail = (v: unknown): boolean =>
  typeof v === 'string' && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v.trim())

function taalVan(lead: Lead): Taal {
  const raw = lead.metadata && typeof lead.metadata === 'object'
    ? String((lead.metadata as Record<string, unknown>).locale ?? '')
    : ''
  const kort = raw.trim().slice(0, 2).toLowerCase() as Taal
  return TALEN.includes(kort) ? kort : 'en'
}

interface Tekst {
  onderwerp: string
  groet: (naam: string) => string
  inleiding: string
  jeSchreef: string
  sector: string
  slot: string
}

const COPY: Record<Taal, Tekst> = {
  en: {
    onderwerp: 'Your message arrived — Juan Diaz',
    groet: (n) => (n ? `Hi ${n},` : 'Hi,'),
    inleiding:
      'This is an automatic confirmation that your message came through. The reply will be mine, within 24 hours.',
    jeSchreef: 'You wrote',
    sector: 'Sector',
    slot: 'Reply to this email if you want to add anything.',
  },
  nl: {
    onderwerp: 'Je bericht is binnen — Juan Diaz',
    groet: (n) => (n ? `Hoi ${n},` : 'Hoi,'),
    inleiding:
      'Dit is een automatische bevestiging dat je bericht is aangekomen. Het antwoord komt van mij, binnen 24 uur.',
    jeSchreef: 'Je schreef',
    sector: 'Sector',
    slot: 'Wil je iets toevoegen, antwoord dan op deze mail.',
  },
  de: {
    onderwerp: 'Ihre Nachricht ist angekommen — Juan Diaz',
    groet: (n) => (n ? `Guten Tag ${n},` : 'Guten Tag,'),
    inleiding:
      'Dies ist eine automatische Bestätigung, dass Ihre Nachricht angekommen ist. Die Antwort kommt von mir, innerhalb von 24 Stunden.',
    jeSchreef: 'Sie schrieben',
    sector: 'Branche',
    slot: 'Wenn Sie etwas ergänzen möchten, antworten Sie auf diese E-Mail.',
  },
  es: {
    onderwerp: 'Tu mensaje ha llegado — Juan Diaz',
    groet: (n) => (n ? `Hola ${n},` : 'Hola,'),
    inleiding:
      'Esta es una confirmación automática de que tu mensaje ha llegado. La respuesta será mía, en menos de 24 horas.',
    jeSchreef: 'Escribiste',
    sector: 'Sector',
    slot: 'Si quieres añadir algo, responde a este correo.',
  },
}

function bouwMail(lead: Lead, taal: Taal): { subject: string; text: string; html: string } {
  const t = COPY[taal]
  const naam = String(lead.name ?? '').trim()
  const bericht = String(lead.message ?? '').trim()
  const sector = String(lead.sector ?? '').trim()

  const regels = [t.groet(naam), '', t.inleiding, '', `${t.jeSchreef}:`, bericht]
  if (sector) regels.push('', `${t.sector}: ${sector}`)
  regels.push('', t.slot, '', 'Juan Diaz', 'juandiazllc.com')

  const html = `<!doctype html><html lang="${taal}"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;color:#1a1a1a;max-width:560px">
  <p>${esc(t.groet(naam))}</p>
  <p>${esc(t.inleiding)}</p>
  <p style="margin:0 0 6px;color:#666;font-size:14px">${esc(t.jeSchreef)}:</p>
  <div style="white-space:pre-wrap;background:#f5f7f6;padding:14px;border-radius:8px">${esc(bericht)}</div>
  ${sector ? `<p style="color:#666;font-size:14px">${esc(t.sector)}: ${esc(sector)}</p>` : ''}
  <p>${esc(t.slot)}</p>
  <p style="margin-top:28px">Juan Diaz<br><a href="https://juandiazllc.com">juandiazllc.com</a></p>
</body></html>`

  return { subject: t.onderwerp, text: regels.join('\n'), html }
}

/** Haalt de rij op zoals hij nu in de database staat. Null bij elke storing. */
async function leesLead(id: string): Promise<Lead | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=id,name,email,sector,message,metadata,acknowledged_at&limit=1`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Accept-Profile': 'marketing',
        },
      },
    )
    if (!res.ok) return null
    const rijen = await res.json()
    return Array.isArray(rijen) && rijen.length ? rijen[0] : null
  } catch {
    return null
  }
}

async function schrijfUitkomst(id: string, kanaal: string, gelukt: boolean): Promise<string> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return 'skipped: service-role env unset'
  try {
    const body: Record<string, unknown> = { ack_channel: kanaal }
    // Alleen bij een echte verzending. Zie kopnotitie, punt 1.
    if (gelukt) body.acknowledged_at = new Date().toISOString()

    const res = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'marketing',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    })
    return res.ok ? 'ok' : `failed: ${res.status} ${(await res.text()).slice(0, 200)}`
  } catch (err) {
    return `error: ${(err as Error).message}`
  }
}

async function verstuur(lead: Lead, taal: Taal): Promise<string> {
  if (!RESEND_API_KEY) return 'skipped:no-api-key'
  if (!ACK_FROM) return 'skipped:no-from-address'
  // Zie kopnotitie, punt 2.
  if (/@resend\.dev>?\s*$/i.test(ACK_FROM)) return 'skipped:sandbox-sender'
  if (!lijktOpEmail(lead.email)) return 'skipped:no-recipient'

  try {
    const { subject, text, html } = bouwMail(lead, taal)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: ACK_FROM,
        to: String(lead.email).trim(),
        reply_to: ACK_REPLY_TO ?? undefined,
        subject,
        text,
        html,
      }),
    })
    if (!res.ok) return `failed:${res.status} ${(await res.text()).slice(0, 160)}`
    return 'email'
  } catch (err) {
    return `failed:${(err as Error).message.slice(0, 160)}`
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return j({ ok: false, error: 'method-not-allowed' }, 405)

  const oordeel = beoordeelAuth(LEAD_NOTIFY_SECRET, req.headers.get('authorization'))
  if (!oordeel.ok) {
    if (oordeel.error === 'not-configured') {
      console.error(
        '[lead-acknowledge] LEAD_NOTIFY_SECRET ontbreekt of is te kort — dit endpoint weigert ' +
          'alles. Zet in Edge Functions -> Secrets dezelfde waarde als het vault-secret ' +
          '`lead_notify_secret`, anders komt ook de trigger er niet doorheen.',
      )
    }
    return j({ ok: false, error: oordeel.error }, oordeel.status)
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return j({ ok: false, error: 'invalid-json' }, 400)
  }

  const envelop = payload as { record?: Lead; lead?: Lead } | Lead
  const uitEnvelop: Lead =
    (envelop as { record?: Lead }).record ?? (envelop as { lead?: Lead }).lead ?? (envelop as Lead) ?? {}

  // Geen terugval op de envelop. Zie kopnotitie, punt 3: die terugval zou van
  // dit endpoint een open mailrelay maken zolang er geen gedeelde sleutel is.
  const lead = uitEnvelop.id ? await leesLead(uitEnvelop.id) : null
  if (!lead) {
    console.warn(`lead-acknowledge: geen bestaande rij voor id=${uitEnvelop.id ?? '(geen)'}`)
    return j({ ok: true, sent: false, channel: 'skipped:unknown-lead' })
  }

  if ((lead as Record<string, unknown>).acknowledged_at) {
    console.log(`lead-acknowledge: ${lead.id} was al bevestigd`)
    return j({ ok: true, sent: false, channel: 'skipped:already-acknowledged' })
  }

  const taal = taalVan(lead)
  const kanaal = await verstuur(lead, taal)
  const gelukt = kanaal === 'email'

  const geschreven = lead.id ? await schrijfUitkomst(lead.id, kanaal, gelukt) : 'skipped:no-id'

  console.log(`lead-acknowledge: taal=${taal} kanaal=${kanaal} rij=${geschreven}`)

  return j({ ok: true, sent: gelukt, channel: kanaal, locale: taal, row_update: geschreven })
})
