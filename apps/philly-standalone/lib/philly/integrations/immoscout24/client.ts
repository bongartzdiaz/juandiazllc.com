/* ImmoScout24 HTTP client — OAuth2 client_credentials + listing CRUD.
   ──────────────────────────────────────────────────────────────────
   Sibling of lib/philly/integrations/funda/client.ts. Same shape;
   different URLs + auth header conventions.

   IS24 uses both OAuth 1.0a (legacy XML import API) and OAuth 2.0
   (REST API). We target the REST API only (modern partner programme).
   --------------------------------------------------------------- */

import type {
  IS24ListingPayload,
  IS24PublishResponse,
  IS24LeadWebhook,
} from './types'

export const IS24_BASE_URL = process.env.IS24_BASE_URL ?? 'https://api.immobilienscout24.de/restapi/api'
export const IS24_TOKEN_URL = process.env.IS24_TOKEN_URL ?? 'https://api.immobilienscout24.de/oauth/token'

export interface IS24Credentials {
  clientId: string
  clientSecret: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}

const tokenCache = new Map<string, CachedToken>()

export function clearIS24TokenCache(): void {
  tokenCache.clear()
}

async function getAccessToken(
  creds: IS24Credentials,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const cached = tokenCache.get(creds.clientId)
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return { ok: true, token: cached.accessToken }
  }

  try {
    const res = await fetchImpl(IS24_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }).toString(),
    })

    if (!res.ok) return { ok: false, error: `token endpoint ${res.status}` }

    const json = (await res.json()) as { access_token: string; expires_in: number }
    if (!json.access_token) return { ok: false, error: 'token endpoint returned no access_token' }

    const expiresInMs = (json.expires_in ?? 3600) * 1000
    tokenCache.set(creds.clientId, {
      accessToken: json.access_token,
      expiresAt: Date.now() + expiresInMs,
    })
    return { ok: true, token: json.access_token }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'token request failed' }
  }
}

export interface IS24Client {
  publish(payload: IS24ListingPayload): Promise<
    | { ok: true; response: IS24PublishResponse }
    | { ok: false; error: string }
  >
  unpublish(exposeId: string): Promise<{ ok: true } | { ok: false; error: string }>
  fetchLeads(since: Date): Promise<
    | { ok: true; leads: IS24LeadWebhook[] }
    | { ok: false; error: string }
  >
}

export function buildIS24Client(
  creds: IS24Credentials,
  fetchImpl: typeof fetch = fetch,
): IS24Client {
  async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const tok = await getAccessToken(creds, fetchImpl)
    if (!tok.ok) throw new Error(tok.error)
    return fetchImpl(`${IS24_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${tok.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })
  }

  return {
    async publish(payload) {
      try {
        const res = await authedFetch('/offer/v1.0/realestate', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          return { ok: false, error: `publish ${res.status}: ${body.slice(0, 200)}` }
        }
        const response = (await res.json()) as IS24PublishResponse
        return { ok: true, response }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'publish failed' }
      }
    },

    async unpublish(exposeId) {
      try {
        const res = await authedFetch(`/offer/v1.0/realestate/${encodeURIComponent(exposeId)}`, {
          method: 'DELETE',
        })
        if (res.ok || res.status === 404) return { ok: true }
        const body = await res.text().catch(() => '')
        return { ok: false, error: `unpublish ${res.status}: ${body.slice(0, 200)}` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'unpublish failed' }
      }
    },

    async fetchLeads(since) {
      try {
        const url = `/leads/v1.0?since=${encodeURIComponent(since.toISOString())}`
        const res = await authedFetch(url, { method: 'GET' })
        if (!res.ok) return { ok: false, error: `fetchLeads ${res.status}` }
        const json = (await res.json()) as { leads: IS24LeadWebhook[] }
        return { ok: true, leads: Array.isArray(json.leads) ? json.leads : [] }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'fetchLeads failed' }
      }
    },
  }
}
