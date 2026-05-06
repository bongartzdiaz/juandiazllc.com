import { requireIndustry } from '@/lib/philly/industry-gate'

export const dynamic = 'force-dynamic'

/**
 * Server-side gate: Grants is a philanthropy-only module. RE and
 * hospitality customers get redirected to the dashboard if they
 * URL-paste this path.
 */
export default async function GrantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireIndustry(['philanthropy', 'general'])
  return <>{children}</>
}
