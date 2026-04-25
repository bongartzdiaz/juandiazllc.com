/* GDPR Art. 17 — self-service account deletion with 30-day grace.
   GET    /api/me/account-deletion → { scheduledFor: ISO | null }
   POST   /api/me/account-deletion { confirm: "DELETE" } → schedule
   DELETE /api/me/account-deletion → cancel */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { scheduleAccountDeletion, cancelAccountDeletion } from '@/lib/gdpr/erasure'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 5 / hour — high enough that an honest user can flip the toggle
// while reading the privacy notice; low enough that a runaway
// script isn't producing a flapping audit trail.
const TOGGLE_LIMIT = { capacity: 5, refillPerSec: 5 / 3600 } as const

const scheduleSchema = z.object({
  confirm: z.literal('DELETE'),
  reason: z.string().max(500).optional(),
})

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { deletionScheduledAt: true, deletionRequestedAt: true },
  })
  return NextResponse.json({
    scheduledFor: user?.deletionScheduledAt ?? null,
    requestedAt: user?.deletionRequestedAt ?? null,
  })
}

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`gdpr:schedule-deletion:${scope.userId}`, TOGGLE_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, scheduleSchema)
  if (!parsed.success) return parsed.response

  // Defense-in-depth: don't allow the last admin in an org to delete
  // themselves — that would orphan all the contacts they own. They
  // must transfer admin first.
  const prisma = getAuthPrisma()
  if (scope.role === 'admin') {
    const otherAdmins = await prisma.user.count({
      where: {
        organizationId: scope.organizationId,
        role: 'admin',
        id: { not: scope.userId },
        deletionScheduledAt: null,
      },
    })
    if (otherAdmins === 0) {
      return jsonError(
        'You are the last admin in this organization. Promote another user to admin before deleting your account.',
        409,
      )
    }
  }

  const { scheduledFor } = await scheduleAccountDeletion(prisma, scope.userId)

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: {
      deletionScheduledAt: { old: null, new: scheduledFor.toISOString() },
      reason: { old: null, new: parsed.data.reason ?? null },
    },
  })

  return NextResponse.json({ scheduledFor }, { status: 202 })
}

export async function DELETE() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`gdpr:cancel-deletion:${scope.userId}`, TOGGLE_LIMIT)
  if (limited) return limited

  const prisma = getAuthPrisma()
  await cancelAccountDeletion(prisma, scope.userId)

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { deletionScheduledAt: { old: 'scheduled', new: null } },
  })

  return NextResponse.json({ scheduledFor: null })
}
