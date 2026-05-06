import { NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'
import { isOnboardingActive, type OnboardingStep } from '@/lib/philly/onboarding'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/onboarding/state
 *
 * Returns the wizard cursor + the auto-complete gates so the client
 * can render the right step and the resume-banner can decide whether
 * to show itself.
 *
 * Any authenticated org member can read; the response is org-scoped.
 */
export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()

  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: {
      id: true,
      industry: true,
      onboardingStep: true,
      onboardingCompletedAt: true,
      onboardingSkippedAt: true,
    },
  })

  if (!org) return jsonError('Organization not found', 404)

  // Auto-complete gates — used by the wizard pages to display "you're all
  // set" hints and by analytics to know when an org reaches "active".
  const [teammateCount, contactCount] = await Promise.all([
    prisma.user.count({
      where: {
        organizationId: scope.organizationId,
        deletedAt: null,
        // Anyone other than the calling admin counts as a teammate.
        NOT: { id: scope.userId },
      },
    }),
    prisma.contact.count({
      where: { organizationId: scope.organizationId },
    }),
  ])

  const gates = {
    hasTeammate: teammateCount > 0,
    hasContact: contactCount > 0,
    hasVertical: org.industry === 'realestate' || org.industry === 'hospitality',
  }

  logger.debug('[onboarding/state] read', {
    orgId: scope.organizationId,
    step: org.onboardingStep,
  })

  return NextResponse.json({
    data: {
      step: org.onboardingStep as OnboardingStep,
      industry: org.industry,
      completedAt: org.onboardingCompletedAt?.toISOString() ?? null,
      skippedAt: org.onboardingSkippedAt?.toISOString() ?? null,
      bannerActive: isOnboardingActive({
        onboardingStep: org.onboardingStep,
        onboardingCompletedAt: org.onboardingCompletedAt,
        onboardingSkippedAt: org.onboardingSkippedAt,
      }),
      gates,
    },
  })
}
