'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import React from 'react'

export type Industry = 'philanthropy' | 'realestate' | 'hospitality'

interface IndustryConfig {
  id: Industry
  label: string
  shortLabel: string
  dashboardTitle: string
  dashboardSub: string
  projectsLabel: string
  contactTypes: string[]
  accentColor: string
}

export const INDUSTRY_CONFIGS: Record<Industry, IndustryConfig> = {
  philanthropy: {
    id: 'philanthropy',
    label: 'Philanthropy & CSR',
    shortLabel: 'CSR',
    dashboardTitle: 'Dashboard',
    dashboardSub: 'Your impact at a glance',
    projectsLabel: 'Projects',
    contactTypes: ['partner', 'beneficiary', 'stakeholder', 'donor'],
    accentColor: 'var(--accent)',
  },
  realestate: {
    id: 'realestate',
    label: 'Real Estate',
    shortLabel: 'RE',
    dashboardTitle: 'Dashboard',
    dashboardSub: 'Your portfolio at a glance',
    projectsLabel: 'Properties',
    contactTypes: ['buyer', 'seller', 'tenant', 'investor'],
    accentColor: 'var(--b)',
  },
  hospitality: {
    id: 'hospitality',
    label: 'Hospitality',
    shortLabel: 'HOS',
    dashboardTitle: 'Dashboard',
    dashboardSub: 'Your operations at a glance',
    projectsLabel: 'Properties',
    contactTypes: ['guest', 'vendor', 'partner', 'staff'],
    accentColor: 'var(--p)',
  },
}

interface IndustryContextValue {
  industry: Industry
  config: IndustryConfig
  setIndustry: (industry: Industry) => void
  /** The org's bound industry, if known. `null` when /api/me hasn't
      replied yet, or when the org's `industry` column is 'general'
      (multi-vertical). */
  orgIndustry: Industry | null
  /** Set by `<OrgIndustrySync>` once /api/me lands. Kept separate
      from setIndustry so demo-mode doesn't accidentally persist. */
  setOrgIndustry: (i: Industry | null) => void
  /** True iff the org has a specific vertical AND the caller is a
      non-admin. Drives whether the sidebar switcher is visible. */
  orgLocked: boolean
  /** Set by `<OrgIndustrySync>` so the provider can compute `orgLocked`. */
  setRoleForLock: (role: string | null) => void
}

const IndustryContext = createContext<IndustryContextValue>({
  industry: 'realestate',
  config: INDUSTRY_CONFIGS.realestate,
  setIndustry: () => {},
  orgIndustry: null,
  setOrgIndustry: () => {},
  orgLocked: false,
  setRoleForLock: () => {},
})

const ALL_INDUSTRIES: Industry[] = ['philanthropy', 'realestate', 'hospitality']

export function isIndustry(s: unknown): s is Industry {
  return typeof s === 'string' && (ALL_INDUSTRIES as string[]).includes(s)
}

export function IndustryProvider({ children }: { children: ReactNode }) {
  const [industry, setIndustryState] = useState<Industry>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pai-industry') as Industry) || 'realestate'
    }
    return 'realestate'
  })
  const [orgIndustry, setOrgIndustryState] = useState<Industry | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const setIndustry = useCallback((ind: Industry) => {
    setIndustryState(ind)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pai-industry', ind)
    }
  }, [])

  // When the org has a bound industry AND the user isn't admin, the
  // industry view is force-pinned to it — operators in an RE org
  // can't accidentally land in CSR mode.
  const setOrgIndustry = useCallback((ind: Industry | null) => {
    setOrgIndustryState(ind)
    if (ind && role && role !== 'admin') {
      setIndustryState(ind)
      if (typeof window !== 'undefined') {
        localStorage.setItem('pai-industry', ind)
      }
    }
  }, [role])

  const setRoleForLock = useCallback((r: string | null) => {
    setRole(r)
    // Re-pin if role changes and we already know orgIndustry.
    if (orgIndustry && r && r !== 'admin') {
      setIndustryState(orgIndustry)
    }
  }, [orgIndustry])

  const orgLocked = orgIndustry != null && role != null && role !== 'admin'

  return React.createElement(
    IndustryContext.Provider,
    {
      value: {
        industry, config: INDUSTRY_CONFIGS[industry], setIndustry,
        orgIndustry, setOrgIndustry,
        orgLocked, setRoleForLock,
      },
    },
    children,
  )
}

export function useIndustry() {
  return useContext(IndustryContext)
}
