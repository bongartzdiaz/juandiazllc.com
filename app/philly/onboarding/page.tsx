import { redirect } from 'next/navigation'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { stepHref, type OnboardingStep } from '@/lib/philly/onboarding'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * /philly/onboarding (no segment) — bounces the admin to whatever step
 * they're currently on. Used by the resume-banner so the link is stable
 * regardless of where the org is in the wizard.
 */
export default async function OnboardingIndex() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) redirect('/login?next=/philly/onboarding')

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { onboardingStep: true },
  })

  const step = (org?.onboardingStep ?? 'welcome') as OnboardingStep
  redirect(stepHref(step))
}
