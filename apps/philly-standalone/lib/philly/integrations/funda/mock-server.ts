/* Funda mock server — hermetic test fixture.
   ──────────────────────────────────────────────────────────────────
   Drop-in `fetch` replacement that responds with realistic Funda-shaped
   payloads. Pass to buildFundaClient() as the second arg in tests.

   Usage in a test:

     const mock = createFundaMock({ tokens: ['t-1'] })
     const client = buildFundaClient(
       { clientId: 'cid', clientSecret: 'cs' },
       mock.fetchImpl,
     )
     const r = await client.publish(payload)

   The mock tracks all calls (`mock.calls`) so tests can assert on
   request shape, not just response.

   ## What the mock simulates

   - OAuth token endpoint — returns a configurable token + expires_in.
   - POST /listings — assigns a listing id, returns FundaPublishResponse.
   - DELETE /listings/:id — 200 if known, 404 if not (idempotent flow).
   - GET /leads?since=… — returns the leads added via mock.addLead().

   ## What it does NOT simulate

   - Rate-limiting (Funda's real API has 100 req/min/partner)
   - Async moderation (real API may return `pending_review`; we
     hard-code `live`)
   - Photo CDN ingestion latency
   --------------------------------------------------------------- */

import type { FundaListingPayload, FundaLeadWebhook } from './types'

export interface RecordedCall {
  url: string
  method: string
  authHeader?: string
  bodyJson?: unknown
  bodyForm?: Record<string, string>
}

export interface FundaMockOptions {
  /** Tokens to hand out in order; cycles after exhausted. */
  tokens?: string[]
  /** Override token expiry in seconds (default 3600). */
  expiresIn?: number
  /** Force the token endpoint to fail with a given HTTP status. */
  tokenError?: number
  /** Force the next publish call to return rejected status. */
  rejectNextPublish?: string
}

export interface FundaMock {
  fetchImpl: typeof fetch
  calls: RecordedCall[]
  publishedListings: Map<string, FundaListingPayload>
  addLead: (lead: FundaLeadWebhook) => void
  /** Inspect or reset state. */
  reset: () => void
}

export function createFundaMock(opts: FundaMockOptions = {}): FundaMock {
  const calls: RecordedCall[] = []
  const publishedListings = new Map<string, FundaListingPayload>()
  const leads: FundaLeadWebhook[] = []
  let tokenIdx = 0
  let rejectNextPublish: string | undefined = opts.rejectNextPublish

  const tokens = opts.tokens ?? ['mock-token']
  const expiresIn = opts.expiresIn ?? 3600

  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const method = (init.method ?? 'GET').toUpperCase()
    const headers = init.headers as Record<string, string> | undefined

    const recorded: RecordedCall = {
      url,
      method,
      authHeader: headers?.Authorization ?? headers?.authorization,
    }

    const bodyStr = typeof init.body === 'string' ? init.body : undefined

    // ── /oauth/token ──
    if (url.endsWith('/oauth/token')) {
      const params = new URLSearchParams(bodyStr ?? '')
      recorded.bodyForm = Object.fromEntries(params.entries())
      calls.push(recorded)
      if (opts.tokenError) {
        return new Response('forbidden', { status: opts.tokenError })
      }
      const token = tokens[tokenIdx % tokens.length]
      tokenIdx++
      return new Response(
        JSON.stringify({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Parse JSON body for partner endpoints (they all use JSON).
    if (bodyStr) {
      try { recorded.bodyJson = JSON.parse(bodyStr) } catch { /* leave undefined */ }
    }
    calls.push(recorded)

    // ── POST /listings ──
    if (method === 'POST' && /\/listings$/.test(url)) {
      if (rejectNextPublish) {
        const reason = rejectNextPublish
        rejectNextPublish = undefined
        return new Response(
          JSON.stringify({ listingId: '', status: 'rejected', rejectionReason: reason }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const payload = recorded.bodyJson as FundaListingPayload
      const listingId = `funda-${payload.partnerReference}-${Date.now()}`
      publishedListings.set(listingId, payload)
      return new Response(
        JSON.stringify({
          listingId,
          publicUrl: `https://www.funda.nl/koop/${payload.address.city.toLowerCase()}/${listingId}`,
          status: 'live',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // ── DELETE /listings/:id ──
    if (method === 'DELETE' && /\/listings\/[^/]+$/.test(url)) {
      const id = decodeURIComponent(url.split('/').pop()!)
      if (publishedListings.has(id)) {
        publishedListings.delete(id)
        // 204 No Content — Fetch spec REQUIRES null body for 204.
        // Node's undici throws TypeError if you pass a non-null body
        // like '' here.
        return new Response(null, { status: 204 })
      }
      return new Response('not found', { status: 404 })
    }

    // ── GET /leads ──
    if (method === 'GET' && url.includes('/leads')) {
      const u = new URL(url)
      const since = u.searchParams.get('since')
      const cutoff = since ? new Date(since).getTime() : 0
      const matched = leads.filter(l => new Date(l.receivedAt).getTime() >= cutoff)
      return new Response(
        JSON.stringify({ leads: matched }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response('mock: route not handled', { status: 501 })
  }

  return {
    fetchImpl,
    calls,
    publishedListings,
    addLead: (lead: FundaLeadWebhook) => { leads.push(lead) },
    reset: () => {
      calls.length = 0
      publishedListings.clear()
      leads.length = 0
      tokenIdx = 0
      rejectNextPublish = opts.rejectNextPublish
    },
  }
}
