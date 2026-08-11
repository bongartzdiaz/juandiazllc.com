/* Edge proxy (Next 16 middleware → proxy rename) — request hardening.
   ───────────────────────────────────────────────────────────────
   Runs on every request. Responsibilities:
     1. Same-origin (CSRF) check for state-changing API requests.
     2. Force HTTPS in production if somehow hit via http://
     3. Attach a request-id so logs + Sentry events can correlate.
     4. Apply security response headers (CSP, HSTS, Referrer, etc.)

   Keep this fast — it runs on every single request. */

import { NextRequest, NextResponse } from 'next/server'

/* ── Locale routing ───────────────────────────────────────────────
   Marketing pages live under /[locale]/..., Philly + API + auth +
   static assets are locale-agnostic. Middleware redirects any
   unprefixed marketing request to the user's preferred locale
   (cookie > Accept-Language > default 'en') and keeps the cookie
   fresh when a locale-prefixed URL is visited. */

const LOCALES = ['en', 'nl', 'de', 'es'] as const
const DEFAULT_LOCALE = 'en'
const LOCALE_SET = new Set<string>(LOCALES)
const LOCALE_COOKIE = 'jdl_locale'
const ONE_YEAR = 60 * 60 * 24 * 365

// Paths that should NEVER get a locale prefix.
const LOCALE_EXEMPT_PREFIXES = [
  '/api', '/auth', '/_next',
  '/sitemap.xml', '/robots.txt', '/rss.xml', '/feed.json',
  '/opengraph-image', '/icon', '/favicon', '/apple-icon',
]

function isLocaleExempt(pathname: string): boolean {
  if (LOCALE_EXEMPT_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '.'))) return true
  // Files with extensions (static assets) are exempt.
  if (/\.[a-z0-9]+$/i.test(pathname)) return true
  return false
}

function firstSegment(pathname: string): string | null {
  const m = /^\/([^\/]+)/.exec(pathname)
  return m ? m[1] : null
}

function detectLocale(req: NextRequest): string {
  const c = req.cookies.get(LOCALE_COOKIE)?.value
  if (c && LOCALE_SET.has(c)) return c
  const al = req.headers.get('accept-language') || ''
  for (const part of al.split(',')) {
    const code = part.trim().slice(0, 2).toLowerCase()
    if (LOCALE_SET.has(code)) return code
  }
  return DEFAULT_LOCALE
}

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
  '/api/vitals',         // Web Vitals beacons, keepalive fetch (no Origin on unload)
  '/api/health',         // uptime probe
  // cal.com-webhook. Stuurt Origin: https://cal.com mee, dus zonder deze
  // uitzondering krijgt élke boeking 403 en draait de handtekeningcontrole
  // nooit. Gemeten op productie 2026-08-02, vóór deze regel:
  //   zonder Origin  -> 503 (route werkt, secret nog niet gezet)
  //   met Origin     -> 403 {"error":"Cross-origin request blocked"}
  // Voldoet aan het criterium hierboven: de route authenticeert zichzelf met
  // een HMAC-SHA256-handtekening over de rauwe body en weigert alles zonder.
  '/api/cal',
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
/*   Two-headed policy. The enforced header keeps 'unsafe-inline' for
     script-src + style-src because our JSON-LD and React inline
     styles depend on it, and dropping it would force every page to
     become dynamic (via `headers()` for nonces) — a big SSG
     regression. The *report-only* header mirrors a strict nonce +
     'strict-dynamic' version and is attached alongside so we can
     collect real violation data before enforcing it later.          */

function genNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

/* Waar het Plausible-script vandaan komt. Dezelfde variabele als
   components/Analytics.tsx gebruikt, zodat de policy meebeweegt als we ooit
   zelf gaan hosten — twee losse constanten zouden vroeg of laat uiteenlopen
   en dan blokkeert de CSP stilzwijgend de meting.

   Onvoorwaardelijk toegevoegd, ook wanneer NEXT_PUBLIC_PLAUSIBLE_DOMAIN niet
   gezet is en Analytics.tsx dus niets rendert: een allowlist-item zonder
   bijbehorend script kost niets, terwijl de CSP laten afhangen van een env
   die de middleware apart moet lezen wél een foutbron is. */
