// juandiazllc.com — ontvangstbevestiging aan de aanvrager.
//
// Tegenhanger van `lead-notify`. Die meldt een lead aan Juan; deze bevestigt
// aan de indiener dat zijn bericht is aangekomen, in zijn eigen taal, en legt
// vast wanneer dat gebeurde. Daarmee wordt responstijd een meetbaar getal in
// plaats van een belofte — zie de view `marketing.lead_response`.
//
// Aangeroepen door trigger `leads_acknowledge_new` op marketing.leads.
//
// TWEE BRONNEN, TWEE TEKSTEN (sinds 2026-09-21). De rij draagt `source`.
// Alles wat niet `lekkage-scan` is, is het contactformulier en krijgt de
// tekst "je bericht is aangekomen", met het bericht geciteerd. Een rij uit de
// lekkage-scan (#386: de gate) heeft niets gevraagd; die krijgt "je uitslag
// ligt bij mij", met het aantal lekken uit `metadata.lekken` en zónder het
// `message`-veld — dat is de Nederlandse samenvatting voor Telegram, met
// Nederlandse bloknamen, en de bezoeker las de scan in zijn eigen taal.
//
// DRIE EIGENSCHAPPEN DIE BEWUST ZO ZIJN:
//
// 1. `acknowledged_at` wordt ALLEEN gezet als er echt een mail uit is gegaan.
//    Een mislukte of overgeslagen poging laat de kolom leeg en schrijft de
//    reden in `ack_channel`. Anders zou de responstijdstatistiek meten hoe
//    snel we het proberen in plaats van hoe snel de aanvrager iets hoort.
//
// 2. Verzenden vanaf een gratis maildomein (gmail, outlook, ...) wordt
//    geweigerd, in `_shared/brevo.ts`. Brevo laat het toe, maar de DMARC-regels
//    van die domeinen zetten zo'n mail in de spam of laten hem bouncen — bij
//    een willekeurige aanvrager, niet bij Juan zelf. ACK_FROM moet een in
//    Brevo geauthenticeerd domein zijn (DKIM + DMARC op juandiazllc.com).
//    Tot 2026-09-20 liep dit via Resend, met dezelfde regel voor `@resend.dev`.
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
import { verstuur as verstuurBrevo } from '../_shared/brevo.ts'
import { geheim } from '../_shared/geheim.ts'
import { alineaHtml, citaatHtml, knopHtml, omhulsel } from '../_shared/huisstijl.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? null
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null
const BREVO_API_KEY = await geheim(Deno.env.get('BREVO_API_KEY'), 'brevo_api_key')
const ACK_FROM = Deno.env.get('ACK_FROM') ?? null
const ACK_REPLY_TO = Deno.env.get('ACK_REPLY_TO') ?? Deno.env.get('ALERT_EMAIL') ?? null
// Dezelfde sleutel als lead-notify: één interne DB→functie-sleutel, niet twee.
const LEAD_NOTIFY_SECRET = await geheim(Deno.env.get('LEAD_NOTIFY_SECRET'), 'lead_notify_secret')

type Taal = 'en' | 'nl' | 'de' | 'es'
const TALEN: Taal[] = ['en', 'nl', 'de', 'es']

interface Lead {
  id?: string
  name?: string | null
  email?: string | null
  sector?: string | null
  message?: string | null
  source?: string | null
  metadata?: Record<string, unknown> | null
}

// Dezelfde waarde als SCAN_BRON in lib/scan-opvang.ts; lib/lead-acknowledge-auth.test.ts
// bewaakt dat ze gelijk blijven. Edge functions kunnen niets buiten
// supabase/functions/ importeren.
const SCAN_BRON = 'lekkage-scan'

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

// Dezelfde link als lib/booking.ts (BOOKING_15MIN). Edge functions kunnen
// niets buiten supabase/functions/ importeren; verandert de link, dan hier ook.
const BOEKLINK = 'https://cal.com/juandiazllc/15min'

interface Tekst {
  onderwerp: string
  kop: string
  groet: (naam: string) => string
  inleiding: string
  jeSchreef: string
  sector: string
  sneller: string
  knop: string
  slot: string
  voet: string
}

