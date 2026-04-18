import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class StripeConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'stripe',
    name: 'Stripe',
    category: 'payments',
    apiKey: true,
  }
  async test({ apiKey }: { apiKey?: string }): Promise<TestResult> {
    if (!apiKey) return { ok: false, error: 'Missing API key' }
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) return { ok: false, error: `Stripe ${res.status}` }
      const json = await res.json()
      return { ok: true, info: { livemode: json.livemode, available: json.available } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
