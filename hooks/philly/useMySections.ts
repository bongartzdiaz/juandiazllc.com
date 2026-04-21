'use client'

/* ---------------------------------------------------------------
   useMySections — fetch the current user's dashboard-section
   allow-list (plus role) from /philly/api/me so the Sidebar and
   other client widgets can hide nav items this user shouldn't see.

   Server-side guards in `requireSection()` are the actual gate —
   this hook is cosmetic only. Treat it as "don't render links
   you can't follow"; never as "this item is safe because it's
   hidden".
   --------------------------------------------------------------- */

import { useApi } from './useApi'

type MeResponse = {
  id: string
  email: string | null
  name: string | null
  role: string
  dashboardSections: string[] | null
}

export type MySections = {
  role: string
  dashboardSections: string[] | null
  loading: boolean
}

export function useMySections(): MySections {
  const { data, loading } = useApi<MeResponse>('/me', {
    // /me rarely changes; avoid hammering it on every poll cycle.
    interval: 5 * 60_000,
  })

  return {
    role: data?.role ?? 'viewer',
    // Treat "no data yet" as restrictive (empty array) so nav doesn't
    // briefly flash items the user isn't allowed to see. `hasSection`
    // will still return true for admins regardless.
    dashboardSections: data ? (data.dashboardSections ?? null) : [],
    loading,
  }
}
