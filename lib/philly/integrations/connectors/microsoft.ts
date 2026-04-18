import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class MicrosoftConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'microsoft',
    name: 'Microsoft 365',
    category: 'calendar',
    oauth: {
      authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scopes: ['Mail.Send', 'Calendars.ReadWrite', 'offline_access', 'User.Read'],
      clientIdEnv: 'MICROSOFT_CLIENT_ID',
      clientSecretEnv: 'MICROSOFT_CLIENT_SECRET',
    },
  }
  async test({ accessToken }: { accessToken?: string }): Promise<TestResult> {
    if (!accessToken) return { ok: false, error: 'Missing access token' }
    try {
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return { ok: false, error: `Graph ${res.status}` }
      const json = await res.json()
      return { ok: true, info: { email: json.mail ?? json.userPrincipalName } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