const COPY: Record<Taal, Tekst> = {
  en: {
    onderwerp: "Got it. You'll hear from me within 24 hours",
    kop: 'Message received',
    groet: (n) => (n ? `Hi ${n},` : 'Hi,'),
    inleiding:
      'Your message came through. This confirmation is automatic; the reply is not: it comes from me, within 24 hours, and it answers what you actually asked.',
    jeSchreef: 'What you wrote',
    sector: 'Sector',
    sneller: 'Want it sooner? Pick 15 minutes in my calendar and we talk it through instead of typing.',
    knop: 'Book 15 minutes',
    slot: 'Anything to add? Reply to this email; it lands in my inbox.',
    voet: 'You received this because you used the contact form on juandiazllc.com. One message, no series.',
  },
  nl: {
    onderwerp: 'Binnen. Je hoort binnen 24 uur van me',
    kop: 'Bericht ontvangen',
    groet: (n) => (n ? `Hoi ${n},` : 'Hoi,'),
    inleiding:
      'Je bericht is aangekomen. Deze bevestiging is automatisch; het antwoord niet: dat komt van mij, binnen 24 uur, en gaat over wat je werkelijk vroeg.',
    jeSchreef: 'Wat je schreef',
    sector: 'Sector',
    sneller: 'Liever sneller? Kies een kwartier in mijn agenda, dan bespreken we het in plaats van te typen.',
    knop: 'Plan 15 minuten',
    slot: 'Wil je iets toevoegen? Antwoord op deze mail; die komt bij mij binnen.',
    voet: 'Je krijgt dit omdat je het contactformulier op juandiazllc.com gebruikte. Eén bericht, geen reeks.',
  },
  de: {
    onderwerp: 'Angekommen. Sie hören innerhalb von 24 Stunden von mir',
    kop: 'Nachricht erhalten',
    groet: (n) => (n ? `Guten Tag ${n},` : 'Guten Tag,'),
    inleiding:
      'Ihre Nachricht ist angekommen. Diese Bestätigung ist automatisch, die Antwort nicht: Sie kommt von mir, innerhalb von 24 Stunden, und geht auf das ein, was Sie tatsächlich gefragt haben.',
    jeSchreef: 'Was Sie geschrieben haben',
    sector: 'Branche',
    sneller: 'Lieber schneller? Wählen Sie 15 Minuten in meinem Kalender, dann besprechen wir es statt zu tippen.',
    knop: '15 Minuten buchen',
    slot: 'Möchten Sie etwas ergänzen? Antworten Sie auf diese E-Mail; sie landet bei mir.',
    voet: 'Sie erhalten diese E-Mail, weil Sie das Kontaktformular auf juandiazllc.com genutzt haben. Eine Nachricht, keine Serie.',
  },
  es: {
    onderwerp: 'Recibido. Tendrás noticias mías en menos de 24 horas',
    kop: 'Mensaje recibido',
    groet: (n) => (n ? `Hola ${n},` : 'Hola,'),
    inleiding:
      'Tu mensaje ha llegado. Esta confirmación es automática; la respuesta no: la escribo yo, en menos de 24 horas, y responde a lo que realmente preguntaste.',
    jeSchreef: 'Lo que escribiste',
    sector: 'Sector',
    sneller: '¿Lo quieres antes? Elige 15 minutos en mi agenda y lo hablamos en vez de escribirlo.',
    knop: 'Reservar 15 minutos',
    slot: '¿Quieres añadir algo? Responde a este correo; me llega directamente.',
    voet: 'Recibes esto porque usaste el formulario de contacto de juandiazllc.com. Un mensaje, sin serie.',
  },
}

interface ScanTekst {
  onderwerp: string
  kop: string
  groet: (naam: string) => string
  inleiding: string
  gevonden: (n: number | null) => string
  sneller: string
  knop: string
  slot: string
  voet: string
}

