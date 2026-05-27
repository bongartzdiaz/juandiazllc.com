/* ImmoScout24 mock server — hermetic test fixture.
   ──────────────────────────────────────────────────────────────────
   Same shape as lib/philly/integrations/funda/mock-server.ts. The two
   could share code, but keeping them separate makes wire-format-specific
   bugs easier to debug (publish-path 422 reason text differs etc.).
   --------------------------------------------------------------- */

import type { IS24ListingPayload, IS24LeadWebhook } from './types'

export interface RecordedCall {
  url: string
  method: string
  authHeader?: string
  bodyJson?: unknown
  bodyForm?: Record<string, string>
}

export interface IS24MockOptions {
  tokens?: string[]
  expiresIn?: number
  tokenError?: number
  rejectNextPublish?: string
}

export interface IS24Mock {
  fetchImpl: typeof fetch
  calls: RecordedCall[]
  publishedListings: Map<string, IS24ListingPayload>
  addLead: (lead: IS24LeadWebhook) => void
  reset: () => void
}

export function createIS24Mock(opts: IS24MockOptions = {}): IS24Mock {
  const calls: RecordedCall[] = []
  const publishedListings = new Map<string, IS24ListingPayload>()
  const leads: IS24LeadWebhook[] = []
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

    if (bodyStr) {
      try { recorded.bodyJson = JSON.parse(bodyStr) } catch { /* leave undefined */ }
    }
    calls.push(recorded)

    // POST /offer/v1.0/realestate
    if (method === 'POST' && url.endsWith('/offer/v1.0/realestate')) {
      if (rejectNextPublish) {
        const reason = rejectNextPublish
        rejectNextPublish = undefined
        return new Response(
          JSON.stringify({ exposeId: '', status: 'REJECTED', rejectionReason: reason }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        )
      }
      const payload = recorded.bodyJson as IS24ListingPayload
      const exposeId = `is24-${payload.partnerReference}-${Date.now()}`
      publishedListings.set(exposeId, payload)
      return new Response(
        JSON.stringify({
          exposeId,
          publicUrl: `https://www.immobilienscout24.de/expose/${exposeId}`,
          status: 'PUBLISHED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // DELETE /offer/v1.0/realestate/:id
    if (method === 'DELETE' && /\/offer\/v1\.0\/realestate\/[^/]+$/.test(url)) {
      const id = decodeURIComponent(url.split('/').pop()!)
      if (publishedListings.has(id)) {
        publishedListings.delete(id)
        return new Response(null, { status: 204 })
      }
      return new Response('not found', { status: 404 })
    }

    // GET /leads/v1.0
    if (method === 'GET' && url.includes('/leads/v1.0')) {
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
    addLead: (lead: IS24LeadWebhook) => { leads.push(lead) },
    reset: () => {
      calls.length = 0
      publishedListings.clear()
      leads.length = 0
      tokenIdx = 0
      rejectNextPublish = opts.rejectNextPublish
    },
  }
}
