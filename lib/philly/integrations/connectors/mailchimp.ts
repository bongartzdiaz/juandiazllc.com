import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class MailchimpConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'marketing',
    apiKey: true,
  }
  async test({ apiKey }: { apiKey?: string }): Promise<TestResult> {
    if (!apiKey) return { ok: false, error: 'Missing API key' }
    // Mailchimp key format: "key-dcN" — dc is datacenter
    const dc = apiKey.split('-')[1]
    if (!dc) return { ok: false, error: 'Invalid API key format' }
    try {
      const auth = Buffer.from(`any:${apiKey}`).toString('base64')
      const res = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
        headers: { Authorization: `Basic ${auth}` },
      })
      if (!res.ok) return { ok: false, error: `Mailchimp ${res.status}` }
      return { ok: true, info: { dc } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
