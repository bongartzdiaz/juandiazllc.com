'use client'

import { useEffect, useState } from 'react'
import type { GhlPipelineStep } from '@/lib/types'
import { Users, MessageCircle, Phone, Briefcase, Trophy } from 'lucide-react'

const STEP_ICONS = [Users, MessageCircle, Phone, Briefcase, Trophy]
const STEP_COLORS = ['var(--b)', 'var(--b)', 'var(--y)', 'var(--o)', 'var(--g)']
const STEP_BG = ['var(--b-bg)', 'var(--b-bg)', 'var(--y-bg)', 'var(--o-bg)', 'var(--g-bg)']
const STEP_BORDER = ['var(--b-border)', 'var(--b-border)', 'var(--y-border)', 'var(--o-border)', 'var(--g-border)']

interface ExtraTotals {
  metaSpend?: number
  metaLeads?: number
  metaCpl?: number
  chatbotGesprekken?: number
  chatbotGekwalificeerd?: number
  chatbotConversie?: number
  googleConversions?: number
  googleSpend?: number
  omzet?: number
  deals?: number
}

export type JourneyPeriod = 'dag' | 'week' | 'maand'
const PERIOD_LABELS: Record<JourneyPeriod, string> = { maand: 'M', week: 'W', dag: 'D' }

interface Props {
  pipeline: GhlPipelineStep[]
  loading: boolean
  extra?: ExtraTotals
  period?: JourneyPeriod
  onPeriodChange?: (p: JourneyPeriod) => void
}

export function JourneyBar({ pipeline, loading, extra, period = 'maand', onPeriodChange }: Props) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  const steps = pipeline.length > 0 ? pipeline : [
    { stage: 'website_lead', label: 'Website leads', value: 0, description: '' },
    { stage: 'chatbot', label: 'Chatbot gesprekken', value: 0, description: '' },
    { stage: 'telefoon', label: 'Telefonische afspraken', value: 0, description: '' },
    { stage: 'buitendienst', label: 'Buitendienst afspraken', value: 0, description: '' },
    { stage: 'sale', label: 'Sale', value: 0, description: '' },
  ] as GhlPipelineStep[]

  const maxVal = Math.max(...steps.map(s => s.value), 1)

  // Summary totals — combine all data sources
  const pipelineLeads = steps.find(s => s.stage === 'website_lead')?.value ?? 0
  const pipelineTelefoon = steps.find(s => s.stage === 'telefoon')?.value ?? 0
  const pipelineBuitendienst = steps.find(s => s.stage === 'buitendienst')?.value ?? 0
  const pipelineSales = steps.find(s => s.stage === 'sale')?.value ?? 0
  const totaalAfspraken = pipelineTelefoon + pipelineBuitendienst

  const summaryItems: { label: string; value: string; color: string }[] = []

  // Meta Ads totals
  if (extra?.metaSpend !== undefined) {
    summaryItems.push({ label: 'Meta spend', value: `€${Math.round(extra.metaSpend)}`, color: 'var(--o-txt)' })
  }
  if (extra?.metaLeads !== undefined) {
    summaryItems.push({ label: 'Meta leads', value: String(extra.metaLeads), color: 'var(--b-txt)' })
  }
  if (extra?.metaCpl !== undefined) {
    summaryItems.push({ label: 'CPL', value: extra.metaCpl > 0 ? `€${Math.round(extra.metaCpl)}` : '€0', color: extra.metaCpl > 0 && extra.metaCpl < 20 ? 'var(--g-txt)' : 'var(--o-txt)' })
  }

  // Chatbot totals
  if (extra?.chatbotGesprekken !== undefined) {
    summaryItems.push({ label: 'Chatbot gesprekken', value: String(extra.chatbotGesprekken), color: 'var(--b-txt)' })
  }
  if (extra?.chatbotGekwalificeerd !== undefined) {
    summaryItems.push({ label: 'Gekwalificeerd', value: String(extra.chatbotGekwalificeerd), color: 'var(--g-txt)' })
  }

  // Google Ads
  if (extra?.googleConversions !== undefined && extra.googleConversions > 0) {
    summaryItems.push({ label: 'Google conversies', value: String(extra.googleConversions), color: 'var(--b-txt)' })
  }

  // Pipeline totals
  summaryItems.push({ label: 'Afspraken', value: String(totaalAfspraken), color: 'var(--y-txt)' })

  if (extra?.omzet !== undefined && extra.omzet > 0) {
    summaryItems.push({ label: 'Omzet', value: `€${(extra.omzet / 1000).toFixed(1)}k`, color: 'var(--g-txt)' })
  }

  summaryItems.push({ label: 'Deals', value: String(extra?.deals ?? pipelineSales), color: 'var(--g-txt)' })

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
            background: 'var(--bg2)', color: 'var(--txt3)', border: '1px solid var(--border)',
          }}>Realtime</span>
          {onPeriodChange && (
            <div style={{
              display: 'inline-flex', gap: 2, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 3,
            }}>
              {(['maand', 'week', 'dag'] as JourneyPeriod[]).map(p => (
                <button key={p} onClick={() => onPeriodChange(p)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 600,
                  background: period === p ? 'var(--b-bg)' : 'transparent',
                  color: period === p ? 'var(--b-txt)' : 'var(--txt3)',
                  border: period === p ? '1px solid var(--b-border)' : '1px solid transparent',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                }}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
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

      {/* Summary totals row */}
      {!loading && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--border)',
        }}>
          {summaryItems.map((item, i) => (
            <div key={item.label} style={{
              flex: 1, textAlign: 'center',
              borderRight: i < summaryItems.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '0 8px',
            }}>
              <div className="mono" style={{
                fontSize: 14, fontWeight: 700, color: item.color,
                letterSpacing: '-0.01em',
              }}>
                {item.value}
              </div>
              <div style={{
                fontSize: 9.5, fontWeight: 500, color: 'var(--txt3)',
                marginTop: 1, letterSpacing: '0.01em',
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
