'use client'

import { useMemo } from 'react'
import { Filter } from 'lucide-react'

interface FunnelStep {
  label: string
  count: number
}

function getFunnelSteps(industry: string): FunnelStep[] {
  if (industry === 'realestate') {
    return [
      { label: 'Lead', count: 1000 },
      { label: 'Viewing', count: 420 },
      { label: 'Offer', count: 180 },
      { label: 'Agreement', count: 85 },
      { label: 'Closed', count: 62 },
    ]
  }
  if (industry === 'hospitality') {
    return [
      { label: 'Search', count: 2000 },
      { label: 'Booking', count: 680 },
      { label: 'Check-in', count: 520 },
      { label: 'Stay', count: 510 },
      { label: 'Review', count: 340 },
    ]
  }
  // philanthropy / CSR
  return [
    { label: 'Awareness', count: 500 },
    { label: 'Interest', count: 280 },
    { label: 'Proposal', count: 120 },
    { label: 'Active', count: 45 },
    { label: 'Completed', count: 38 },
  ]
}

function conversionColor(pct: number): string {
  if (pct >= 50) return 'var(--g)'
  if (pct >= 30) return 'var(--o)'
  return 'var(--r)'
}

function conversionBg(pct: number): string {
  if (pct >= 50) return 'var(--g-bg)'
  if (pct >= 30) return 'var(--o-bg)'
  return 'var(--r-bg)'
}

function conversionTxt(pct: number): string {
  if (pct >= 50) return 'var(--g-txt)'
  if (pct >= 30) return 'var(--o-txt)'
  return 'var(--r-txt)'
}

export function FunnelCard({ industry }: { industry: string }) {
  const steps = useMemo(() => getFunnelSteps(industry), [industry])
  const maxCount = steps[0]?.count || 1
  const overallPct = steps.length >= 2
    ? ((steps[steps.length - 1].count / steps[0].count) * 100).toFixed(1)
    : '0'

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={15} color="var(--txt2)" />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>Conversion Funnel</span>
        </div>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-bg)', padding: '2px 8px', borderRadius: 6 }}>
          {overallPct}% overall
        </span>
      </div>

      {/* Funnel steps */}
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((step, i) => {
          const widthPct = (step.count / maxCount) * 100
          const convPct = i === 0 ? 100 : (step.count / steps[i - 1].count) * 100
          const dropOff = i === 0 ? 0 : steps[i - 1].count - step.count
          const barColor = i === 0 ? 'var(--accent)' : conversionColor(convPct)
          const badgeBg = i === 0 ? 'var(--accent-bg)' : conversionBg(convPct)
          const badgeTxt = i === 0 ? 'var(--accent-txt)' : conversionTxt(convPct)

          return (
            <div key={step.label}>
              {/* Step row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt2)', width: 90, flexShrink: 0 }}>
                  {step.label}
                </span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    height: 24, borderRadius: 6, background: barColor,
                    width: `${widthPct}%`, minWidth: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    paddingRight: 8,
                    transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                    opacity: 0.85,
                  }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {step.count.toLocaleString('nl-NL')}
                    </span>
                  </div>
                </div>
                {i > 0 && (
                  <span className="mono" style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 6px',
                    borderRadius: 4, background: badgeBg, color: badgeTxt,
                    flexShrink: 0,
                  }}>
                    {convPct.toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Drop-off indicator */}
              {i > 0 && dropOff > 0 && (
                <div style={{
                  marginLeft: 100, fontSize: 10, color: 'var(--txt3)',
                  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2,
                }}>
                  <span style={{ color: 'var(--r)' }}>-{dropOff.toLocaleString('nl-NL')}</span>
                  <span>drop-off</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall conversion */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 500 }}>Overall Conversion</span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
          {steps[0].count.toLocaleString('nl-NL')} &rarr; {steps[steps.length - 1].count.toLocaleString('nl-NL')} ({overallPct}%)
        </span>
      </div>
    </div>
  )
}
