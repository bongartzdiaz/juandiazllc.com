import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/onboarding/complete
 *
 * Sets `onboardingStep = 'done'`, stamps `onboardingCompletedAt`,
 * writes an audit row. Final step of the wizard.
 */
export async function POST() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`onboarding-complete:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const prisma = getAuthPrisma()
  const now = new Date()

  const before = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { onboardingStep: true },
  })

  await prisma.organization.update({
    where: { id: scope.organizationId },
    data: { onboardingStep: 'done', onboardingCompletedAt: now },
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'organization',
    entityId: scope.organizationId,
    changes: {
      onboardingStep: { old: before?.onboardingStep ?? 'unknown', new: 'done' },
      onboardingCompletedAt: { old: null, new: now.toISOString() },
    },
  }).catch(() => { /* audit best-effort */ })

  logger.info('[onboarding] completed', {
    orgId: scope.organizationId,
    by: scope.userId,
  })

  return NextResponse.json({ data: { completedAt: now.toISOString() } })
}
