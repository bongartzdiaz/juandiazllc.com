'use client'

import { useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react'

interface DetailMetric {
  label: string
  value: string
  color?: string
  delta?: string
  deltaDir?: 'up' | 'down' | 'neu'
}

interface KpiDetail {
  title: string
  subtitle?: string
  metrics: DetailMetric[]
  breakdown?: { label: string; value: number; pct: number; color: string }[]
  suggestions?: string[]
  recentItems?: { label: string; sub: string; value: string }[]
}

interface Props {
  detail: KpiDetail | null
  onClose: () => void
}

export function KpiDetailDrawer({ detail, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!detail) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [detail, onClose])

  if (!detail) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 41,
        width: 380, background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em' }}>{detail.title}</div>
            {detail.subtitle && (
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{detail.subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--txt2)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Metrics grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20,
          }}>
            {detail.metrics.map((m, i) => {
              const DeltaIcon = m.deltaDir === 'up' ? TrendingUp : m.deltaDir === 'down' ? TrendingDown : Minus
              return (
                <div key={i} style={{
                  padding: '12px', borderRadius: 10,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 10.5, color: 'var(--txt3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                    {m.label}
                  </div>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: m.color || 'var(--txt)' }}>
                    {m.value}
                  </div>
                  {m.delta && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                      <DeltaIcon size={11} color={m.deltaDir === 'up' ? 'var(--g)' : m.deltaDir === 'down' ? 'var(--r)' : 'var(--txt3)'} />
                      <span className="mono" style={{
                        fontSize: 10.5, fontWeight: 600,
                        color: m.deltaDir === 'up' ? 'var(--g-txt)' : m.deltaDir === 'down' ? 'var(--r-txt)' : 'var(--txt3)',
                      }}>{m.delta}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Breakdown bars */}
          {detail.breakdown && detail.breakdown.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>Breakdown</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.breakdown.map(b => (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, width: 120, flexShrink: 0, color: 'var(--txt2)' }}>{b.label}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: b.color, width: `${b.pct}%`, borderRadius: 3, transition: 'width 0.8s ease' }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, width: 50, textAlign: 'right' }}>
                      {b.value} ({b.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {detail.suggestions && detail.suggestions.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <SectionLabel>Insights</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detail.suggestions.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '8px 10px',
                    borderRadius: 8, background: 'var(--accent-bg)',
                    border: '1px solid var(--accent-border)',
                  }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent-txt)', lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent items */}
          {detail.recentItems && detail.recentItems.length > 0 && (
            <div>
              <SectionLabel>Recent</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {detail.recentItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: 8, background: 'var(--bg2)',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{item.sub}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 8,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <BarChart3 size={11} />
      {children}
    </div>
  )
}
