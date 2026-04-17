/* Edge middleware — request hardening.
   ───────────────────────────────────────────────────────────────
   Runs on every request. Responsibilities:
     1. Same-origin (CSRF) check for state-changing API requests.
     2. Force HTTPS in production if somehow hit via http://
     3. Attach a request-id so logs + Sentry events can correlate.
     4. Apply security response headers (CSP, HSTS, Referrer, etc.)

   Keep this fast — it runs on every single request. */

import { NextRequest, NextResponse } from 'next/server'

/* ── 1. CSRF ──────────────────────────────────────────────────── */

const UNSAFE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

// Routes intentionally exposed to third parties; they authenticate via
// signed tokens / API keys and must NOT be blocked by Origin check.
const CSRF_EXEMPT_PREFIXES = [
  '/api/sms/webhook',
  '/api/webhooks/inbound/',
  '/api/v1/',
  '/api/auth/',          // NextAuth handles its own CSRF on internal endpoints
  '/api/log-error',      // client-side error sink, unauthenticated, IP-limited
  '/api/csp-report',     // browsers POST CSP violation reports (no Origin)
  '/api/health',         // uptime probe
]

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p))
}

/* ── 2. Request ID ────────────────────────────────────────────── */

function genRequestId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  }
}

/* ── 3. Content Security Policy ───────────────────────────────── */

function buildCsp(): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",                              // Next runtime scripts
      ...(isDev ? ["'unsafe-eval'"] : []),            // Next dev needs eval
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
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

const CSP = buildCsp()

/* ── Middleware ───────────────────────────────────────────────── */

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const proto = req.headers.get('x-forwarded-proto')

  // Force HTTPS in production (belt-and-braces; Nginx already redirects).
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
  if (pathname.startsWith('/api/') && UNSAFE_METHODS.has(req.method) && !isCsrfExempt(pathname)) {
    const host = req.headers.get('host') ?? ''
    const origin = req.headers.get('origin')
    const referer = req.headers.get('referer')

    if (origin || referer) {
      const sourceHost = (() => {
        try {
          if (origin) return new URL(origin).host
          if (referer) return new URL(referer).host
        } catch { /* fall through */ }
        return null
      })()

      if (sourceHost && sourceHost !== host) {
        return NextResponse.json(
          { error: 'Cross-origin request blocked' },
          { status: 403 },
        )
      }
    }
  }

  // Propagate request-id on the way in
  const existingId = req.headers.get('x-request-id')
  const requestId =
    existingId && /^[a-z0-9-]{8,64}$/i.test(existingId) ? existingId : genRequestId()

  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-request-id', requestId)

  const res = NextResponse.next({ request: { headers: reqHeaders } })

  // Security headers on the way out
  res.headers.set('x-request-id', requestId)
  res.headers.set('Content-Security-Policy', CSP)
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  )
  res.headers.set('X-DNS-Prefetch-Control', 'off')
  res.headers.set('X-XSS-Protection', '0')

  // HSTS only when served via HTTPS
  if (proto === 'https' || req.nextUrl.protocol === 'https:') {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains',
    )
  }

  return res
}

export const config = {
  matcher: [
    // Run on all paths except static assets. /api/* is included so we can
    // enforce CSRF; other paths are passed through (auth happens per-route).
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|otf|mp4|webm|map)$).*)',
  ],
}
