'use client'
import { useState, useEffect, useCallback } from 'react'

export interface KpiValue {
  value: number | string
  label: string
  editable?: boolean
}

const STORAGE_KEY = 'pai-kpi-data'
const GOALS_KEY = 'pai-goals'

// Load KPI overrides from localStorage
function loadOverrides(): Record<string, Record<string, string | number>> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch { return {} }
}

// Save KPI overrides
function saveOverrides(data: Record<string, Record<string, string | number>>) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

// Load goals from localStorage
function loadGoals(): Record<string, Record<string, { current: number; target: number }>> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(GOALS_KEY) || '{}')
  } catch { return {} }
}

export function useKpiStore(industry: string) {
  const [overrides, setOverrides] = useState<Record<string, Record<string, string | number>>>({})
  const [goals, setGoals] = useState<Record<string, Record<string, { current: number; target: number }>>>({})

  useEffect(() => {
    setOverrides(loadOverrides())
    setGoals(loadGoals())
  }, [])

  const getKpiValue = useCallback((key: string, defaultValue: string | number): string | number => {
    return overrides[industry]?.[key] ?? defaultValue
  }, [overrides, industry])

  const setKpiValue = useCallback((key: string, value: string | number) => {
    setOverrides(prev => {
      const next = { ...prev, [industry]: { ...prev[industry], [key]: value } }
      saveOverrides(next)
      return next
    })
  }, [industry])

  const getGoal = useCallback((key: string): { current: number; target: number } | null => {
    return goals[industry]?.[key] ?? null
  }, [goals, industry])

  return { getKpiValue, setKpiValue, getGoal, overrides, goals }
}
