/* ---------------------------------------------------------------
   Client error sink — receives JS errors from global-error.tsx
   and forwards them to Sentry (if configured) + server log.
   Intentionally unauthenticated; throttled by IP.
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { captureException } from '@/lib/sentry'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  const { ok } = rateLimit(`log-error:${ip}`, { capacity: 30, refillPerSec: 0.5 })
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  let body: {
    message?: string
    stack?: string
    digest?: string
    url?: string
    userAgent?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const message = String(body.message ?? 'client error').slice(0, 1000)
  const stack = body.stack ? String(body.stack).slice(0, 4000) : undefined

  logger.warn('client error', {
    message,
    digest: body.digest,
    url: body.url,
    userAgent: body.userAgent,
    ip,
  })

  const err = new Error(message)
  if (stack) err.stack = stack
  captureException(err, {
    digest: body.digest,
    url: body.url,
    userAgent: body.userAgent,
    ip,
    source: 'client',
  })

  return NextResponse.json({ ok: true })
}
