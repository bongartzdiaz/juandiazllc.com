'use client'

// Live org-wide KPI band pinned to the top of the dashboard.
// Shows real numbers from /philly/api/dashboard/summary so the
// first screen operators see is actual data — not the demo arrays
// the industry-specific widgets below still use.
//
// Intentionally minimal: 4 KPIs + "updated X ago". No editable
// defaults, no localStorage fallbacks — if the API is down we
// render a discreet error state rather than fake numbers.

import { useDashboardSummary, formatCents } from '@/hooks/philly/useDashboardSummary'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

export function LiveMetricsBand() {
  const { data, error, loading } = useDashboardSummary()

  if (loading && !data) {
    return (
      <div className="live-metrics-band" aria-busy="true">
        <div className="lmb-label">◉ LIVE — FETCHING ORG METRICS…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="live-metrics-band lmb-error">
        <div className="lmb-label">◉ LIVE METRICS UNAVAILABLE</div>
        <div className="lmb-error-hint">
          Showing demo widgets below. Check your connection or API logs.
        </div>
      </div>
    )
  }

  const k = data.data.kpis

  const items = [
    {
      label: 'Contacts',
      value: k.contacts.toLocaleString(),
      delta: k.contactsDelta30d > 0 ? `+${k.contactsDelta30d} last 30d` : 'no new last 30d',
      deltaDir: k.contactsDelta30d > 0 ? 'up' : 'neu',
    },
    {
      label: 'Open deals',
      value: k.openDeals.toLocaleString(),
      delta: formatCents(k.openDealValueCents) + ' pipeline',
      deltaDir: 'neu',
    },
    {
      label: 'Won (30d)',
      value: k.wonDeals30d.toLocaleString(),
      delta: formatCents(k.wonDealsValueCents30d) + ' revenue',
      deltaDir: k.wonDeals30d > 0 ? 'up' : 'neu',
    },
    {
      label: 'Closed tx',
      value: k.transactionsCompleted.toLocaleString(),
      delta: formatCents(k.transactionsSalePriceCents) + ' GMV',
      deltaDir: 'neu',
    },
  ]

  return (
    <div className="live-metrics-band" aria-label="Live org metrics">
      <div className="lmb-header">
        <span className="lmb-label">◉ LIVE — YOUR ORG</span>
        <span className="lmb-updated">Updated {relativeTime(data.data.asOf)}</span>
      </div>
      <div className="lmb-grid">
        {items.map((it) => (
          <div key={it.label} className="lmb-cell">
            <div className="lmb-v">{it.value}</div>
            <div className="lmb-k">{it.label}</div>
            <div className={`lmb-d lmb-d-${it.deltaDir}`}>{it.delta}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
