import { requireIndustry } from '@/lib/philly/industry-gate'

export const dynamic = 'force-dynamic'

/**
 * Server-side gate: every page under /philly/philanthropy/* is
 * philanthropy-only (donor scoring, donor portal, etc.).
 */
export default async function PhilanthropyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireIndustry(['philanthropy', 'general'])
  return <>{children}</>
}
