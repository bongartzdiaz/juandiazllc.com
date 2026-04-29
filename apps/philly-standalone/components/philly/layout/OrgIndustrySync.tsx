'use client'

import { useEffect } from 'react'
import { useIndustry, isIndustry } from '@/hooks/philly/useIndustry'
import { useMySections } from '@/hooks/philly/useMySections'

/* Bundle AT — sync the org's bound industry into the IndustryProvider.

   `Organization.industry` (set by the operator who provisioned the
   org) is the source of truth for which vertical the dashboard
   shows. Non-admins are pinned to it; admins keep the switcher so
   they can preview other verticals.

   Mounted inside ProtectedShell (so /api/me is allowed to fire)
   and BELOW IndustryProvider so it can call setOrgIndustry +
   setRoleForLock. The component renders nothing.

   Demo orgs (industry === 'general') stay free — the switcher
   remains visible and operators choose a vertical themselves. */
export function OrgIndustrySync() {
  const { setOrgIndustry, setRoleForLock } = useIndustry()
  const { orgIndustry, role, loading } = useMySections()

  useEffect(() => {
    if (loading) return
    setRoleForLock(role)
    if (orgIndustry && isIndustry(orgIndustry)) {
      setOrgIndustry(orgIndustry)
    } else {
      // 'general' or unknown → no lock; keep user's preference.
      setOrgIndustry(null)
    }
  }, [loading, role, orgIndustry, setOrgIndustry, setRoleForLock])

  return null
}
