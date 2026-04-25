/* POST /api/cron/gdpr-retention — daily retention sweep.
   Runs the registry-driven purge (lib/gdpr/retention.ts) and
   finalises scheduled-deletion users (lib/gdpr/erasure.ts).

   Authentication: Bearer token equal to CRON_SECRET. Vercel Cron
   passes this header automatically when configured under
   `vercel.json`. Anything else gets a 401.

   Idempotent — repeated runs delete nothing the second time. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'
import { runRetentionPurge } from '@/lib/gdpr/retention'
import { runScheduledErasures } from '@/lib/gdpr/erasure'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
  }
}
