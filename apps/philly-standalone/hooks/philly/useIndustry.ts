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
}

const IndustryContext = createContext<IndustryContextValue>({
  industry: 'realestate',
  config: INDUSTRY_CONFIGS.realestate,
  setIndustry: () => {},
})

export function IndustryProvider({ children }: { children: ReactNode }) {
  const [industry, setIndustryState] = useState<Industry>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('pai-industry') as Industry) || 'realestate'
    }
    return 'realestate'
  })

  const setIndustry = useCallback((ind: Industry) => {
    setIndustryState(ind)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pai-industry', ind)
    }
  }, [])

  return React.createElement(
    IndustryContext.Provider,
    { value: { industry, config: INDUSTRY_CONFIGS[industry], setIndustry } },
    children
  )
}

export function useIndustry() {
  return useContext(IndustryContext)
}
