/* Abstract connector contract. Concrete connectors implement subsets. */

export interface OAuthSpec {
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
}

export interface ConnectorMetadata {
  id: string
  name: string
  category: 'payments' | 'communication' | 'calendar' | 'accounting' | 'marketing' | 'productivity'
  oauth?: OAuthSpec
  /** Whether this connector uses static API keys vs OAuth */
  apiKey?: boolean
}

export interface TestResult {
  ok: boolean
  error?: string
  info?: Record<string, unknown>
}

export abstract class BaseConnector {
  abstract meta: ConnectorMetadata
  abstract test(credentials: { accessToken?: string; apiKey?: string; metadata?: Record<string, unknown> }): Promise<TestResult>
}
