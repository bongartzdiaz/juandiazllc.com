import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { advanceOnboardingStepSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { canAdvanceTo, type OnboardingStep } from '@/lib/philly/onboarding'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/onboarding/step
 *   Body: { step }
 *
 * Moves the wizard cursor. Admin-only — manager + viewer get 403.
 * Server validates the transition (no jumping past steps; backwards
 * only allowed from `done` for the resume-edit flow).
 */
export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`onboarding-step:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, advanceOnboardingStepSchema)
  if (!parsed.success) return parsed.response

  const prisma = getAuthPrisma()

  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { onboardingStep: true },
  })
  if (!org) return jsonError('Organization not found', 404)

  const current = org.onboardingStep as OnboardingStep
  if (!canAdvanceTo(current, parsed.data.step)) {
    return jsonError(`Cannot move from ${current} to ${parsed.data.step}`, 409)
  }

  await prisma.organization.update({
    where: { id: scope.organizationId },
    data: { onboardingStep: parsed.data.step },
  })

  logger.info('[onboarding] step advanced', {
    orgId: scope.organizationId,
    from: current,
    to: parsed.data.step,
    by: scope.userId,
  })

  return NextResponse.json({
    data: { step: parsed.data.step },
  })
}
