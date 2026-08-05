import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock Supabase session refresh — the proxy awaits this for every
// request, but its auth logic isn't what we're testing here. We return
// a pass-through response so the proxy can stack its security headers
// on top of it.
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}))

// proxy.ts reads NODE_ENV at module-scope inside buildCsp(). Pin it to
// 'production' so CSP includes upgrade-insecure-requests and excludes
// 'unsafe-eval' — the shape we actually ship.
vi.stubEnv('NODE_ENV', 'production')

// Import after env stub + mock are in place.
const { default: middleware } = await import('./proxy')

function makeReq(
  url: string,
  {
    method = 'GET',
    headers = {},
    cookies = {},
  }: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string> } = {},
): NextRequest {
  const h = new Headers(headers)
  // NextRequest reads cookies from the `cookie` header.
  if (Object.keys(cookies).length) {
    h.set(
      'cookie',
      Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    )
  }
  return new NextRequest(url, { method, headers: h })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('proxy: locale redirect', () => {
  it('redirects unprefixed marketing path to the cookie locale', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/about', { cookies: { jdl_locale: 'nl' } }),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://juandiazllc.com/nl/about')
  })

  it('falls back to Accept-Language when no cookie is set', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/about', {
        headers: { 'accept-language': 'de-DE,de;q=0.9' },
      }),
    )
    expect(res.headers.get('location')).toBe('https://juandiazllc.com/de/about')
  })

  it('defaults to /en when neither cookie nor Accept-Language match a supported locale', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/about', {
        headers: { 'accept-language': 'fr-FR' },
      }),
    )
    expect(res.headers.get('location')).toBe('https://juandiazllc.com/en/about')
  })

  it('does not redirect a path already prefixed with a supported locale', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en/about'))
    expect(res.status).not.toBe(307)
  })

  it('exempts /philly — the CRM lives under its own locale-agnostic tree', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/philly/contacts'))
    expect(res.status).not.toBe(307)
  })

  it('exempts /api/*', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/api/health'))
    expect(res.status).not.toBe(307)
  })

  it('exempts static assets (paths with a file extension)', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/manifest.json'))
    expect(res.status).not.toBe(307)
  })

  it('redirects "/" to /<locale>', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/', { cookies: { jdl_locale: 'es' } }),
    )
    expect(res.headers.get('location')).toBe('https://juandiazllc.com/es')
  })
})

describe('proxy: CSRF same-origin check', () => {
  it('blocks cross-origin POST to /api/*', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/newsletter', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', origin: 'https://evil.example.com' },
      }),
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/Cross-origin/)
  })

  it('allows same-origin POST to /api/*', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/newsletter', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', origin: 'https://juandiazllc.com' },
      }),
    )
    expect(res.status).not.toBe(403)
  })

  it('allows POST with no Origin/Referer (e.g. server-to-server curl)', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/newsletter', {
        method: 'POST',
        headers: { host: 'juandiazllc.com' },
      }),
    )
    expect(res.status).not.toBe(403)
  })

  // Regressie 2026-08-02. De cal.com-webhook stuurt Origin: https://cal.com mee.
  // Zonder uitzondering kreeg élke boeking 403 en draaide de
  // handtekeningcontrole nooit — gemeten op productie, niet bedacht. Dat is een
  // stille fout: cal.com meldt niets en er komt simpelweg nooit een lead.
  it('blokkeert /api/cal NIET bij een Origin van cal.com', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/cal', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', origin: 'https://cal.com' },
      }),
    )
    expect(res.status).not.toBe(403)
  })

  // De keerzijde: de uitzondering moet smal zijn. Als deze test ooit omvalt is
  // het CSRF-gat verbreed en staat elk /api/*-pad open voor cal.com.
  it('blokkeert een andere route nog steeds bij diezelfde Origin', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/newsletter', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', origin: 'https://cal.com' },
      }),
    )
    expect(res.status).toBe(403)
  })

  it('falls back to Referer when Origin header is absent', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/api/newsletter', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', referer: 'https://attacker.test/phish' },
      }),
    )
    expect(res.status).toBe(403)
  })

  it('does not apply the CSRF gate to safe methods', async () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const res = await middleware(
        makeReq('https://juandiazllc.com/api/newsletter', {
          method,
          headers: { host: 'juandiazllc.com', origin: 'https://evil.example.com' },
        }),
      )
      expect(res.status, `${method} should bypass CSRF`).not.toBe(403)
    }
  })

  it('exempts third-party webhook endpoints (/api/sms/webhook, /api/webhooks/inbound/*)', async () => {
    const endpoints = [
      '/api/sms/webhook',
      '/api/webhooks/inbound/twilio',
      '/api/auth/callback',
      '/api/log-error',
      '/api/csp-report',
      '/api/health',
      '/api/v1/contacts',
    ]
    for (const path of endpoints) {
      const res = await middleware(
        makeReq(`https://juandiazllc.com${path}`, {
          method: 'POST',
          headers: { host: 'juandiazllc.com', origin: 'https://third-party.example' },
        }),
      )
      expect(res.status, `${path} should be CSRF-exempt`).not.toBe(403)
    }
  })

  it('only runs the CSRF gate on /api/* — /philly/api/* is scoped to its own auth layer', async () => {
    // /philly/api/* is NOT under /api/ (it's under /philly/), so the CSRF
    // gate in proxy.ts doesn't apply. Philly routes enforce session +
    // scope via requireScope(). This test pins that boundary.
    const res = await middleware(
      makeReq('https://juandiazllc.com/philly/api/contacts', {
        method: 'POST',
        headers: { host: 'juandiazllc.com', origin: 'https://evil.example.com' },
      }),
    )
    expect(res.status).not.toBe(403)
  })
})

