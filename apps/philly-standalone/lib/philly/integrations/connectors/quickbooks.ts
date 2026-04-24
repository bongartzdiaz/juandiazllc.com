import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class QuickbooksConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'accounting',
    oauth: {
      authorizeUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      scopes: ['com.intuit.quickbooks.accounting'],
      clientIdEnv: 'QUICKBOOKS_CLIENT_ID',
      clientSecretEnv: 'QUICKBOOKS_CLIENT_SECRET',
    },
  }
  async test({ accessToken, metadata }: { accessToken?: string; metadata?: Record<string, unknown> }): Promise<TestResult> {
    if (!accessToken) return { ok: false, error: 'Missing access token' }
    const realmId = metadata?.realmId as string | undefined
    if (!realmId) return { ok: false, error: 'Missing realmId' }
    try {
      const res = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } },
      )
      if (!res.ok) return { ok: false, error: `QB ${res.status}` }
      const json = await res.json()
      return { ok: true, info: { company: json.CompanyInfo?.CompanyName } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
