import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class GoogleConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'google',
    name: 'Google (Calendar + Gmail)',
    category: 'calendar',
    oauth: {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.metadata',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      clientIdEnv: 'GOOGLE_CLIENT_ID',
      clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    },
  }
  async test({ accessToken }: { accessToken?: string }): Promise<TestResult> {
    if (!accessToken) return { ok: false, error: 'Missing access token' }
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return { ok: false, error: `Google ${res.status}` }
      const json = await res.json()
      return { ok: true, info: { email: json.email } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