const PLAUSIBLE_HOST = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST ?? 'https://plausible.io'

function buildCsp(nonce: string, strict: boolean): string {
  const isDev = process.env.NODE_ENV !== 'production'
  const scriptSrc = strict
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        // Bewust geen PLAUSIBLE_HOST hier: onder 'strict-dynamic' negeert de
        // browser host-allowlists volledig. Laadt dit script straks onder de
        // strikte policy, dan moet dat via de nonce die next/script meegeeft
        // — een host toevoegen zou schijnzekerheid zijn.
        ...(isDev ? ["'unsafe-eval'"] : []),
      ]
    : [
        "'self'",
        "'unsafe-inline'",
        `'nonce-${nonce}'`,                           // noop when unsafe-inline is present, but lets us flip to strict cheaply
        PLAUSIBLE_HOST,
        ...(isDev ? ["'unsafe-eval'"] : []),
      ]
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      ...(isDev ? ['ws:', 'wss:', 'http://localhost:*'] : []),
      'https://*.sentry.io',
      'https://*.ingest.sentry.io',
      // Ook nodig in de strikte variant: 'strict-dynamic' geldt alleen voor
      // script-src. Zonder deze regel laadt het script wel, maar komt de
      // beacon naar /api/event niet weg — meten zonder resultaat.
      PLAUSIBLE_HOST,
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

  // Locale routing — redirect unprefixed marketing paths to the user's
  // preferred locale. Philly / API / auth / static assets exempted.
  if (!isLocaleExempt(pathname)) {
    const seg = firstSegment(pathname)
    if (!seg || !LOCALE_SET.has(seg)) {
      const locale = detectLocale(req)
      const target = req.nextUrl.clone()
      target.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
      const redirect = NextResponse.redirect(target, 307)
      redirect.cookies.set(LOCALE_COOKIE, locale, {
        path: '/', maxAge: ONE_YEAR, sameSite: 'lax',
      })
      return redirect
    }
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

  // Per-request CSP nonce. The enforced CSP keeps 'unsafe-inline' so
  // JSON-LD + static generation keep working; the report-only CSP
  // mirrors the strict nonce version so we can observe violations
  // before flipping the switch.
  const nonce = genNonce()
  const cspEnforced = buildCsp(nonce, false)
  const cspStrict = buildCsp(nonce, true)

  const reqHeaders = new Headers(req.headers)
  reqHeaders.set('x-request-id', requestId)
  reqHeaders.set('x-nonce', nonce)
  reqHeaders.set('Content-Security-Policy', cspEnforced)

  // Basisrespons die de aangepaste requestheaders (nonce, request-id, CSP)
  // doorgeeft aan server components; daarop stapelen hieronder de
  // security-headers.
  //
  // Hier stond updateSession(), die de Supabase-sessiecookie ververste en
  // /philly afschermde. Met het CRM (#134) en de inlogpagina (deze commit)
  // weg is er niemand meer die inlogt: de leadopvang schrijft via de
  // server- en service-client, niet namens een gebruiker. Een sessie die
  // nooit ontstaat, hoeft ook niet ververst te worden.
  const res = NextResponse.next({ request: { headers: reqHeaders } })
  res.headers.set('x-request-id', requestId)

  // Freshen the locale cookie when a locale-prefixed URL is visited so
  // SSR `<html lang>` reflects the current URL's locale.
  {
    const seg = firstSegment(pathname)
    if (seg && LOCALE_SET.has(seg)) {
      res.cookies.set(LOCALE_COOKIE, seg, {
        path: '/', maxAge: ONE_YEAR, sameSite: 'lax',
      })
    }
  }

  // Security headers on the way out
  res.headers.set('Content-Security-Policy', cspEnforced)
  res.headers.set('Content-Security-Policy-Report-Only', cspStrict)
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
