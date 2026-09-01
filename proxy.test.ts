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

  // The CRM used to live under /philly and was exempt from the locale prefix.
  // It moved to its own deployment, so /philly is now an ordinary unknown path:
  // it gets prefixed like any other and 404s. Asserting the redirect keeps the
  // exemption from being reinstated by reflex when someone sees the 404.
  it('no longer exempts /philly — the CRM moved out', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/philly/contacts'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://juandiazllc.com/en/philly/contacts')
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

  // Deze test las vroeger andersom: hij asserteerde dat /api/sms/webhook,
  // /api/webhooks/inbound/*, /api/auth/*, /api/v1/* en /api/health
  // CSRF-vrijgesteld WAREN. Alle vijf zijn met #134/#138 verdwenen, en de
  // test hield hun vrijstelling daarna op zijn plek — een test die het
  // defect verdedigt, dezelfde vorm als de Hotellerie-assertie in
  // tags.test.ts. De vrijstelling is nu weg en dit is de tegenproef.
  it('de routes die er nog zijn blijven CSRF-vrijgesteld', async () => {
    for (const path of ['/api/cal', '/api/log-error', '/api/csp-report', '/api/vitals']) {
      const res = await middleware(
        makeReq(`https://juandiazllc.com${path}`, {
          method: 'POST',
          headers: { host: 'juandiazllc.com', origin: 'https://third-party.example' },
        }),
      )
      expect(res.status, `${path} hoort vrijgesteld te zijn`).not.toBe(403)
    }
  })

  it('de vrijstellingen van vertrokken routes zijn ingetrokken', async () => {
    for (const path of [
      '/api/sms/webhook',
      '/api/webhooks/inbound/twilio',
      '/api/auth/callback',
      '/api/v1/contacts',
      '/api/health',
    ]) {
      const res = await middleware(
        makeReq(`https://juandiazllc.com${path}`, {
          method: 'POST',
          headers: { host: 'juandiazllc.com', origin: 'https://evil.example.com' },
        }),
      )
      expect(res.status, `${path} bestaat niet meer en hoort niet vrijgesteld`).toBe(403)
    }
  })

  it('een naam die met een vrijgesteld pad begint lift niet mee', async () => {
    // De oude matcher deed `pathname.startsWith(p)`, dus /api/cal dekte ook
    // /api/calculator. Op een site met /tools/energy-roi is dat geen
    // gezochte naam.
    for (const path of ['/api/calculator', '/api/calendar', '/api/vitals-export']) {
      const res = await middleware(
        makeReq(`https://juandiazllc.com${path}`, {
          method: 'POST',
          headers: { host: 'juandiazllc.com', origin: 'https://evil.example.com' },
        }),
      )
      expect(res.status, `${path} deelt alleen een voorvoegsel`).toBe(403)
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

  // Deze twee poorten ontbraken, en dat is precies hoe een omgekeerde
  // toelichting in proxy.ts jarenlang kon blijven staan: er stond dat de
  // nonce een noop was zolang 'unsafe-inline' erbij stond. Het is andersom.
  // Zodra een directive een nonce draagt negeert de browser 'unsafe-inline'
  // (CSP2+); Chrome meldt dat woordelijk in de console.
  it('afdwingende script-src is nonce-gestuurd en draagt GEEN unsafe-inline', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    const src = richtlijn(cspVan(res), 'script-src')
    expect(src).toMatch(/'nonce-[^']+'/)
    expect(src).not.toContain("'unsafe-inline'")
  })

  // De asymmetrie is opzet, geen slordigheid. style-src draagt GEEN nonce,
  // dus daar is 'unsafe-inline' wel degelijk actief en ook nodig: React zet
  // inline styles. Wie hem hier "opruimt" omdat script-src hem kwijt is,
  // sloopt de opmaak van de hele site.
  it('style-src houdt unsafe-inline, want daar staat geen nonce tegenover', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    const src = richtlijn(cspVan(res), 'style-src')
    expect(src).toContain("'unsafe-inline'")
    expect(src).not.toMatch(/'nonce-/)
  })

  // JSON-LD is een DATABLOK, geen script: de browser voert het nooit uit en
  // script-src raakt het niet. Die verwarring was de reden dat 'unsafe-inline'
  // er stond. Gemeten op productie 2026-08-21: vijf blokken zonder nonce,
  // alle vijf parsebaar in de DOM terwijl de nonce-policy actief was.
  it('report-uri blijft staan, anders is er niets af te lezen', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(cspVan(res)).toContain('report-uri /api/csp-report')
    expect(cspVan(res, true)).toContain('report-uri /api/csp-report')
  })

  // upgrade-insecure-requests hoort ALLEEN in de afdwingende CSP. In een
  // report-only-policy negeert de browser hem en logt een console-waarschuwing,
  // wat op elke pagina een Lighthouse best-practices-punt kostte (2026-08-12).
  it('report-only bevat GEEN upgrade-insecure-requests; afdwingend wél', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(cspVan(res, false)).toMatch(/upgrade-insecure-requests/)
    expect(cspVan(res, true)).not.toMatch(/upgrade-insecure-requests/)
  })

  it('de rest van de policy blijft dicht', async () => {
    const csp = cspVan(await middleware(makeReq('https://juandiazllc.com/en')))
    expect(richtlijn(csp, 'default-src')).toBe("default-src 'self'")
    expect(richtlijn(csp, 'object-src')).toBe("object-src 'none'")
    expect(richtlijn(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
  })
})

/* GA4 kwam er in september 2026 bij, en die tag stelt precies de omgekeerde
   eis aan de twee policies. De afgedwongen variant is een host-allowlist en
   heeft googletagmanager.com letterlijk nodig; de strikte report-only draait
   op 'strict-dynamic' en negeert host-allowlists juist. Een host die daar wel
   staat geeft schijnzekerheid.

   connect-src valt NIET onder strict-dynamic -- dat governt alleen script-src
   -- dus de twee beacon-hosts moeten in BEIDE varianten staan, anders slikt de
   strikte canary elke meting en loopt /api/csp-report vol. */
describe('proxy: CSP laat de GA4-tag toe, maar alleen waar dat werkt', () => {
  it('script-src bevat googletagmanager in de afgedwongen policy', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(richtlijn(cspVan(res), 'script-src')).toContain('https://www.googletagmanager.com')
  })

  it('connect-src laat de meetverzoeken weg, in beide varianten', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    for (const csp of [cspVan(res), cspVan(res, true)]) {
      const src = richtlijn(csp, 'connect-src')
      expect(src).toContain('https://*.google-analytics.com')
      expect(src).toContain('https://*.analytics.google.com')
    }
  })

  it('de strikte report-only policy zet de scripthost NIET in script-src', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    const strikt = cspVan(res, true)
    expect(strikt).toContain("'strict-dynamic'")
    expect(richtlijn(strikt, 'script-src')).not.toContain('googletagmanager')
  })

  /* Positieve controle op de meetlat zelf: zonder deze assertie slaagt alles
     hierboven ook op een lege of ontbrekende header. */
  it('er staat werkelijk een policy waarin gezocht wordt', async () => {
    const res = await middleware(makeReq('https://juandiazllc.com/en'))
    expect(richtlijn(cspVan(res), 'script-src').length).toBeGreaterThan(20)
    expect(richtlijn(cspVan(res), 'connect-src').length).toBeGreaterThan(20)
  })
})
