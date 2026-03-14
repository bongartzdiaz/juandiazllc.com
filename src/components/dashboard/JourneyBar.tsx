'use client'

import { useEffect, useState } from 'react'
import type { GhlPipelineStep } from '@/lib/types'
import { Users, MessageCircle, Phone, Briefcase, Trophy } from 'lucide-react'

const STEP_ICONS = [Users, MessageCircle, Phone, Briefcase, Trophy]
const STEP_COLORS = ['var(--b)', 'var(--b)', 'var(--y)', 'var(--o)', 'var(--g)']
const STEP_BG = ['var(--b-bg)', 'var(--b-bg)', 'var(--y-bg)', 'var(--o-bg)', 'var(--g-bg)']
const STEP_BORDER = ['var(--b-border)', 'var(--b-border)', 'var(--y-border)', 'var(--o-border)', 'var(--g-border)']

interface Props {
  pipeline: GhlPipelineStep[]
  loading: boolean
}

export function JourneyBar({ pipeline, loading }: Props) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  const steps = pipeline.length > 0 ? pipeline : [
    { stage: 'website_lead', label: 'Website lead', value: 0, description: '' },
    { stage: 'chatbot', label: 'Chatbot', value: 0, description: '' },
    { stage: 'telefoon', label: 'Telefoon', value: 0, description: '' },
    { stage: 'buitendienst', label: 'Buitendienst', value: 0, description: '' },
    { stage: 'sale', label: 'Sale', value: 0, description: '' },
  ] as GhlPipelineStep[]

  const maxVal = Math.max(...steps.map(s => s.value), 1)

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 20px', marginBottom: 16,
      boxShadow: 'var(--shadow-sm)',
      animation: 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.1s both',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6, background: 'var(--b-bg)',
            border: '1px solid var(--b-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={11} color="var(--b-txt)" />
          </span>
          Journey overzicht
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
          background: 'var(--bg2)', color: 'var(--txt3)', border: '1px solid var(--border)',
        }}>Realtime</span>
      </div>

      {/* Journey steps */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? Users
          const isLast = i === steps.length - 1
          const rate = i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100)
            : null
          const barWidth = maxVal > 0 ? (step.value / maxVal) * 100 : 0

          return (
            <div key={step.stage} style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
              {/* Step */}
              <div style={{
                flex: 1, textAlign: 'center', padding: '12px 6px',
                borderRadius: 10,
                background: isLast ? STEP_BG[i] : 'transparent',
                border: isLast ? `1px solid ${STEP_BORDER[i]}` : '1px solid transparent',
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px',
                  background: STEP_BG[i], border: `1px solid ${STEP_BORDER[i]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={STEP_COLORS[i]} />
                </div>

                {/* Value */}
                <div className="mono" style={{
                  fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
                  color: loading ? 'var(--txt3)' : STEP_COLORS[i],
                  opacity: animated ? 1 : 0,
                  transform: animated ? 'translateY(0)' : 'translateY(8px)',
                  transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
                }}>
                  {loading ? '—' : step.value.toLocaleString('nl-NL')}
                </div>

                {/* Label */}
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
                  marginTop: 3, letterSpacing: '-0.01em',
                }}>
                  {step.label}
                </div>

                {/* Mini bar */}
                <div style={{
                  height: 3, background: 'var(--bg2)', borderRadius: 2,
                  margin: '8px auto 0', width: '70%', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    background: STEP_COLORS[i],
                    width: animated ? `${barWidth}%` : '0%',
                    transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s`,
                  }} />
                </div>
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', width: 40, flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 16, color: 'var(--border2)', lineHeight: 1,
                  }}>→</div>
                  {rate !== null && (
                    <div className="mono" style={{
                      fontSize: 10, fontWeight: 600,
                      color: rate >= 50 ? 'var(--g-txt)' : rate >= 25 ? 'var(--y-txt)' : 'var(--r-txt)',
                      marginTop: 2,
                    }}>
                      {rate}%
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
