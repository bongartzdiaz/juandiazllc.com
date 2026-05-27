/* ImmoScout24Connector — registers IS24 in the /integrations UI.
   ──────────────────────────────────────────────────────────────────
   Sibling of FundaConnector. Same shape; targets the DE market.
   --------------------------------------------------------------- */

import { BaseConnector, type ConnectorMetadata, type PortalPublisher, type TestResult } from './base'
import { buildIS24Client } from '../immoscout24/client'
import type { IS24ListingPayload } from '../immoscout24/types'

export class ImmoScout24Connector extends BaseConnector implements PortalPublisher {
  meta: ConnectorMetadata = {
    id: 'immoscout24',
    name: 'ImmoScout24',
    category: 'portal',
    countries: ['DE'] as const,
    oauth: {
      authorizeUrl: 'https://api.immobilienscout24.de/oauth/authorize',
      tokenUrl: 'https://api.immobilienscout24.de/oauth/token',
      scopes: ['offer.write', 'leads.read'],
      clientIdEnv: 'IS24_CLIENT_ID',
      clientSecretEnv: 'IS24_CLIENT_SECRET',
      grantType: 'client_credentials',
    },
  }

  async test({ metadata }: { metadata?: Record<string, unknown> }): Promise<TestResult> {
    const clientId = (metadata?.clientId as string | undefined) ?? process.env.IS24_CLIENT_ID
    const clientSecret = (metadata?.clientSecret as string | undefined) ?? process.env.IS24_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false, error: 'ImmoScout24 client_id and client_secret required (partner programme).' }
    }
    const client = buildIS24Client({ clientId, clientSecret })
    const probe = await client.fetchLeads(new Date(0))
    if (!probe.ok) return { ok: false, error: probe.error }
    return { ok: true, info: { leadCount: probe.leads.length } }
  }

  async validate(input: unknown) {
    const { validate: validateAdapter } = await import('../immoscout24/adapter')
    const result = validateAdapter(input as Parameters<typeof validateAdapter>[0])
    if (result.ok) return { ok: true as const }
    return { ok: false as const, code: result.code, message: result.message }
  }

  async publish(input: unknown) {
    const { validate: validateAdapter, toIS24Payload } = await import('../immoscout24/adapter')
    const deusProp = input as Parameters<typeof validateAdapter>[0]
    const v = validateAdapter(deusProp)
    if (!v.ok) return { ok: false as const, code: v.code, message: v.message }

    const clientId = process.env.IS24_CLIENT_ID
    const clientSecret = process.env.IS24_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return {
        ok: false as const,
        code: 'IS24_NOT_CONFIGURED',
        message: 'ImmoScout24 credentials missing — partner API not configured for this org yet.',
      }
    }

    const payload = toIS24Payload(deusProp) satisfies IS24ListingPayload
    const client = buildIS24Client({ clientId, clientSecret })
    const r = await client.publish(payload)
    if (!r.ok) return { ok: false as const, code: 'IS24_PUBLISH_FAILED', message: r.error }
    return { ok: true as const, externalId: r.response.exposeId, externalUrl: r.response.publicUrl }
  }

  async unpublish(externalId: string) {
    const clientId = process.env.IS24_CLIENT_ID
    const clientSecret = process.env.IS24_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false as const, code: 'IS24_NOT_CONFIGURED', message: 'IS24 credentials missing.' }
    }
    const client = buildIS24Client({ clientId, clientSecret })
    const r = await client.unpublish(externalId)
    if (!r.ok) return { ok: false as const, code: 'IS24_UNPUBLISH_FAILED', message: r.error }
    return { ok: true as const }
  }

  async fetchLeads(since: Date) {
    const clientId = process.env.IS24_CLIENT_ID
    const clientSecret = process.env.IS24_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return { ok: false as const, code: 'IS24_NOT_CONFIGURED', message: 'IS24 credentials missing.' }
    }
    const client = buildIS24Client({ clientId, clientSecret })
    const r = await client.fetchLeads(since)
    if (!r.ok) return { ok: false as const, code: 'IS24_LEADS_FAILED', message: r.error }
    return { ok: true as const, leads: r.leads }
  }
}
