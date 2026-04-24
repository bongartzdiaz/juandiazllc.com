'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, Info, RefreshCw, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Insight, InsightsReport, InsightSeverity } from '@/lib/philly/ai/insights'

const SEV_ICON: Record<InsightSeverity, React.ComponentType<{ size?: number }>> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}

const SEV_TOKENS: Record<InsightSeverity, { bg: string; border: string; txt: string }> = {
  critical: { bg: 'var(--r-bg)', border: 'var(--r-border, var(--border))', txt: 'var(--r-txt)' },
  warning:  { bg: 'var(--y-bg)', border: 'var(--y-border, var(--border))', txt: 'var(--y-txt)' },
  info:     { bg: 'var(--b-bg)', border: 'var(--b-border, var(--border))', txt: 'var(--b-txt)' },
  success:  { bg: 'var(--g-bg)', border: 'var(--g-border, var(--border))', txt: 'var(--g-txt)' },
}

interface Props {
  limit?: number
  showSummary?: boolean
  showRefresh?: boolean
  compact?: boolean
}

export function InsightsCard({ limit = 4, showSummary = true, showRefresh = true, compact = false }: Props) {
  const [report, setReport] = useState<InsightsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/insights')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed')
      setReport(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const shown = report?.insights.slice(0, limit) ?? []
  const more = (report?.insights.length ?? 0) - shown.length

  return (
    <div style={{
      background: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: compact ? 14 : 18,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
          }}>
            <Sparkles size={15} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)' }}>AI Insights</div>
            {report && (
              <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono, monospace)' }}>
                {new Date(report.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showRefresh && (
            <button
              onClick={load}
              disabled={loading}
              title="Refresh insights"
              style={{
                background: 'transparent', border: '1px solid var(--border)', borderRadius: 8,
                padding: '6px 8px', cursor: loading ? 'wait' : 'pointer', color: 'var(--txt2)',
                display: 'flex', alignItems: 'center',
              }}
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}
          <Link href="/ai" style={{
            fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px',
          }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {showSummary && report && (
        <div style={{
          fontSize: 13, color: 'var(--txt2)', marginBottom: 12,
          padding: '8px 10px', background: 'var(--bg2)', borderRadius: 8,
          border: '1px solid var(--border)',
        }}>
          {report.summary}
        </div>
      )}

      {loading && !report && (
        <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '12px 0' }}>Analyzing…</div>
      )}

      {error && (
        <div style={{
          fontSize: 13, color: 'var(--r-txt)', padding: '8px 10px',
          background: 'var(--r-bg)', borderRadius: 8, border: '1px solid var(--border)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map(i => <InsightRow key={i.id} insight={i} compact={compact} />)}
      </div>

      {more > 0 && (
        <Link href="/ai" style={{
          display: 'block', marginTop: 10, fontSize: 12, color: 'var(--txt3)',
          textAlign: 'center', textDecoration: 'none',
        }}>
          +{more} more insight{more === 1 ? '' : 's'}
        </Link>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function InsightRow({ insight, compact }: { insight: Insight; compact: boolean }) {
  const Icon = SEV_ICON[insight.severity] ?? Info
  const tok = SEV_TOKENS[insight.severity]
  return (
    <div style={{
      display: 'flex', gap: 10, padding: compact ? '8px 10px' : '10px 12px',
      background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)',
      borderLeft: `3px solid ${tok.txt}`,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: tok.bg, color: tok.txt,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{insight.title}</div>
          {insight.metric && (
            <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
              {insight.metric.value}
            </div>
          )}
        </div>
        {!compact && (
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 3, lineHeight: 1.45 }}>
            {insight.detail}
          </div>
        )}
        {insight.action && (
          <Link href={insight.action.href} style={{
            fontSize: 11, color: 'var(--accent)', textDecoration: 'none', marginTop: 4,
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            {insight.action.label} <ArrowRight size={10} />
          </Link>
        )}
      </div>
    </div>
  )
}
