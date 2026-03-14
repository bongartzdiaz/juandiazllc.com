'use client'

import { useEffect, useState } from 'react'
import type { GhlPipelineStep } from '@/lib/types'

const stepColors = ['var(--b-txt)', 'var(--b-txt)', 'var(--y-txt)', 'var(--o-txt)', 'var(--g-txt)']

const barColor = (pct: number) => pct >= 50 ? 'var(--g)' : pct >= 30 ? 'var(--y)' : 'var(--r)'
const barTxtColor = (pct: number) => pct >= 50 ? 'var(--g-txt)' : pct >= 30 ? 'var(--y-txt)' : 'var(--r-txt)'

interface Props {
  pipeline?: GhlPipelineStep[]
  loading?: boolean
}

export function FunnelCard({ pipeline, loading }: Props) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400)
    return () => clearTimeout(t)
  }, [])

  if (!pipeline || pipeline.length === 0) {
    return (
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '40px 16px', textAlign: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
          {loading ? 'Pipeline data laden...' : 'Geen pipeline data beschikbaar'}
        </div>
      </div>
    )
  }

  const steps = pipeline

  const rates = steps.slice(0, -1).map((step, i) => {
    const next = steps[i + 1]
    const pct = step.value > 0 ? Math.round((next.value / step.value) * 100) : 0
    return { pct, dropOff: step.value - next.value }
  })

  const overallConv = steps[0].value > 0
    ? ((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(1)
    : '0'

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      animation: 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.2s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--b)' }} />
          Lead tot Sale
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && <span className="mono" style={{ fontSize: 10, color: 'var(--txt3)' }}>laden...</span>}
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
            background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
          }}>Laatste 30 dagen</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 8px' }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const rate = i < rates.length ? rates[i] : null
          return (
            <div key={step.stage || i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isLast ? 'var(--g-bg)' : 'var(--bg2)',
                  border: `1px solid ${isLast ? 'var(--g-border)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: stepColors[i] ?? 'var(--txt2)',
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{step.label}</span>
                    <span className="mono" style={{
                      fontSize: 16, fontWeight: 600, color: stepColors[i] ?? 'var(--txt2)',
                      letterSpacing: '-0.02em',
                    }}>
                      {step.value.toLocaleString('nl-NL')}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 1 }}>{step.description}</div>
                </div>
              </div>
              {rate && (
                <div style={{ marginLeft: 44, padding: '4px 0 6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, background: barColor(rate.pct),
                        width: animated ? `${rate.pct}%` : '0%',
                        transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
                      }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, minWidth: 32, textAlign: 'right', color: barTxtColor(rate.pct) }}>
                      {rate.pct}%
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--txt3)', minWidth: 50, textAlign: 'right' }}>
                      -{rate.dropOff.toLocaleString('nl-NL')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        padding: '10px 16px 14px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--txt2)' }}>Totale conversie (lead → sale)</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--g-txt)' }}>{overallConv}%</span>
      </div>
    </div>
  )
}
