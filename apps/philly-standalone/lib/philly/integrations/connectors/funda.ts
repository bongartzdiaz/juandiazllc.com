/* FundaConnector — registers Funda in the /integrations UI.
   ──────────────────────────────────────────────────────────────────
   The actual HTTP work + payload mapping lives in
   ../funda/{client,adapter,types}. This class is just the registry
   shim — same shape as the other 6 connectors.

   2026-05-27 — initial scaffold. `test()` is stubbed (returns "no
   credentials configured") because we don't yet have a sandbox URL +
   client_id / client_secret pair from Funda. When NVM/VBO partner
   access lands, replace the body with a real token-exchange round
   trip — same pattern as buildFundaClient's getAccessToken.

   Implements both BaseConnector (for the existing UI flow) and
   PortalPublisher (for the publish/unpublish/fetchLeads contract).
   --------------------------------------------------------------- */

import { BaseConnector, type ConnectorMetadata, type PortalPublisher, type TestResult } from './base'
import { buildFundaClient } from '../funda/client'
import type { FundaListingPayload } from '../funda/types'

export class FundaConnector extends BaseConnector implements PortalPublisher {
  meta: ConnectorMetadata = {
    id: 'funda',
    name: 'Funda',
    category: 'portal',
    countries: ['NL'] as const,
    oauth: {
      authorizeUrl: 'https://api.funda.nl/oauth/authorize',
      tokenUrl: 'https://api.funda.nl/oauth/token',
      scopes: ['listings:publish', 'leads:read'],
      clientIdEnv: 'FUNDA_CLIENT_ID',
      clientSecretEnv: 'FUNDA_CLIENT_SECRET',
      grantType: 'client_credentials',
    },
  }

  async test({ metadata }: { metadata?: Record<string, unknown> }): Promise<TestResult> {
    const clientId = (metadata?.clientId as string | undefined) ?? process.env.FUNDA_CLIENT_ID
    const clientSecret = (metadata?.clientSecret as string | undefined) ?? process.env.FUNDA_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false, error: 'Funda client_id and client_secret required (NVM/VBO partner programme).' }
    }

    // Sanity: do the token-exchange handshake. If 200, credentials work.
    const client = buildFundaClient({ clientId, clientSecret })
    // We don't have a "ping" endpoint, so use fetchLeads with epoch-0 as
    // a low-impact reachability check. Funda returns an empty array
    // when no leads exist, which is the expected dev-tenant state.
    const probe = await client.fetchLeads(new Date(0))
    if (!probe.ok) return { ok: false, error: probe.error }
    return { ok: true, info: { leadCount: probe.leads.length } }
  }

  // ─── PortalPublisher interface ───
  //
  // Each method delegates to the adapter + client. Concrete callers
  // (e.g. POST /api/properties/[id]/publish) typeguard the `input`
  // against DeusPropertyForFunda before passing in.

  async validate(input: unknown) {
    const { validate: validateAdapter } = await import('../funda/adapter')
    const result = validateAdapter(input as Parameters<typeof validateAdapter>[0])
    if (result.ok) return { ok: true as const }
    return { ok: false as const, code: result.code, message: result.message }
  }

  async publish(input: unknown) {
    const { validate: validateAdapter, toFundaPayload } = await import('../funda/adapter')
    const deusProp = input as Parameters<typeof validateAdapter>[0]
    const v = validateAdapter(deusProp)
    if (!v.ok) return { ok: false as const, code: v.code, message: v.message }

    const clientId = process.env.FUNDA_CLIENT_ID
    const clientSecret = process.env.FUNDA_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return {
        ok: false as const,
        code: 'FUNDA_NOT_CONFIGURED',
        message: 'Funda client credentials missing — partner API not configured for this org yet.',
      }
    }

    const payload = toFundaPayload(deusProp) satisfies FundaListingPayload
    const client = buildFundaClient({ clientId, clientSecret })
    const r = await client.publish(payload)
    if (!r.ok) return { ok: false as const, code: 'FUNDA_PUBLISH_FAILED', message: r.error }
    return { ok: true as const, externalId: r.response.listingId, externalUrl: r.response.publicUrl }
  }

  async unpublish(externalId: string) {
    const clientId = process.env.FUNDA_CLIENT_ID
    const clientSecret = process.env.FUNDA_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false as const, code: 'FUNDA_NOT_CONFIGURED', message: 'Funda credentials missing.' }
    }
    const client = buildFundaClient({ clientId, clientSecret })
    const r = await client.unpublish(externalId)
    if (!r.ok) return { ok: false as const, code: 'FUNDA_UNPUBLISH_FAILED', message: r.error }
    return { ok: true as const }
  }

  async fetchLeads(since: Date) {
    const clientId = process.env.FUNDA_CLIENT_ID
    const clientSecret = process.env.FUNDA_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false as const, code: 'FUNDA_NOT_CONFIGURED', message: 'Funda credentials missing.' }
    }
    const client = buildFundaClient({ clientId, clientSecret })
    const r = await client.fetchLeads(since)
    if (!r.ok) return { ok: false as const, code: 'FUNDA_LEADS_FAILED', message: r.error }
    return { ok: true as const, leads: r.leads }
  }
}
