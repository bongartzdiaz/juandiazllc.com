/* Web Vitals sink.
   ─────────────────────────────────────────────────────────────
   Receives beacon posts from components/WebVitalsReporter. Shape
   is the web-vitals library's Metric — name, value, delta, id,
   rating, navigationType. We log to stdout (Vercel captures it)
   and fan out to Plausible as a custom event if configured. No
   PII, no cookies; the client only sends after consent anyway.
   Rate-limited per IP like /api/log-error so a runaway page can't
   flood us. */

import { NextRequest, NextResponse } from 'next/server'
import { maakLimiet, sleutelUitVerzoek, leesBegrensd, TeGroot } from '@/lib/verzoeklimiet'

export const runtime = 'nodejs'

// Was een eigen kopie van het token-bucket-algoritme; staat nu in
// lib/verzoeklimiet.ts, samen met die van log-error. Capaciteit en
// snelheid blijven wat ze waren.
const limiet = maakLimiet({
  capaciteit: Number(process.env.VITALS_RATE_CAPACITY ?? 60),
  perSeconde: 2,
})

/** Eén metriek is een handvol getallen. 8 KB is ruim. */
const MAX_BYTES = 8 * 1024

const VALID_METRICS = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'])
const VALID_RATINGS = new Set(['good', 'needs-improvement', 'poor'])

export async function POST(req: NextRequest) {
  if (!limiet.toestaan(sleutelUitVerzoek(req))) {
    return new NextResponse(null, { status: 429 })
  }

  // sendBeacon / fetch with keepalive sends text/plain sometimes.
  let body: Record<string, unknown>
  try {
    const text = await leesBegrensd(req, MAX_BYTES)
    body = text ? JSON.parse(text) : {}
  } catch (e) {
    if (e instanceof TeGroot) return new NextResponse(null, { status: 413 })
    return new NextResponse(null, { status: 400 })
  }

  const name = String(body.name ?? '')
  if (!VALID_METRICS.has(name)) return new NextResponse(null, { status: 400 })

  const value = Number(body.value)
  if (!Number.isFinite(value)) return new NextResponse(null, { status: 400 })

  const rating = VALID_RATINGS.has(String(body.rating)) ? String(body.rating) : 'unknown'
  const path = typeof body.path === 'string' ? body.path.slice(0, 500) : undefined
  const nav = typeof body.navigationType === 'string' ? body.navigationType.slice(0, 40) : undefined

  // Stdout — Vercel log drain picks this up without any extra plumbing.
  console.log('[vitals]', JSON.stringify({ name, value, rating, path, nav }))

  return new NextResponse(null, { status: 204 })
}
