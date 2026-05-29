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
import { useTranslations } from 'next-intl'

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

export function LiveMetricsBand() {
  const { data, error, loading } = useDashboardSummary()
  const t = useTranslations('liveBand')

  if (loading && !data) {
    return (
      <div className="live-metrics-band" aria-busy="true">
        <div className="lmb-label">◉ {t('fetching')}</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="live-metrics-band lmb-error">
        <div className="lmb-label">◉ {t('unavailable')}</div>
        <div className="lmb-error-hint">{t('unavailableHint')}</div>
      </div>
    )
  }

  const k = data.data.kpis

  const items = [
    {
      label: t('contacts'),
      value: k.contacts.toLocaleString(),
      delta: k.contactsDelta30d > 0
        ? t('deltaLast30d', { n: k.contactsDelta30d })
        : t('noNewLast30d'),
      deltaDir: k.contactsDelta30d > 0 ? 'up' : 'neu',
    },
    {
      label: t('openDeals'),
      value: k.openDeals.toLocaleString(),
      delta: t('pipelineValue', { value: formatCents(k.openDealValueCents) }),
      deltaDir: 'neu',
    },
    {
      label: t('won30d'),
      value: k.wonDeals30d.toLocaleString(),
      delta: t('revenueValue', { value: formatCents(k.wonDealsValueCents30d) }),
      deltaDir: k.wonDeals30d > 0 ? 'up' : 'neu',
    },
    {
      label: t('closedTx'),
      value: k.transactionsCompleted.toLocaleString(),
      delta: t('gmvValue', { value: formatCents(k.transactionsSalePriceCents) }),
      deltaDir: 'neu',
    },
  ]

  return (
    <div className="live-metrics-band" aria-label={t('ariaLabel')}>
      <div className="lmb-header">
        <span className="lmb-label">◉ {t('liveYourOrg')}</span>
        <span className="lmb-updated">{t('updatedAgo', { ago: relativeTime(data.data.asOf) })}</span>
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
