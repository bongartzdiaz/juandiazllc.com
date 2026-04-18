/* ---------------------------------------------------------------
   POST /api/csp-report
   CSP violation sink. Browsers POST here (Content-Type:
   application/csp-report OR application/reports+json) when the page
   violates a CSP directive. We log it so we know something's wrong
   before users start calling.

   Unauthenticated, IP rate-limited so a hostile page can't DoS us.
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { captureMessage } from '@/lib/philly/sentry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CspReport {
  'csp-report'?: {
    'document-uri'?: string
    'violated-directive'?: string
    'effective-directive'?: string
    'blocked-uri'?: string
    'source-file'?: string
    'line-number'?: number
    'status-code'?: number
    referrer?: string
  }
  // Reporting API format (newer)
  type?: string
  body?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  // Very loose cap — some pages can fire multiple reports per load.
  const { ok } = rateLimit(`csp:${ip}`, { capacity: 100, refillPerSec: 1 })
  if (!ok) return new NextResponse(null, { status: 429 })

  let body: CspReport = {}
  try {
    body = (await req.json()) as CspReport
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const report = body['csp-report'] ?? (body.body as CspReport['csp-report']) ?? null
  if (!report) return new NextResponse(null, { status: 204 })

  logger.warn('csp: violation', {
    directive: report['effective-directive'] ?? report['violated-directive'],
    blocked: report['blocked-uri'],
    documentUri: report['document-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
    referrer: report.referrer,
    ip,
  })

  captureMessage(
    `CSP violation: ${report['effective-directive'] ?? 'unknown'} blocked ${report['blocked-uri'] ?? 'unknown'}`,
    'warning',
  )

  return new NextResponse(null, { status: 204 })
}
