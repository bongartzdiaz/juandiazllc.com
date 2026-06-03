/* POST /api/calendar/cron/prune-channels
 *
 * Hard-deletes CalendarChannel rows in `expired` or `error` status that
 * haven't been touched in N days (default 90, configurable via env
 * CALENDAR_CHANNEL_PRUNE_DAYS or request body). Closes the GDPR Art.
 * 5(1)(e) storage-limitation gap on residual push-sync metadata.
 *
 * Same auth shape as /api/calendar/cron/renew-channels and /api/audit/prune:
 *   1. Cron with `X-Cron-Secret: $CRON_SECRET` header — sweeps all orgs.
 *   2. Admin user with a Supabase session — scoped to their organization
 *      (so a tenant-A admin can't prune tenant-B's metadata).
 *
 * Active channels are NEVER pruned — those are live and the renewal
 * cron owns their lifecycle. Race-safe: prunePruned() re-checks status
 * inside the deleteMany WHERE clause.
 *
 * Cadence: daily is plenty (rows accumulate slowly — one per failed
 * subscribe + one per disconnected user). Operator wires this up
 * alongside the renew-channels cron in MANUAL_TASKS.md.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import {
  listPrunable,
  prunePruned,
  pruneRetentionDays,
} from '@/lib/philly/calendar/push-sync'
import {
  pruneStaleSyncedEvents,
  syncedEventRetentionDays,
} from '@/lib/philly/calendar/event-persistence'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { timingSafeEqualStr } from '@/lib/philly/crypto'
import { logAudit } from '@/lib/philly/audit'
import type { AuthScope } from '@/lib/philly/auth-helpers'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Upper bound on a single sweep so a busy DB can't be wedged by one
// runaway delete. Pruning is daily; if more than this accumulates,
// the next run picks up the rest.
const MAX_PER_RUN = 500

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
    // secret implies trust — same posture as renew-channels.
    const limited = enforceRateLimit(
      `cal-prune-admin:${scope.organizationId}`,
      PRESET_MUTATION,
    )
    if (limited) return limited
  }

  let body: { days?: number; eventDays?: number } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body is fine */
  }

  const days = pruneRetentionDays(typeof body.days === 'number' ? body.days : undefined)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // CRITICAL: org-scope when admin-triggered. Same defense as the
  // renewal sweep — without it, tenant-A admin could induce a delete
  // across every other tenant's residual rows.
  const candidates = await listPrunable(
    cutoff,
    adminScope?.organizationId,
    MAX_PER_RUN,
  )
  const ids = candidates.map((c) => c.id)
  const deleted = await prunePruned(ids)

  // Also prune stale SyncedCalendarEvent rows in the same sweep (GDPR
  // Art. 5(1)(e) — storage limitation). Cached events older than the
  // retention window are deleted; the live provider feed remains the
  // source of truth and we re-sync if needed. Default retention 14 days.
  const eventDays = syncedEventRetentionDays(
    typeof body.eventDays === 'number' ? body.eventDays : undefined,
  )
  const eventCutoff = new Date(Date.now() - eventDays * 24 * 60 * 60 * 1000)
  const { deleted: eventsDeleted } = await pruneStaleSyncedEvents({
    cutoff: eventCutoff,
    organizationId: adminScope?.organizationId,
  })

  logger.info('[calendar cron] prune sweep complete', {
    triggeredBy,
    orgScoped: adminScope?.organizationId ?? null,
    candidates: candidates.length,
    deleted,
    eventsDeleted,
    days,
    eventDays,
    cutoff: cutoff.toISOString(),
    eventCutoff: eventCutoff.toISOString(),
  })

  // Self-audit admin-triggered runs (cron has no userId — same
  // trade-off as /api/audit/prune and renew-channels).
  if (triggeredBy === 'admin' && adminScope) {
    await logAudit({
      scope: adminScope,
      action: 'delete',
      entity: 'integration',
      entityId: null,
      changes: {
        action: { old: null, new: 'prune_channels_sweep' },
        channelsDeleted: { old: 0, new: deleted },
        eventsDeleted: { old: 0, new: eventsDeleted },
        days: { old: 0, new: days },
        eventDays: { old: 0, new: eventDays },
      },
    })
  }

  return NextResponse.json({
    data: {
      triggeredBy,
      candidates: candidates.length,
      deleted,
      eventsDeleted,
      days,
      eventDays,
      cutoff: cutoff.toISOString(),
      eventCutoff: eventCutoff.toISOString(),
    },
  })
}
