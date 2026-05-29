'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Insight, InsightsReport, InsightSeverity, InsightCategory } from '@/lib/philly/ai/insights'

const SEV_TOKENS: Record<InsightSeverity, { bg: string; txt: string; icon: React.ComponentType<{ size?: number }> }> = {
  critical: { bg: 'var(--r-bg)', txt: 'var(--r-txt)', icon: AlertTriangle },
  warning:  { bg: 'var(--y-bg)', txt: 'var(--y-txt)', icon: AlertTriangle },
  info:     { bg: 'var(--b-bg)', txt: 'var(--b-txt)', icon: Info },
  success:  { bg: 'var(--g-bg)', txt: 'var(--g-txt)', icon: CheckCircle2 },
}

const CAT_LABELS: Record<InsightCategory, string> = {
  pipeline: 'Pipeline', revenue: 'Revenue', productivity: 'Productivity',
  risk: 'Risk', opportunity: 'Opportunity', trend: 'Trend', 'data-quality': 'Data quality',
}

export default function AIInsightsPage() {
  const [report, setReport] = useState<InsightsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InsightSeverity | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai/insights')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setReport(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const insights = report?.insights ?? []
  const filtered = filter === 'all' ? insights : insights.filter(i => i.severity === filter)

  const counts = {
    critical: insights.filter(i => i.severity === 'critical').length,
    warning:  insights.filter(i => i.severity === 'warning').length,
    info:     insights.filter(i => i.severity === 'info').length,
    success:  insights.filter(i => i.severity === 'success').length,
  }

  return (
    <>
      <Topbar
        title="AI Insights"
        sub="Rule-based analysis of your organization's data — refreshed on demand"
      />

      <div style={{ padding: '20px 28px 40px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
          color: 'white', borderRadius: 14, padding: '20px 22px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {report?.summary ?? (loading ? 'Analyzing your data…' : 'Waiting for signal')}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              {report
                ? `Generated ${new Date(report.generatedAt).toLocaleString()} · ${insights.length} insight${insights.length === 1 ? '' : 's'}`
                : 'Pulling deal, contact, project, and property signals'}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.18)', color: 'white',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10,
              padding: '10px 16px', cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Counts */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20,
        }}>
          <SeverityChip count={counts.critical} label="Critical" sev="critical" selected={filter === 'critical'}
            onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')} />
          <SeverityChip count={counts.warning} label="Warnings" sev="warning" selected={filter === 'warning'}
            onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')} />
          <SeverityChip count={counts.info} label="Info" sev="info" selected={filter === 'info'}
            onClick={() => setFilter(filter === 'info' ? 'all' : 'info')} />
          <SeverityChip count={counts.success} label="Healthy" sev="success" selected={filter === 'success'}
            onClick={() => setFilter(filter === 'success' ? 'all' : 'success')} />
        </div>

        {/* Snapshot KPIs */}
        {report && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20,
          }}>
            <KpiCard label="Contacts" value={report.metrics.contacts} icon="users" />
            <KpiCard label="Active projects" value={report.metrics.projectsActive} icon="folder" />
            <KpiCard label="Open deals" value={report.metrics.dealsOpen} icon="trending-up" />
            <KpiCard label="Available listings" value={report.metrics.propertiesAvailable} icon="target" />
            <KpiCard label="Upcoming showings" value={report.metrics.showingsUpcoming} icon="calendar" />
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--r-bg)', color: 'var(--r-txt)',
            padding: '14px 16px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Insight list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(i => <InsightDetailRow key={i.id} insight={i} />)}
          {!loading && filtered.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 40, background: 'var(--panel)',
              border: '1px solid var(--border)', borderRadius: 12, color: 'var(--txt3)',
            }}>
              No insights in this category.
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </>
  )
}

function SeverityChip({
  count, label, sev, selected, onClick,
}: {
  count: number; label: string; sev: InsightSeverity; selected: boolean; onClick: () => void
}) {
  const tok = SEV_TOKENS[sev]
  const Icon = tok.icon
  return (
    <button
      onClick={onClick}
      style={{
        background: selected ? tok.bg : 'var(--panel)',
        border: `1px solid ${selected ? tok.txt : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: tok.bg, color: tok.txt,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>{label}</div>
      </div>
    </button>
  )
}

function InsightDetailRow({ insight }: { insight: Insight }) {
  const tok = SEV_TOKENS[insight.severity]
  const Icon = tok.icon
  // Localize metric/action labels by their stable i18n key, falling back to
  // the English label baked into the insight when the key is absent.
  const tx = useTranslations('aiInsights')
  const metricLabel = insight.metric
    ? (insight.metric.labelKey && tx.has(insight.metric.labelKey) ? tx(insight.metric.labelKey) : insight.metric.label)
    : ''
  const actionLabel = insight.action
    ? (insight.action.labelKey && tx.has(insight.action.labelKey) ? tx(insight.action.labelKey) : insight.action.label)
    : ''
  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${tok.txt}`,
      borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: tok.bg, color: tok.txt,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{insight.title}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {CAT_LABELS[insight.category]} · {insight.confidence}% confidence
            </div>
          </div>
          {insight.metric && (
            <div style={{
              fontSize: 14, fontWeight: 600, color: tok.txt,
              fontFamily: 'var(--font-mono, monospace)',
              padding: '4px 10px', background: tok.bg, borderRadius: 8,
            }}>
              {metricLabel}: {insight.metric.value}
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--txt2)', marginTop: 8, lineHeight: 1.55 }}>
          {insight.detail}
        </div>
        {insight.action && (
          <Link href={insight.action.href} style={{
            fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
          }}>
            {actionLabel} <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </div>
  )
}