// De scan bestaat in nl, en en de (lib/lekkage-scan-taal.ts). Een rij met een
// andere locale kan hier niet uit het formulier komen; valt hij toch binnen,
// dan Engels — zelfde terugval als taalVan().
const SCAN_COPY: Partial<Record<Taal, ScanTekst>> = {
  nl: {
    onderwerp: 'Je uitslag ligt bij mij. Binnen 24 uur hoor je wat ik als eerste zou aanpakken',
    kop: 'Uitslag ontvangen',
    groet: (n) => (n ? `Hoi ${n},` : 'Hoi,'),
    inleiding:
      'Je vulde de lekkage-scan in en vroeg je uitslag aan. Die staat in je browser; deze mail bevestigt dat hij ook bij mij ligt. Binnen 24 uur krijg je van mij één ding terug: welk lek ik als eerste zou dichten, en waarom dat.',
    gevonden: (n) => (n === null ? 'Je uitslag staat in je browser.' : n === 0 ? 'Gevonden: nul lekken.' : n === 1 ? 'Gevonden: één lek.' : `Gevonden: ${n} lekken.`),
    sneller: 'Liever direct? Kies een kwartier in mijn agenda, dan lopen we de uitslag samen door.',
    knop: 'Plan 15 minuten',
    slot: 'Wil je iets toevoegen? Antwoord op deze mail; die komt bij mij binnen.',
    voet: 'Je krijgt dit omdat je op juandiazllc.com je uitslag van de lekkage-scan aanvroeg. Eén bericht; de drie mails over de lekken komen alleen als je dat aanvinkte.',
  },
  en: {
    onderwerp: "Your result is with me. Within 24 hours you'll hear what I'd fix first",
    kop: 'Result received',
    groet: (n) => (n ? `Hi ${n},` : 'Hi,'),
    inleiding:
      "You completed the leak scan and asked for your result. It's in your browser; this email confirms it's with me too. Within 24 hours you get one thing back from me: which leak I'd close first, and why that one.",
    gevonden: (n) => (n === null ? 'Your result is in your browser.' : n === 0 ? 'Found: no leaks.' : n === 1 ? 'Found: one leak.' : `Found: ${n} leaks.`),
    sneller: 'Rather talk it through? Pick 15 minutes in my calendar and we go over the result together.',
    knop: 'Book 15 minutes',
    slot: 'Anything to add? Reply to this email; it lands in my inbox.',
    voet: 'You received this because you requested your leak-scan result on juandiazllc.com. One message; the three emails about the leaks only come if you ticked that box.',
  },
  de: {
    onderwerp: 'Ihr Ergebnis liegt bei mir. Innerhalb von 24 Stunden hören Sie, was ich zuerst angehen würde',
    kop: 'Ergebnis erhalten',
    groet: (n) => (n ? `Guten Tag ${n},` : 'Guten Tag,'),
    inleiding:
      'Sie haben den Leck-Scan ausgefüllt und Ihr Ergebnis angefordert. Es steht in Ihrem Browser; diese E-Mail bestätigt, dass es auch bei mir liegt. Innerhalb von 24 Stunden bekommen Sie von mir eine Sache zurück: welches Leck ich zuerst schließen würde, und warum dieses.',
    gevonden: (n) => (n === null ? 'Ihr Ergebnis steht in Ihrem Browser.' : n === 0 ? 'Gefunden: keine Lecks.' : n === 1 ? 'Gefunden: ein Leck.' : `Gefunden: ${n} Lecks.`),
    sneller: 'Lieber direkt besprechen? Wählen Sie 15 Minuten in meinem Kalender, dann gehen wir das Ergebnis gemeinsam durch.',
    knop: '15 Minuten buchen',
    slot: 'Möchten Sie etwas ergänzen? Antworten Sie auf diese E-Mail; sie landet bei mir.',
    voet: 'Sie erhalten diese E-Mail, weil Sie auf juandiazllc.com Ihr Ergebnis des Leck-Scans angefordert haben. Eine Nachricht; die drei E-Mails zu den Lecks kommen nur, wenn Sie das angekreuzt haben.',
  },
}

function lekkenVan(lead: Lead): number | null {
  const v = lead.metadata && typeof lead.metadata === 'object'
    ? (lead.metadata as Record<string, unknown>).lekken
    : undefined
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null
}

