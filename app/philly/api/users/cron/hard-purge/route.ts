/* POST /api/users/cron/hard-purge — GDPR Art. 17 second-stage erasure.

   Anonymizes PII on users whose soft-delete window has passed. The
   primary erasure (DELETE /api/me) marks deletedAt; this job removes
   PII permanently 30 days later (configurable via HARD_PURGE_AFTER_DAYS).

   Two acceptable callers:
     1. Cron — must send header `X-Cron-Secret: $CRON_SECRET`. Processes
        all orgs.
     2. Admin user (session-based) — scoped to own org only.

   Returns { purged, cutoff, days, triggeredBy }.

   Run daily via:
     curl -XPOST -H "X-Cron-Secret: $CRON_SECRET" \
       https://your-host/philly/api/users/cron/hard-purge

   Recommended cadence: 04:00 UTC daily (after /api/audit/prune at 03:30).
*/

import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { timingSafeEqualStr } from '@/lib/philly/crypto'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'
import { purgeStaleSoftDeletedUsers } from '@/lib/philly/user-purge'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  let orgFilter: string | undefined
  let triggeredBy: 'cron' | 'admin' = 'cron'
  let adminUserId: string | undefined

  if (cronSecret && headerSecret && timingSafeEqualStr(headerSecret, cronSecret)) {
    // Cron run — all orgs
  } else {
    const scope = await requireRole(['admin'])
    if (scope instanceof NextResponse) return scope
    // Admin trigger — scope to own org + rate-limit
    const rl = await enforceRateLimit(`hard-purge-admin:${scope.organizationId}`, PRESET_MUTATION)
    if (rl) return rl
    orgFilter = scope.organizationId
    triggeredBy = 'admin'
    adminUserId = scope.userId
  }

  let body: { days?: number } = {}
  try {
    body = await req.json()
  } catch {
    /* empty body is fine */
  }

  let result
  try {
    result = await purgeStaleSoftDeletedUsers({
      days: typeof body.days === 'number' ? body.days : undefined,
      organizationId: orgFilter,
    })
  } catch (err) {
    logger.error('hard-purge: route failed', {
      error: err instanceof Error ? err.message : String(err),
      triggeredBy,
    })
    return jsonError('hard-purge failed', 500)
  }

  // Self-audit for admin-triggered runs only (cron has no session).
  if (triggeredBy === 'admin' && adminUserId && orgFilter) {
    await logAudit({
      scope: { userId: adminUserId, organizationId: orgFilter, role: 'admin', email: null },
      action: 'delete',
      entity: 'user',
      changes: { hardPurged: { old: result.purged, new: 0 } },
    })
  }

  // Erasure spans two stores (CRM in MariaDB, marketing in Supabase). If
  // the second could not be reached, personal data survives — so this
  // must NOT read as a completed run. 500 makes the scheduler retry and
  // any alerting fire; the CRM half is idempotent (already-anonymized
  // rows are filtered out by the `deleted-` email prefix), so a retry is
  // safe. The body still reports exactly what did succeed.
  if (!result.marketingStorePurged) {
    return NextResponse.json(
      {
        error: 'erasure incomplete — marketing store not purged',
        data: { ...result, triggeredBy },
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data: { ...result, triggeredBy },
  })
}
