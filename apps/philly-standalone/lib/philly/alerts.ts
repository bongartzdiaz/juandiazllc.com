/* ---------------------------------------------------------------
   Operational alerts — Slack webhook helper
   ---------------------------------------------------------------
   For ad-hoc ops alerts (audit-chain integrity failure, scheduled
   erasure failure, daily reconciliation drift, etc.) — anything
   that's not a runtime exception (Sentry handles those, and Sentry
   has a native Slack integration that's better suited to error
   routing).

   No-ops cleanly when SLACK_ALERTS_WEBHOOK is unset, so dev and
   small installs don't pay for it.

   Keep payloads tight: this is a webhook, not a chat — one block
   per alert, deterministic shape so on-call can grep transcripts.
   --------------------------------------------------------------- */

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

const SEV_EMOJI: Record<AlertSeverity, string> = {
  info: ':information_source:',
  warning: ':warning:',
  error: ':x:',
  critical: ':rotating_light:',
}

const SEV_COLOR: Record<AlertSeverity, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#7c1d6f',
}

export interface AlertOptions {
  severity?: AlertSeverity
  /** Short headline. Becomes the Slack message text + attachment title. */
  title: string
  /** Optional longer body (markdown allowed in Slack mrkdwn syntax). */
  body?: string
  /** Structured key/value context. Each row becomes a Slack attachment field. */
  fields?: Record<string, string | number | boolean | null | undefined>
  /** Source identifier for grouping (e.g. "audit-chain", "erasure-cron"). */
  source?: string
  /** Override the env-configured webhook (useful in tests). */
  webhookUrl?: string
  /** Override the env-configured fetch (useful in tests). */
  fetchImpl?: typeof fetch
}

export interface AlertResult {
  /** Whether the webhook was actually called. False when disabled. */
  delivered: boolean
  /** Set when the webhook was called and returned non-2xx. */
  error?: string
}

function fieldsToBlock(fields: Record<string, unknown>): { title: string; value: string; short: boolean }[] {
  return Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => ({
      title: k,
      value: String(v),
      short: String(v).length <= 40,
    }))
}

/**
 * Send an operational alert to the configured Slack webhook.
 * Returns delivered=false silently when SLACK_ALERTS_WEBHOOK is unset.
 *
 * Never throws on network/HTTP errors — alert paths must not bring
 * down the caller. The result tells you whether it landed.
 */
export async function sendAlert(opts: AlertOptions): Promise<AlertResult> {
  const webhook = opts.webhookUrl ?? process.env.SLACK_ALERTS_WEBHOOK
  if (!webhook) return { delivered: false }

  const severity: AlertSeverity = opts.severity ?? 'warning'
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') return { delivered: false, error: 'fetch unavailable' }

  const env = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'unknown'
  const release = process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA ?? 'unknown'

  const baseFields: Record<string, unknown> = {
    env,
    release: release.slice(0, 12),
    source: opts.source ?? 'app',
    ...(opts.fields ?? {}),
  }

  const payload = {
    text: `${SEV_EMOJI[severity]} *${opts.title}*`,
    attachments: [
      {
        color: SEV_COLOR[severity],
        title: opts.title,
        text: opts.body,
        fields: fieldsToBlock(baseFields),
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  }

  try {
    const res = await fetchImpl(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { delivered: true, error: `webhook returned ${res.status}` }
    }
    return { delivered: true }
  } catch (err) {
    return { delivered: true, error: err instanceof Error ? err.message : 'fetch failed' }
  }
}

/** Whether the alert path is wired (env var present). */
export function alertsEnabled(): boolean {
  return Boolean(process.env.SLACK_ALERTS_WEBHOOK)
}