function bouwScanMail(lead: Lead, taal: Taal): { subject: string; text: string; html: string } {
  const t = SCAN_COPY[taal] ?? SCAN_COPY.en!
  const naam = String(lead.name ?? '').trim()
  const gevonden = t.gevonden(lekkenVan(lead))

  const regels = [t.groet(naam), '', t.inleiding, '', gevonden, '', t.sneller, `${t.knop}: ${BOEKLINK}`, '', t.slot, '', 'Juan Diaz', 'juandiazllc.com', '', t.voet]

  const html = omhulsel({
    taal,
    kop: t.kop,
    preheader: t.inleiding,
    blokken: [
      alineaHtml(t.groet(naam)),
      alineaHtml(t.inleiding),
      `<p style="margin:0 0 16px;font-size:16px;font-weight:600">${esc(gevonden)}</p>`,
      alineaHtml(t.sneller),
      knopHtml({ tekst: t.knop, url: BOEKLINK }),
      alineaHtml(t.slot),
    ],
    groet: ['Juan Diaz', 'juandiazllc.com'],
    voet: esc(t.voet),
  })

  return { subject: t.onderwerp, text: regels.join('\n'), html }
}

function bouwMail(lead: Lead, taal: Taal): { subject: string; text: string; html: string } {
  if (lead.source === SCAN_BRON) return bouwScanMail(lead, taal)
  return bouwContactMail(lead, taal)
}

function bouwContactMail(lead: Lead, taal: Taal): { subject: string; text: string; html: string } {
  const t = COPY[taal]
  const naam = String(lead.name ?? '').trim()
  const bericht = String(lead.message ?? '').trim()
  const sector = String(lead.sector ?? '').trim()

  const regels = [t.groet(naam), '', t.inleiding, '', `${t.jeSchreef}:`, bericht]
  if (sector) regels.push('', `${t.sector}: ${sector}`)
  regels.push('', t.sneller, `${t.knop}: ${BOEKLINK}`, '', t.slot, '', 'Juan Diaz', 'juandiazllc.com', '', t.voet)

  const blokken = [
    alineaHtml(t.groet(naam)),
    alineaHtml(t.inleiding),
    `<p style="margin:0 0 6px;font-size:13px;letter-spacing:.4px;text-transform:uppercase;color:#5F6F67">${esc(t.jeSchreef)}</p>`,
    citaatHtml(bericht),
  ]
  if (sector) blokken.push(`<p style="margin:0 0 16px;font-size:14px;color:#5F6F67">${esc(t.sector)}: ${esc(sector)}</p>`)
  blokken.push(alineaHtml(t.sneller), knopHtml({ tekst: t.knop, url: BOEKLINK }), alineaHtml(t.slot))

  const html = omhulsel({
    taal,
    kop: t.kop,
    preheader: t.inleiding,
    blokken,
    groet: ['Juan Diaz', 'juandiazllc.com'],
    voet: esc(t.voet),
  })

  return { subject: t.onderwerp, text: regels.join('\n'), html }
}

/** Haalt de rij op zoals hij nu in de database staat. Null bij elke storing. */
async function leesLead(id: string): Promise<Lead | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=id,name,email,sector,message,source,metadata,acknowledged_at&limit=1`,
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
  if (!BREVO_API_KEY) return 'skipped:no-api-key'
  if (!ACK_FROM) return 'skipped:no-from-address'
  if (!lijktOpEmail(lead.email)) return 'skipped:no-recipient'

  const { subject, text, html } = bouwMail(lead, taal)
  // Zie kopnotitie, punt 2: een freemail-afzender wordt in de helper geweigerd.
  const r = await verstuurBrevo(
    {
      from: ACK_FROM,
      to: String(lead.email).trim(),
      replyTo: ACK_REPLY_TO ?? ACK_FROM,
      onderwerp: subject,
      text,
      html,
    },
    { apiKey: BREVO_API_KEY },
  )
  if (!r.ok) return r.reden === 'freemail-sender' ? 'skipped:freemail-sender' : `failed:${r.reden}`
  return 'email'
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
