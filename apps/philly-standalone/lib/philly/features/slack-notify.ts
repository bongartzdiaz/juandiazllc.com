/* Slack notification for super-admin feature-toggle actions.
   ─────────────────────────────────────────────────────────────────
   Every super-admin override (FORCED_ON / FORCED_OFF / INHERIT) posts
   here so the platform team (Juan + lucenai.eu staff) gets a live feed
   of cross-org operations. Pairs with the AuditLog hash-chain entry
   for compliance — Slack for awareness, AuditLog for evidence.

   Failure mode: silent. The SLACK_ALERTS_WEBHOOK env var is optional;
   if unset, this is a no-op. If the webhook is set but Slack is
   down, the error is swallowed (logged to console) so a Slack outage
   doesn't break a super-admin's ability to mutate state. The
   AuditLog row IS the system of record.

   Same webhook pattern as synthetic-prod.yml / db-slow-queries.yml /
   PR #35's sync-deus-shared.yml failure-alert path.
   ──────────────────────────────────────────────────────────────── */

import type { FeatureKey } from '../features'
import type { SuperAdminOverride } from './resolve'

export interface NotifyOverrideInput {
  /** Super-admin who made the change. */
  actorEmail: string | null
  /** Target organization being modified. */
  organizationId: string
  /** Optional human-readable org name (for richer Slack message). */
  organizationName?: string | null
  /** Feature being toggled. */
  feature: FeatureKey
  /** Previous override state (before this write). */
  previousState: SuperAdminOverride
  /** New override state (after this write). */
  newState: SuperAdminOverride
  /** Mandatory reason text supplied by the super-admin. */
  reason: string
}

/**
 * Fire-and-forget Slack post. Errors are logged but never propagated;
 * callers don't await the post (use `void notifySuperAdminOverride(...)`).
 *
 * If SLACK_ALERTS_WEBHOOK is unset, this is a no-op — keeps the helper
 * safe to call unconditionally without requiring every test/dev env
 * to configure Slack.
 */
export async function notifySuperAdminOverride(input: NotifyOverrideInput): Promise<void> {
  const webhookUrl = process.env.SLACK_ALERTS_WEBHOOK?.trim()
  if (!webhookUrl) return

  try {
    const orgLabel = input.organizationName
      ? `${input.organizationName} (\`${input.organizationId}\`)`
      : `\`${input.organizationId}\``

    const stateChange = `\`${input.previousState}\` → \`${input.newState}\``

    const emoji = input.newState === 'FORCED_OFF'
      ? ':no_entry:'
      : input.newState === 'FORCED_ON'
        ? ':white_check_mark:'
        : ':leftwards_arrow_with_hook:' // INHERIT (cleared)

    const payload = {
      text: `${emoji} *Super-admin feature override*`,
      attachments: [
        {
          color: input.newState === 'FORCED_OFF' ? '#7c1d6f' : '#2ecc71',
          title: `${input.feature}: ${stateChange}`,
          fields: [
            { title: 'Organization', value: orgLabel, short: false },
            { title: 'Actor', value: input.actorEmail ?? 'unknown', short: true },
            { title: 'Reason', value: input.reason, short: false },
          ],
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      console.warn(
        `[slack-notify] Slack returned ${response.status} for super-admin override notification`,
      )
    }
  } catch (err) {
    // Slack must NEVER break the main flow — audit-log is the system of record.
    console.error('[slack-notify] Failed to post super-admin override:', err)
  }
}
