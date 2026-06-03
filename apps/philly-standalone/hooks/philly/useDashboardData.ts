'use client'

import { useEffect, useState, useCallback } from 'react'

/* Live dashboard data for the authenticated org. Combines:
 *   - /api/dashboard/summary?industry=…  (KPIs + 6mo revenue + activity + counts)
 *   - the industry's list endpoint (top 5 rows for the entity widget)
 * Tenant-scoping is enforced server-side; this hook is a thin client cache.
 *
 * The dashboard renders LIVE data when present and falls back to demo
 * constants + a <SampleBadge/> otherwise — see `liveOrSample` below. */

export type DashboardSummary = {
  industry: string
  industryCounts: Record<string, number>
  kpis: {
    contacts: number
    contactsDelta30d: number
    openDeals: number
    openDealValueCents: number
    wonDeals30d: number
    wonDealsValueCents30d: number
    transactionsCompleted: number
    transactionsSalePriceCents: number
  }
  monthlyRevenue: { month: string; revenueCents: number; wonDeals: number }[]
  recentActivity: {
    id: string
    action: string
    entity: string
    entityId: string | null
    actorId: string
    at: string
  }[]
  asOf: string
}

const LIST_ENDPOINT: Record<string, string> = {
  realestate: '/api/properties',
  hospitality: '/api/rooms',
  csr: '/api/projects',
}

export type DashboardData = {
  summary: DashboardSummary | null
  list: Record<string, unknown>[] | null
  loading: boolean
  error: string | null
  reload: () => void
}

export function useDashboardData(industry: string): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [list, setList] = useState<Record<string, unknown>[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const listUrl = `${LIST_ENDPOINT[industry] ?? LIST_ENDPOINT.csr}?limit=5`
      const [sRes, lRes] = await Promise.all([
        fetch(`/api/dashboard/summary?industry=${encodeURIComponent(industry)}`),
        fetch(listUrl),
      ])
      const sJson = await sRes.json().catch(() => ({}))
      if (!sRes.ok) throw new Error(sJson.error ?? `summary ${sRes.status}`)
      setSummary(sJson.data)
      // The list widget is best-effort: a failure there shouldn't blank the
      // whole dashboard — fall back to sample rows with a badge instead.
      if (lRes.ok) {
        const lJson = await lRes.json().catch(() => ({}))
        setList(Array.isArray(lJson.data) ? lJson.data : [])
      } else {
        setList([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [industry])

  useEffect(() => {
    load()
  }, [load])

  return { summary, list, loading, error, reload: load }
}

/**
 * Pure helper: pick live data when it is "present", else fall back to a demo
 * sample (and flag it so the UI can show a <SampleBadge/>).
 *
 *   const { data, isSample } = liveOrSample(live.list, DEMO_ROWS, a => a.length > 0)
 *
 * `isPresent` decides what "has real data" means per widget — a non-empty
 * array, a non-zero count, a defined object.
 */
export function liveOrSample<T>(
  live: T | null | undefined,
  sample: T,
  isPresent: (v: T) => boolean,
): { data: T; isSample: boolean } {
  if (live != null && isPresent(live)) return { data: live, isSample: false }
  return { data: sample, isSample: true }
}
