/* POST /api/calendar/cron/renew-channels
 *
 * Sweeps CalendarChannel rows that are within the renewal buffer
 * (12h ahead of expiry) and calls push-sync.renew() on each.
 *
 * Two acceptable callers — same shape as /api/audit/prune:
 *   1. Cron with `X-Cron-Secret: $CRON_SECRET` header.
 *   2. Admin user with a Supabase session (manual "Renew now" button
 *      or trigger from a debug page; only admins to avoid letting any
 *      signed-in user induce a renewal storm).
 *
 * Cadence: runs hourly via Vercel Cron / external scheduler. Idempotent
 * — channels already past the renewal threshold get re-tried; channels
 * comfortably ahead of expiry are skipped (selector handles that).
 *
 * Returns { dueTotal, renewed, failed, results } so an operator can
 * see at a glance whether the cron is healthy. Per-channel detail is
 * limited to ids + reasons — never logs the channel's authSecret or
 * provider tokens.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { listDueForRenewal, renew } from '@/lib/philly/calendar/push-sync'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { timingSafeEqualStr } from '@/lib/philly/crypto'
import { logAudit } from '@/lib/philly/audit'
import type { AuthScope } from '@/lib/philly/auth-helpers'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_PER_RUN = 200 // upper bound on channels processed in a single sweep

interface RenewItem {
  channelId: string
  provider: string
  ok: boolean
  error?: string
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  let triggeredBy: 'cron' | 'admin' = 'cron'
  let adminScope: AuthScope | null = null

  if (cronSecret && headerSecret && timingSafeEqualStr(headerSecret, cronSecret)) {
    // Cron path — processes ALL organizations.
  } else {
    const scope = await requireRole(['admin'])
    if (scope instanceof NextResponse) return scope
    triggeredBy = 'admin'
    adminScope = scope
    // Rate-limit the admin path. Cron path skips because the cron
    // secret implies trust — an attacker with the secret has worse
    // routes to attack.
    const limited = enforceRateLimit(
      `cal-renew-admin:${scope.organizationId}`,
      PRESET_MUTATION,
    )
    if (limited) return limited
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!webhookBase) {
    return jsonError(
      'NEXT_PUBLIC_APP_URL must be set for renewal — providers need a webhook URL.',
      503,
    )
  }

  // CRITICAL: org-scope the selector when an admin triggers the sweep.
  // Without this, an admin in tenant A could induce a renewal storm
  // against every other tenant's calendar channels — the route would
  // gladly call Google/Microsoft on every connection in the database
  // up to MAX_PER_RUN. Cron path passes undefined to process all orgs.
  const due = await listDueForRenewal(
    new Date(),
    adminScope?.organizationId,
  )
  // Sanity-cap the batch so a single sweep can't go runaway.
  const batch = due.slice(0, MAX_PER_RUN)

  const results: RenewItem[] = []
  let renewedCount = 0
  let failedCount = 0

  for (const channel of batch) {
    const result = await renew(channel.id, webhookBase)
    if (result.ok) {
      renewedCount++
      results.push({ channelId: channel.id, provider: channel.provider, ok: true })
    } else {
      failedCount++
      results.push({
        channelId: channel.id,
        provider: channel.provider,
        ok: false,
        error: result.error,
      })
    }
  }

  logger.info('[calendar cron] renew sweep complete', {
    triggeredBy,
    orgScoped: adminScope?.organizationId ?? null,
    dueTotal: due.length,
    processed: batch.length,
    renewed: renewedCount,
    failed: failedCount,
  })

  // Self-audit admin-triggered runs. Cron has no userId so we can't
  // audit those (AuditLog.userId is required) — they live in logger
  // output only. Same trade-off as /api/audit/prune.
  if (triggeredBy === 'admin' && adminScope) {
    await logAudit({
      scope: adminScope,
      action: 'update',
      entity: 'integration',
      entityId: null,
      changes: {
        action: { old: null, new: 'renew_channels_sweep' },
        renewed: { old: 0, new: renewedCount },
        failed: { old: 0, new: failedCount },
        processed: { old: 0, new: batch.length },
      },
    })
  }

  return NextResponse.json({
    data: {
      triggeredBy,
      dueTotal: due.length,
      processed: batch.length,
      renewed: renewedCount,
      failed: failedCount,
      results,
    },
  })
}
