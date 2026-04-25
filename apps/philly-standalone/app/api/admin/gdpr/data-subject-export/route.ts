/* POST /api/admin/gdpr/data-subject-export — admin-led DSAR.
   Body: { email: string, reason?: string }
   Returns: ContactSubjectExport (JSON download) of every row, across
   every PII-bearing model, that references the given email within the
   admin's organization. Audit-logged + recorded in GdprExportLog. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { collectContactSubjectData, rowCounts } from '@/lib/gdpr/export'
import { hashEmail } from '@/lib/gdpr/hash'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Admin-led DSAR is rare; ten per actor per hour is a generous ceiling
// that still trips on a runaway script.
const ADMIN_EXPORT_LIMIT = { capacity: 10, refillPerSec: 10 / 3600 } as const

const requestSchema = z.object({
  email: z.string().email().max(254),
  // Free-text identifier for the request (ticket #, requester name).
  // Stored in audit but not persisted to GdprExportLog beyond rowCounts.
  reason: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`gdpr:admin-export:${scope.userId}`, ADMIN_EXPORT_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, requestSchema)
  if (!parsed.success) return parsed.response

  const { email, reason } = parsed.data
  const emailHash = hashEmail(email)
  const prisma = getAuthPrisma()

  const payload = await collectContactSubjectData(prisma, scope.organizationId, email, emailHash)
  const counts = rowCounts(payload)

  try {
    await prisma.gdprExportLog.create({
      data: {
        organizationId: scope.organizationId,
        actorUserId: scope.userId,
        subjectEmailHash: emailHash,
        channel: 'admin',
        rowCounts: JSON.stringify(counts),
        actorIp: clientIp(req),
      },
    })
  } catch (err) {
    logger.error('[gdpr/admin-export] failed to write GdprExportLog', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  await logAudit({
    scope,
    action: 'create',
    entity: 'auditLog',
    entityId: emailHash,
    changes: {
      gdpr_dsar_export: {
        old: null,
        new: { rowCounts: counts, reason: reason ?? null },
      },
    },
  })

  const filename = `dsar-${emailHash.slice(0, 12)}-${new Date().toISOString().slice(0, 10)}.json`
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
