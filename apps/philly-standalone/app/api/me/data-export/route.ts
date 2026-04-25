/* GET /api/me/data-export — GDPR Art. 15 self-service export.
   Returns the operator's own account data as a downloadable JSON
   bundle. Audit-logged + recorded in GdprExportLog (with hashed
   email so erasure can later prove this row belonged to them). */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { collectOperatorData, rowCounts } from '@/lib/gdpr/export'
import { hashEmail } from '@/lib/gdpr/hash'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Per-user / month: a healthy ceiling on automated abuse without
// blocking a legit user who needs a fresh copy.
const SELF_EXPORT_LIMIT = { capacity: 5, refillPerSec: 5 / (30 * 24 * 3600) } as const

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`gdpr:self-export:${scope.userId}`, SELF_EXPORT_LIMIT)
  if (limited) return limited

  const prisma = getAuthPrisma()
  const payload = await collectOperatorData(prisma, scope.userId)
  const counts = rowCounts(payload)

  // Append-only audit row. Best-effort — never block the export
  // response on logging failure (the user has a legal right to the
  // data; we'd rather risk a missing audit row than deny access).
  try {
    await prisma.gdprExportLog.create({
      data: {
        organizationId: scope.organizationId,
        actorUserId: scope.userId,
        subjectEmailHash: scope.email ? hashEmail(scope.email) : '',
        channel: 'self',
        rowCounts: JSON.stringify(counts),
        actorIp: clientIp(req),
      },
    })
  } catch (err) {
    logger.error('[gdpr/self-export] failed to write GdprExportLog', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  await logAudit({
    scope,
    action: 'create',
    entity: 'auditLog',
    entityId: scope.userId,
    changes: { gdpr_export: { old: null, new: counts } },
  })

  // Force a download with a date-stamped filename. Content-Disposition:
  // attachment makes the browser save rather than render, even though
  // the body is JSON.
  const filename = `account-data-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
