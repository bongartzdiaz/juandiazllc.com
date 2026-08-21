/* CSP violation sink.
   ─────────────────────────────────────────────────────────────
   Browsers POST here when a CSP directive blocks something (or
   would, in report-only mode). We log the envelope server-side so
   the pattern shows up wherever our existing logger feeds — and
   route it to Sentry when available so we see which blocked
   scripts are actually hitting users. Idempotent: returns 204
   regardless of parse outcome so browsers don't retry.

   BEGRENZING (2026-08-21). Dit endpoint is publiek, ongeauthenticeerd
   en had geen enkele rem. Drie plafonds, en het middelste was het
   werkelijke gat:

   1. Verzoeken per IP — een op hol geslagen pagina kan de sink niet
      meer vullen.
   2. GEBEURTENISSEN PER VERZOEK. De Reporting API stuurt een ARRAY, en
      de lus eronder deed één captureMessage() per element. Eén POST met
      tienduizend elementen was dus tienduizend Sentry-berichten uit één
      verzoek — een quotum dat geld kost, opgemaakt door een vreemde. De
      limiet per IP hielp daar niets tegen, want het waren nooit meer dan
      één verzoek.
   3. Bytes — de body werd ongelimiteerd ingelezen, zonder plafond.

   Het antwoord blijft 204 in alle gevallen behalve een te grote body,
   want een browser die 4xx krijgt op zijn rapportage gaat opnieuw
   proberen en dat maakt het erger. */

import { NextRequest, NextResponse } from 'next/server'
import { captureMessage } from '@/lib/sentry'
import { maakLimiet, sleutelUitVerzoek, leesBegrensd, TeGroot } from '@/lib/verzoeklimiet'

export const runtime = 'nodejs'

/** Een echte overtreding komt in trosjes bij een paginabezoek, niet in
    honderdtallen. Ruim genoeg voor een pagina met een kapotte CSP. */
const limiet = maakLimiet({
  capaciteit: Number(process.env.CSP_RATE_CAPACITY ?? 30),
  perSeconde: 1,
})

/** Meer dan dit uit één verzoek zegt niets extra's: het zijn dezelfde
    paar directives. De rest wordt geteld, niet doorgestuurd. */
const MAX_GEBEURTENISSEN = 10

/** Een CSP-rapport is enkele honderden bytes. 64 KB is al royaal. */
const MAX_BYTES = 64 * 1024

type LegacyReport = {
  'csp-report'?: {
    'document-uri'?: string
    'violated-directive'?: string
    'effective-directive'?: string
    'blocked-uri'?: string
    'source-file'?: string
    'line-number'?: number
    'column-number'?: number
    disposition?: 'enforce' | 'report'
  }
}
type ReportingApiEntry = {
  type?: string
  body?: Record<string, unknown>
  age?: number
  url?: string
  user_agent?: string
}

export async function POST(req: NextRequest) {
  if (!limiet.toestaan(sleutelUitVerzoek(req))) {
    return new NextResponse(null, { status: 429 })
  }

  let text: string
  try {
    text = await leesBegrensd(req, MAX_BYTES)
  } catch (e) {
    // Wel een echte foutcode: een te grote body is geen rapport dat we
    // stil laten vallen, en de verzender hoort te weten dat hij te veel
    // stuurt in plaats van het te blijven proberen.
    if (e instanceof TeGroot) return new NextResponse(null, { status: 413 })
    return new NextResponse(null, { status: 204 })
  }

  try {
    if (!text) return new NextResponse(null, { status: 204 })

    const parsed = safeJson(text)
    // Reporting API sends an array of entries; legacy sends a single
    // object under "csp-report". Normalize both.
    const events = normalize(parsed)
    const doorgestuurd = events.slice(0, MAX_GEBEURTENISSEN)
    for (const e of doorgestuurd) {
      const msg = `[csp] ${e.directive ?? 'unknown'} blocked ${e.blockedUri ?? '?'} on ${e.documentUri ?? '?'}`
      // Breadcrumb-friendly — don't spam full stack traces. Log level
      // is 'warning' because these are informational until we
      // actually enforce strict CSP.
      console.warn(msg, e)
      captureMessage(msg, 'warning')
    }
    if (events.length > doorgestuurd.length) {
      // Eén regel, geen Sentry-bericht. Stil afkappen leest als "dit was
      // alles", en dat is precies de verkeerde conclusie.
      console.warn(
        `[csp] ${events.length - doorgestuurd.length} van ${events.length} rapporten uit dit verzoek niet doorgestuurd (plafond ${MAX_GEBEURTENISSEN})`,
      )
    }
    return new NextResponse(null, { status: 204 })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function normalize(
  raw: unknown,
): Array<{ directive?: string; blockedUri?: string; documentUri?: string; disposition?: string; sourceFile?: string; line?: number }> {
  const out: ReturnType<typeof normalize> = []
  if (!raw) return out
  if (Array.isArray(raw)) {
    for (const entry of raw as ReportingApiEntry[]) {
      const b = (entry.body ?? {}) as Record<string, unknown>
      out.push({
        directive: str(b.effectiveDirective ?? b.violatedDirective),
        blockedUri: str(b.blockedURL ?? b.blockedUri),
        documentUri: str(b.documentURL ?? entry.url),
        disposition: str(b.disposition),
        sourceFile: str(b.sourceFile),
        line: num(b.lineNumber),
      })
    }
    return out
  }
  const legacy = (raw as LegacyReport)['csp-report']
  if (legacy) {
    out.push({
      directive: legacy['effective-directive'] ?? legacy['violated-directive'],
      blockedUri: legacy['blocked-uri'],
      documentUri: legacy['document-uri'],
      disposition: legacy.disposition,
      sourceFile: legacy['source-file'],
      line: legacy['line-number'],
    })
  }
  return out
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}
function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}
