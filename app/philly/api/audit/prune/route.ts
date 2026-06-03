/* POST /api/audit/prune — delete AuditLog rows older than retention window.

   Two acceptable callers:
     1. Admin user (session-based) — used by a manual "Prune now" button.
     2. Scheduled cron — must send header `X-Cron-Secret: $CRON_SECRET`.

   Default retention: 365 days. Override with body { days: N } or env
   AUDIT_RETENTION_DAYS. Minimum 30 days (sanity floor) so a typo can't
   wipe the log. Returns { deleted, cutoff }.

   Run daily via:
     curl -XPOST -H "X-Cron-Secret: $CRON_SECRET" \
       https://your-host/api/audit/prune
*/

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { timingSafeEqualStr } from '@/lib/philly/crypto'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_RETENTION_DAYS = 365
const MIN_RETENTION_DAYS = 30

function envRetentionDays(): number {
  const raw = process.env.AUDIT_RETENTION_DAYS
  if (!raw) return DEFAULT_RETENTION_DAYS
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < MIN_RETENTION_DAYS) return DEFAULT_RETENTION_DAYS
  return n
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = req.headers.get('x-cron-secret')

  // Either: cron token matches, OR the caller is an admin with a session.
  let orgFilter: string | undefined
  let triggeredBy: 'cron' | 'admin' = 'cron'
  let adminUserId: string | undefined

  if (cronSecret && headerSecret && timingSafeEqualStr(headerSecret, cronSecret)) {
    // Cron run — prunes across ALL organizations
  } else {
    const scope = await requireRole(['admin'])
    if (scope instanceof NextResponse) return scope
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

  const requested = typeof body.days === 'number' ? body.days : envRetentionDays()
  const days = Math.max(MIN_RETENTION_DAYS, Math.floor(requested))
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const prisma = getAuthPrisma()
  const where = {
    createdAt: { lt: cutoff },
    ...(orgFilter ? { organizationId: orgFilter } : {}),
  }

  const { count } = await prisma.auditLog.deleteMany({ where })

  logger.info('audit: pruned', { deleted: count, cutoff: cutoff.toISOString(), triggeredBy, days })

  // Self-audit the prune (only for admin-triggered runs — cron has no session)
  if (triggeredBy === 'admin' && adminUserId && orgFilter) {
    await logAudit({
      scope: { userId: adminUserId, organizationId: orgFilter, role: 'admin', email: null },
      action: 'delete',
      entity: 'auditLog',
      changes: { pruned: { old: count, new: 0 } },
    })
  }

  return NextResponse.json({
    data: { deleted: count, cutoff: cutoff.toISOString(), days, triggeredBy },
  })
}
