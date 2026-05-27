/* Funda HTTP client — OAuth2 client_credentials + listing CRUD.
   ──────────────────────────────────────────────────────────────────
   Production-shape HTTP client. NOT exercised against the real Funda
   API today (no partner credentials yet) — the test suite hits a mock
   server defined in mock-server.ts.

   When credentials land, the only thing that should change is the
   FUNDA_BASE_URL constant + verifying the response shapes against
   real wire data. The retry / timeout / auth scaffolding is generic.

   ## Auth model

   OAuth2 client_credentials grant. The token endpoint accepts
   client_id + client_secret (set per-org as encrypted Vercel-env
   refs or per-org rows in an OrgIntegrationCredential table; the
   `credential` resolver decides which). Tokens are short-lived
   (typically 1h) and are cached in-process per-org.

   ## Why not in `connectors/funda.ts` itself

   The BaseConnector contract is geared toward "test these credentials".
   The HTTP client implements the PortalPublisher methods (publish,
   unpublish, fetchLeads) which the connector class delegates to. Same
   pattern as lib/philly/email/send.ts (transport) vs the connector
   class (metadata + credential test).
   --------------------------------------------------------------- */

import type {
  FundaListingPayload,
  FundaPublishResponse,
  FundaLeadWebhook,
} from './types'

/** Real base URL — left as a constant so the mock server can shadow
 *  it without monkey-patching. */
export const FUNDA_BASE_URL = process.env.FUNDA_BASE_URL ?? 'https://api.funda.nl/partner/v1'
export const FUNDA_TOKEN_URL = process.env.FUNDA_TOKEN_URL ?? 'https://api.funda.nl/oauth/token'

export interface FundaCredentials {
  clientId: string
  clientSecret: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number  // epoch ms
}

/** Per-process token cache. Keyed by clientId so multi-tenant clients
 *  with different org credentials don't collide. */
const tokenCache = new Map<string, CachedToken>()

/** Strip the cache — exposed for tests + key-rotation handlers. */
export function clearFundaTokenCache(): void {
  tokenCache.clear()
}

async function getAccessToken(
  creds: FundaCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const cached = tokenCache.get(creds.clientId)
  // Refresh 60s before expiry to absorb clock skew.
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return { ok: true, token: cached.accessToken }
  }

  try {
    const res = await fetchImpl(FUNDA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      }).toString(),
    })

    if (!res.ok) {
      return { ok: false, error: `token endpoint ${res.status}` }
    }

    const json = (await res.json()) as { access_token: string; expires_in: number }
    if (!json.access_token) {
      return { ok: false, error: 'token endpoint returned no access_token' }
    }
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

/** ─── Public client interface ─── */

export interface FundaClient {
  publish(payload: FundaListingPayload): Promise<
    | { ok: true; response: FundaPublishResponse }
    | { ok: false; error: string }
  >
  unpublish(listingId: string): Promise<{ ok: true } | { ok: false; error: string }>
  fetchLeads(since: Date): Promise<
    | { ok: true; leads: FundaLeadWebhook[] }
    | { ok: false; error: string }
  >
}

/** Build a real Funda HTTP client. The `fetchImpl` parameter exists
 *  so tests can inject a mock server's fetch without monkey-patching
 *  global fetch. */
export function buildFundaClient(
  creds: FundaCredentials,
  fetchImpl: typeof fetch = fetch,
): FundaClient {
  async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const tok = await getAccessToken(creds, fetchImpl)
    if (!tok.ok) throw new Error(tok.error)
    return fetchImpl(`${FUNDA_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${tok.token}`,
        'Content-Type': 'application/json',
      },
    })
  }

  return {
    async publish(payload) {
      try {
        const res = await authedFetch('/listings', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          return { ok: false, error: `publish ${res.status}: ${body.slice(0, 200)}` }
        }
        const response = (await res.json()) as FundaPublishResponse
        return { ok: true, response }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'publish failed' }
      }
    },

    async unpublish(listingId) {
      try {
        const res = await authedFetch(`/listings/${encodeURIComponent(listingId)}`, {
          method: 'DELETE',
        })
        // 404 → already unpublished, treat as success (idempotent).
        if (res.ok || res.status === 404) return { ok: true }
        const body = await res.text().catch(() => '')
        return { ok: false, error: `unpublish ${res.status}: ${body.slice(0, 200)}` }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'unpublish failed' }
      }
    },

    async fetchLeads(since) {
      try {
        const url = `/leads?since=${encodeURIComponent(since.toISOString())}`
        const res = await authedFetch(url, { method: 'GET' })
        if (!res.ok) {
          return { ok: false, error: `fetchLeads ${res.status}` }
        }
        const json = (await res.json()) as { leads: FundaLeadWebhook[] }
        return { ok: true, leads: Array.isArray(json.leads) ? json.leads : [] }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'fetchLeads failed' }
      }
    },
  }
}