describe('proxy: security response headers', () => {
  it('sets the core security headers on a normal response', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en/about'))
    expect(res.headers.get('Content-Security-Policy')).toMatch(/default-src 'self'/)
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(res.headers.get('X-Frame-Options')).toBe('DENY')
    expect(res.headers.get('Permissions-Policy')).toMatch(/camera=\(\)/)
    expect(res.headers.get('X-DNS-Prefetch-Control')).toBe('off')
  })

  it('CSP is built for production — no unsafe-eval, upgrade-insecure-requests present', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en/about'))
    const csp = res.headers.get('Content-Security-Policy') || ''
    expect(csp).not.toMatch(/unsafe-eval/)
    expect(csp).toMatch(/upgrade-insecure-requests/)
    expect(csp).toMatch(/frame-ancestors 'none'/)
    expect(csp).toMatch(/object-src 'none'/)
  })

  it('sets HSTS when served via https', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/en/about', {
        headers: { 'x-forwarded-proto': 'https' },
      }),
    )
    expect(res.headers.get('Strict-Transport-Security')).toMatch(/max-age=63072000/)
  })
})

describe('proxy: request id propagation', () => {
  it('keeps a valid inbound x-request-id', async () => {
    const id = 'abc123-def456'
    const res = await middleware(
      makeReq('https://juandiazllc.com/en/about', { headers: { 'x-request-id': id } }),
    )
    expect(res.headers.get('x-request-id')).toBe(id)
  })

  it('generates a new id when the inbound value is malformed', async () => {
    const res = await middleware(
      makeReq('https://juandiazllc.com/en/about', {
        headers: { 'x-request-id': 'has spaces & punctuation!' },
      }),
    )
    const id = res.headers.get('x-request-id')
    expect(id).toBeTruthy()
    expect(id).not.toBe('has spaces & punctuation!')
  })
})

/* ── CSP: het Plausible-script moet erlangs ───────────────────────────────
   Op 2026-08-05 bleek dat analytics op productie nooit gewerkt heeft: het
   script stond in de DOM, maar de CSP liet plausible.io niet toe. Dat was
   niet te zien aan de HTML — alleen aan een netwerkopname zonder één verzoek
   naar plausible.io en een Resource Timing-entry met transferSize 0.

   Deze tests bewaken de policy zelf, zodat die stilte niet terugkomt. */

function cspVan(res: Response, strikt = false): string {
  const naam = strikt ? 'content-security-policy-report-only' : 'content-security-policy'
  return res.headers.get(naam) ?? ''
}

function richtlijn(csp: string, naam: string): string {
  const deel = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(naam + ' '))
  return deel ?? ''
}

describe('proxy: CSP laat de analytics-host toe', () => {
  it('script-src bevat plausible.io in de afgedwongen policy', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(richtlijn(cspVan(res), 'script-src')).toContain('https://plausible.io')
  })

  it('connect-src bevat plausible.io, anders komt de beacon niet weg', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(richtlijn(cspVan(res), 'connect-src')).toContain('https://plausible.io')
  })

  // Onder 'strict-dynamic' negeert de browser host-allowlists voor scripts.
  // Hem daar toch neerzetten zou schijnzekerheid geven; connect-src valt daar
  // niet onder en moet er juist wél in staan.
  it('de strikte report-only policy zet de host niet in script-src', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    const strikt = cspVan(res, true)
    expect(strikt).toContain("'strict-dynamic'")
    expect(richtlijn(strikt, 'script-src')).not.toContain('plausible.io')
    expect(richtlijn(strikt, 'connect-src')).toContain('https://plausible.io')
  })

  it('de rest van de policy blijft dicht', async () => {
    const csp = cspVan(await middleware(makeReq('https://juandiazllc.com/en')))
    expect(richtlijn(csp, 'default-src')).toBe("default-src 'self'")
    expect(richtlijn(csp, 'object-src')).toBe("object-src 'none'")
    expect(richtlijn(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })
})
