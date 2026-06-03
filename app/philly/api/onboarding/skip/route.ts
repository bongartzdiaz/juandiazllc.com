import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/onboarding/skip
 *
 * Stamps `onboardingSkippedAt = now`. The cursor stays where it is so
 * the resume-banner can put the user back in the right place. The
 * banner suppresses itself for 24h after skip — see
 * `lib/philly/onboarding.ts → isOnboardingActive`.
 */
export async function POST() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`onboarding-skip:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const prisma = getAuthPrisma()
  const now = new Date()

  await prisma.organization.update({
    where: { id: scope.organizationId },
    data: { onboardingSkippedAt: now },
  })

  logger.info('[onboarding] skipped', {
    orgId: scope.organizationId,
    by: scope.userId,
  })

  return NextResponse.json({ data: { skippedAt: now.toISOString() } })
}
