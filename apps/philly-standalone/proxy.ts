/* Edge proxy (Next 16 middleware → proxy rename) — request hardening.
   ───────────────────────────────────────────────────────────────
   Standalone Philly CRM variant. Responsibilities:
     1. Same-origin (CSRF) check for state-changing API requests.
     2. Force HTTPS in production if somehow hit via http://
     3. Attach a request-id so logs + Sentry events can correlate.
     4. Apply security response headers (CSP, HSTS, Referrer, etc.)
     5. Gate all non-public routes behind Supabase auth — if the
        brand-monorepo version gated /philly/*, this one gates
        everything except the explicit allow-list below. */

import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/* ── CSRF ────────────────────────────────────────────────────── */

const UNSAFE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

const CSRF_EXEMPT_PREFIXES = [
  '/api/sms/webhook',
  '/api/webhooks/inbound/',
  '/api/v1/',
  '/api/auth/',
  '/api/log-error',
  '/api/csp-report',
  '/api/vitals',
  '/api/health',
]

export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}

export function isCsrfBlocked(
  method: string,
  pathname: string,
  host: string,
  origin: string | null,
  referer: string | null,
): boolean {
  if (!pathname.startsWith('/api/')) return false
  if (!UNSAFE_METHODS.has(method)) return false
  if (isCsrfExempt(pathname)) return false
  if (!origin && !referer) return false

  let sourceHost: string | null = null
  try {
    if (origin) sourceHost = new URL(origin).host
    else if (referer) sourceHost = new URL(referer).host
  } catch { return false }

  return !!sourceHost && sourceHost !== host
}

/* ── Request ID ───────────────────────────────────────────────── */

function genRequestId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
}

/* ── Content Security Policy ──────────────────────────────────── */

function genNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function buildCsp(nonce: string, strict: boolean): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = strict
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...(isDev ? ["'unsafe-eval'"] : []),
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        `'nonce-${nonce}'`,
        ...(isDev ? ["'unsafe-eval'"] : []),
      ]
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      ...(isDev ? ['ws:', 'wss:', 'http://localhost:*'] : []),
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
    ],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
    'report-uri': ['/api/csp-report'],
  }
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(' ')}` : k))
    .join('; ')
}

/* ── Middleware ───────────────────────────────────────────────── */

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const proto = req.headers.get('x-forwarded-proto')

  // Force HTTPS in production.
  if (
    process.env.NODE_ENV === 'production' &&
    proto === 'http' &&
    req.nextUrl.hostname !== 'localhost' &&
    req.nextUrl.hostname !== '127.0.0.1'
  ) {
    const httpsUrl = new URL(req.nextUrl.toString())
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 308)
  }

  // Same-origin check for unsafe API methods.
  if (isCsrfBlocked(
    req.method,
    pathname,
    req.headers.get('host') ?? '',
    req.headers.get('origin'),
    req.headers.get('referer'),
  )) {
    return NextResponse.json(
      { error: 'Cross-origin request blocked' },
      { status: 403 },
    )
  }

  // Request-id propagation.
  const existingId = req.headers.get('x-request-id')
  const requestId =
    existingId && /^[a-z0-9-]{8,64}$/i.test(existingId) ? existingId : genRequestId()

  // Per-request CSP nonce.
  const nonce = genNonce()
  const cspEnforced = buildCsp(nonce, false)
  const cspStrict = buildCsp(nonce, true)

  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-request-id', requestId)
  reqHeaders.set('x-nonce', nonce)
  reqHeaders.set('Content-Security-Policy', cspEnforced)

  // Supabase auth — refresh session cookie + gate protected routes.
  // Note: updateSession's path allow-list (/login, /auth/*, /api/auth/*,
  // static assets) is inherited from lib/supabase/middleware.ts. The
  // standalone build treats every non-allow-listed route as protected.
  const res = await updateSession(req, reqHeaders)
  res.headers.set('x-request-id', requestId)

  // Security response headers.
  res.headers.set('Content-Security-Policy', cspEnforced)
  res.headers.set('Content-Security-Policy-Report-Only', cspStrict)
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  }

  return res
}

export const config = {
  matcher: [
    // Run on everything except Next internals + common static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|json)$).*)',
  ],
}
