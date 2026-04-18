import { BaseConnector, ConnectorMetadata, TestResult } from './base'

export class SlackConnector extends BaseConnector {
  meta: ConnectorMetadata = {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    oauth: {
      authorizeUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['chat:write', 'channels:read'],
      clientIdEnv: 'SLACK_CLIENT_ID',
      clientSecretEnv: 'SLACK_CLIENT_SECRET',
    },
  }
  async test({ accessToken }: { accessToken?: string }): Promise<TestResult> {
    if (!accessToken) return { ok: false, error: 'Missing access token' }
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const json = await res.json()
      if (!json.ok) return { ok: false, error: json.error ?? 'slack error' }
      return { ok: true, info: { team: json.team, user: json.user } }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'request failed' }
    }
  }
}
