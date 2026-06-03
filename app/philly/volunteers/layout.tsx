import { requireIndustry } from '@/lib/philly/industry-gate'

export const dynamic = 'force-dynamic'

/**
 * Server-side gate: Volunteers is a philanthropy-only module.
 */
export default async function VolunteersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireIndustry(['philanthropy', 'general'])
  return <>{children}</>
}
