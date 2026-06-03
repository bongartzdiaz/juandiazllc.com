import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { GateNonAdmin } from '@/components/philly/onboarding/GateNonAdmin'

export const dynamic = 'force-dynamic'

/**
 * Server-side gate: every page under /philly/onboarding/* is admin-only.
 * Manager + viewer get a friendly empty state, not a 403.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) {
    redirect('/login?next=/philly/onboarding')
  }

  if (scope.role !== 'admin') {
    return <GateNonAdmin />
  }

  return <>{children}</>
}
