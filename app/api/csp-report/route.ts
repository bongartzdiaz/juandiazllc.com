/* CSP violation sink.
   ─────────────────────────────────────────────────────────────
   Browsers POST here when a CSP directive blocks something (or
   would, in report-only mode). We log the envelope server-side so
   the pattern shows up wherever our existing logger feeds — and
   route it to Sentry when available so we see which blocked
   scripts are actually hitting users. Idempotent: returns 204
   regardless of parse outcome so browsers don't retry. */

import { NextRequest, NextResponse } from 'next/server'
import { captureMessage } from '@/lib/philly/sentry'

export const runtime = 'nodejs'

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
  try {
    const text = await req.text()
    if (!text) return new NextResponse(null, { status: 204 })

    const parsed = safeJson(text)
    // Reporting API sends an array of entries; legacy sends a single
    // object under "csp-report". Normalize both.
    const events = normalize(parsed)
    for (const e of events) {
      const msg = `[csp] ${e.directive ?? 'unknown'} blocked ${e.blockedUri ?? '?'} on ${e.documentUri ?? '?'}`
      // Breadcrumb-friendly — don't spam full stack traces. Log level
      // is 'warning' because these are informational until we
      // actually enforce strict CSP.
      console.warn(msg, e)
      captureMessage(msg, 'warning')
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
