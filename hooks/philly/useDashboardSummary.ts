'use client'

// Fetches real org-wide metrics from /philly/api/dashboard/summary.
// Used by the live-metrics band at the top of the dashboard so
// operators see verifiable numbers on first paint, not the
// industry-specific demo widgets below.
//
// Uses TanStack Query via the existing useApi wrapper so refetch/
// invalidation plays nicely with the rest of the Philly data layer.

import { useApi } from '@/hooks/philly/useApi'

export type DashboardSummary = {
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
  monthlyRevenue: Array<{ month: string; revenueCents: number; wonDeals: number }>
  recentActivity: Array<{
    id: string
    action: string
    entity: string
    entityId: string | null
    actorId: string
    at: string
  }>
  asOf: string
}

export function useDashboardSummary() {
  return useApi<{ data: DashboardSummary }>('/dashboard/summary', {
    // Dashboard data changes slowly — poll at 60s for freshness
    // without hammering the aggregation endpoint.
    interval: 60_000,
  })
}

/** Format cents → compact currency string ("€12.4K"). */
export function formatCents(cents: number, currency = '€'): string {
  const euros = cents / 100
  if (Math.abs(euros) >= 1_000_000) return `${currency}${(euros / 1_000_000).toFixed(1)}M`
  if (Math.abs(euros) >= 1_000) return `${currency}${(euros / 1_000).toFixed(1)}K`
  return `${currency}${Math.round(euros)}`
}
