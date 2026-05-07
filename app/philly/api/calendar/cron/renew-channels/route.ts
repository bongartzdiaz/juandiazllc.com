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

  if (cronSecret && headerSecret && headerSecret === cronSecret) {
    // Cron path — process all orgs.
  } else {
    const scope = await requireRole(['admin'])
    if (scope instanceof NextResponse) return scope
    triggeredBy = 'admin'
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!webhookBase) {
    return jsonError(
      'NEXT_PUBLIC_APP_URL must be set for renewal — providers need a webhook URL.',
      503,
    )
  }

  const due = await listDueForRenewal()
  // Sanity-cap the batch so a single sweep can't go runaway. If there
  // are more than MAX_PER_RUN due (unlikely outside disaster recovery),
  // the next sweep picks up the rest.
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
    dueTotal: due.length,
    processed: batch.length,
    renewed: renewedCount,
    failed: failedCount,
  })

  return NextResponse.json({
    data: {
      triggeredBy,
      dueTotal: due.length,
      processed: batch.length,
      renewed: renewedCount,
      failed: failedCount,
      // Per-channel results — useful for debugging, no PII / secrets.
      results,
    },
  })
}
