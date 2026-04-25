/* POST /api/admin/gdpr/data-subject-erasure
   Body: { email: string, reason: string, confirm: "ERASE" }
   Hard-deletes every PII row referencing `email` within the admin's
   organization. Records GdprErasureLog with sha-256 of email so the
   erasure is provable to a regulator without retaining the email. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { eraseContactSubject } from '@/lib/gdpr/erasure'
import { hashEmail } from '@/lib/gdpr/hash'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ERASE_LIMIT = { capacity: 10, refillPerSec: 10 / 3600 } as const

const requestSchema = z.object({
  email: z.string().email().max(254),
  // Reason is mandatory for erasure (matches GDPR Art. 30 record-keeping
  // — the controller must document why an erasure was processed).
  reason: z.string().min(3).max(500),
  confirm: z.literal('ERASE'),
})

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`gdpr:admin-erasure:${scope.userId}`, ERASE_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, requestSchema)
  if (!parsed.success) return parsed.response

  const { email, reason } = parsed.data
  const emailHash = hashEmail(email)
  const prisma = getAuthPrisma()

  const result = await eraseContactSubject(prisma, scope.organizationId, email)

  // GdprErasureLog is the proof-of-erasure record. We MUST persist
  // it; if the write fails the regulator-facing audit trail breaks,
  // so a 500 is the right outcome.
  try {
    await prisma.gdprErasureLog.create({
      data: {
        organizationId: scope.organizationId,
        actorUserId: scope.userId,
        subjectEmailHash: emailHash,
        channel: 'admin',
        modelsErased: Object.keys(result.rowCounts).join(','),
        rowCounts: JSON.stringify(result.rowCounts),
        reason,
        actorIp: clientIp(req),
      },
    })
  } catch (err) {
    logger.error('[gdpr/admin-erasure] proof-of-erasure write failed', {
      err: err instanceof Error ? err.message : String(err),
      emailHash,
    })
    // Surface the failure: without the log entry we cannot prove
    // the erasure to a regulator, which would itself be a breach.
    return NextResponse.json(
      { error: 'Erasure executed but proof-of-erasure log failed; contact ops.' },
      { status: 500 },
    )
  }

  await logAudit({
    scope,
    action: 'delete',
    entity: 'contact',
    entityId: emailHash,
    changes: { gdpr_erasure: { old: result.rowCounts, new: null } },
  })

  return NextResponse.json({
    erased: true,
    rowCounts: result.rowCounts,
    totalRows: result.totalRows,
  })
}
