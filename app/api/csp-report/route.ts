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
      // CSP report payloads are POSTed by the user's browser; a hostile
      // page can supply arbitrary blockedUri/documentUri/directive values
      // aimed at log forging (newlines, control chars, fake record
      // separators). Sanitize before constructing the log entry.
      // Closes CodeQL: js/log-injection + js/tainted-format-string.
      // Mirrors apps/philly-standalone/app/api/csp-report/route.ts.
      const directive = sanitizeLogField(e.directive ?? 'unknown', 64)
      const blockedUri = sanitizeLogField(e.blockedUri ?? '?', 256)
      const documentUri = sanitizeLogField(e.documentUri ?? '?', 256)
      const msg = `[csp] ${directive} blocked ${blockedUri} on ${documentUri}`
      // Pass `msg` as a `%s` value rather than the format string itself;
      // any `%s`/`%d` that survives sanitization can only land in value
      // slots, not control formatting.
      console.warn('%s', msg, e)
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

// Built with String.fromCharCode so the source file stays plain UTF-8
// (avoids git flagging the file as binary when literal C0 control
// bytes get committed). Same pattern as the standalone helper at
// apps/philly-standalone/app/api/csp-report/route.ts (Bundle CS).
const _C0_RANGE = Array.from({ length: 0x20 }, (_, i) => String.fromCharCode(i)).join('')
const CONTROL_CHAR_RE = new RegExp('[' + _C0_RANGE + String.fromCharCode(0x7f) + ']', 'g')
export function sanitizeLogField(value: unknown, maxLen: number): string {
  const s = typeof value === 'string' ? value : String(value)
  return s.replace(CONTROL_CHAR_RE, ' ').slice(0, maxLen)
}
