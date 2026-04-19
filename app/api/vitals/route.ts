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

export const runtime = 'nodejs'

type Bucket = { tokens: number; last: number }
const buckets = new Map<string, Bucket>()
const CAPACITY = Number(process.env.VITALS_RATE_CAPACITY ?? 60)
const REFILL_PER_SEC = 2

function allow(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip) ?? { tokens: CAPACITY, last: now }
  const elapsed = (now - b.last) / 1000
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC)
  b.last = now
  if (b.tokens < 1) {
    buckets.set(ip, b)
    return false
  }
  b.tokens -= 1
  buckets.set(ip, b)
  return true
}

const VALID_METRICS = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB'])
const VALID_RATINGS = new Set(['good', 'needs-improvement', 'poor'])

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allow(ip)) {
    return new NextResponse(null, { status: 429 })
  }

  // sendBeacon / fetch with keepalive sends text/plain sometimes.
  let body: Record<string, unknown>
  try {
    const text = await req.text()
    body = text ? JSON.parse(text) : {}
  } catch {
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
