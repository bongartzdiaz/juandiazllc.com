/* POST /api/cron/gdpr-retention — daily retention sweep.
   Runs the registry-driven purge (lib/gdpr/retention.ts) and
   finalises scheduled-deletion users (lib/gdpr/erasure.ts).

   Authentication: Bearer token equal to CRON_SECRET. Vercel Cron
   passes this header automatically when configured under
   `vercel.json`. Anything else gets a 401.

   Idempotent — repeated runs delete nothing the second time.

   Bundle CM — Postgres advisory lock prevents concurrent cron
   runs (Vercel retry, region failover, manual workflow_dispatch)
   from double-counting erasures + double-firing audit-log
   entries. Lock-key pair (42, 1) is reserved for this cron;
   other crons should use (42, 2)+. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'
import { runRetentionPurge } from '@/lib/gdpr/retention'
import { runScheduledErasures } from '@/lib/gdpr/erasure'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ADVISORY_LOCK_CLASS = 42
const ADVISORY_LOCK_KEY_GDPR_RETENTION = 1

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const provided = req.headers.get('authorization')
  if (!provided) return false
  // Both Vercel Cron ("Bearer <secret>") and a raw secret are accepted
  // — operators sometimes hit this manually with curl during incident
  // response. The expected value is HMAC-strength so leakage via logs
  // is the only realistic threat, and we redact those.
  return provided === `Bearer ${expected}` || provided === expected
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const startedAt = Date.now()
  const prisma = getAuthPrisma()

  // Bundle CM — try to acquire the session-level advisory lock.
  // Returns true on success, false if another runner holds it.
  // Session locks auto-release on connection end, but we explicitly
  // unlock in finally to be friendly to Prisma's pool reuse.
  const lockRows = await prisma.$queryRaw<Array<{ acquired: boolean }>>`
    SELECT pg_try_advisory_lock(${ADVISORY_LOCK_CLASS}::int, ${ADVISORY_LOCK_KEY_GDPR_RETENTION}::int) AS acquired
  `
  const acquired = lockRows[0]?.acquired === true
  if (!acquired) {
    logger.info('[gdpr/retention] skipped — concurrent run holds advisory lock')
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'concurrent run in progress',
      durationMs: Date.now() - startedAt,
    })
  }

  try {
    const [purge, erasures] = await Promise.all([
      runRetentionPurge(prisma),
      runScheduledErasures(prisma),
    ])

    const summary = {
      ok: true,
      durationMs: Date.now() - startedAt,
      purge: { totalRows: purge.totalRows, rowCounts: purge.rowCounts },
      erasedUserIds: erasures.erasedUserIds.length,
    }
    logger.info('[gdpr/retention] sweep complete', summary)
    return NextResponse.json(summary)
  } catch (err) {
    logger.error('[gdpr/retention] sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Retention sweep failed' }, { status: 500 })
  } finally {
    // Release the advisory lock so the next legitimate run can
    // acquire it. Best-effort — a failure here just means the
    // lock waits for connection-close to release naturally.
    await prisma.$executeRaw`
      SELECT pg_advisory_unlock(${ADVISORY_LOCK_CLASS}::int, ${ADVISORY_LOCK_KEY_GDPR_RETENTION}::int)
    `.catch((err) => logger.warn('[gdpr/retention] advisory unlock failed', { err: String(err) }))
  }
}
