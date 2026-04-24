'use client'

import { useEffect, useState } from 'react'
import {
  Briefcase, Trophy, Search,
  Home, Key, FileText, BedDouble, Star,
  Leaf, Globe2,
  CalendarCheck, ClipboardCheck, Handshake, Receipt,
  FileCheck, ArrowRightLeft,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface PipelineStep {
  stage: string
  label: string
  value: number
  icon: LucideIcon
  color: string
  colorBg: string
  colorBorder: string
}

interface SummaryItem {
  label: string
  value: string
  color: string
}

export type JourneyPeriod = 'day' | 'week' | 'month'

interface JourneyBarProps {
  steps: PipelineStep[]
  summaryItems?: SummaryItem[]
  title: string
  subtitle: string
  loading?: boolean
  period?: JourneyPeriod
  onPeriodChange?: (p: JourneyPeriod) => void
}

// ── Pre-built pipeline configs per industry ──

export const CSR_JOURNEY: PipelineStep[] = [
  { stage: 'proposals', label: 'Proposals', value: 12, icon: FileText, color: 'var(--b)', colorBg: 'var(--b-bg)', colorBorder: 'var(--b-border)' },
  { stage: 'approved', label: 'Approved', value: 8, icon: ClipboardCheck, color: 'var(--accent)', colorBg: 'var(--accent-bg)', colorBorder: 'var(--accent-border)' },
  { stage: 'active', label: 'Active', value: 5, icon: Leaf, color: 'var(--y)', colorBg: 'var(--y-bg)', colorBorder: 'var(--y-border)' },
  { stage: 'reporting', label: 'Reporting', value: 4, icon: Globe2, color: 'var(--o)', colorBg: 'var(--o-bg)', colorBorder: 'var(--o-border)' },
  { stage: 'completed', label: 'Completed', value: 15, icon: Trophy, color: 'var(--g)', colorBg: 'var(--g-bg)', colorBorder: 'var(--g-border)' },
]

export const CSR_SUMMARY: SummaryItem[] = [
  { label: 'Total Donated', value: '\u20AC48K', color: 'var(--g-txt)' },
  { label: 'People Helped', value: '1,100', color: 'var(--accent-txt)' },
  { label: 'CO2 Reduced', value: '4.5t', color: 'var(--g-txt)' },
  { label: 'Active Partners', value: '12', color: 'var(--b-txt)' },
  { label: 'SDGs Covered', value: '9', color: 'var(--p-txt)' },
]

export const RE_SALES_JOURNEY: PipelineStep[] = [
  { stage: 'enquiry', label: 'Enquiry', value: 12, icon: Search, color: 'var(--txt3)', colorBg: 'var(--bg2)', colorBorder: 'var(--border)' },
  { stage: 'viewing', label: 'Viewing', value: 8, icon: Home, color: 'var(--b)', colorBg: 'var(--b-bg)', colorBorder: 'var(--b-border)' },
  { stage: 'reservation', label: 'Reservation', value: 5, icon: Key, color: 'var(--accent)', colorBg: 'var(--accent-bg)', colorBorder: 'var(--accent-border)' },
  { stage: 'searches', label: 'Searches', value: 4, icon: FileCheck, color: 'var(--y)', colorBg: 'var(--y-bg)', colorBorder: 'var(--y-border)' },
  { stage: 'agreement', label: 'Agreement', value: 3, icon: Handshake, color: 'var(--o)', colorBg: 'var(--o-bg)', colorBorder: 'var(--o-border)' },
  { stage: 'transfer', label: 'Transfer', value: 2, icon: ArrowRightLeft, color: 'var(--p)', colorBg: 'var(--p-bg)', colorBorder: 'var(--p-border)' },
  { stage: 'commission', label: 'Commission', value: 9, icon: Trophy, color: 'var(--g)', colorBg: 'var(--g-bg)', colorBorder: 'var(--g-border)' },
]

export const RE_RENTAL_JOURNEY: PipelineStep[] = [
  { stage: 'enquiry', label: 'Enquiry', value: 18, icon: Search, color: 'var(--txt3)', colorBg: 'var(--bg2)', colorBorder: 'var(--border)' },
  { stage: 'viewing', label: 'Viewing', value: 11, icon: Home, color: 'var(--b)', colorBg: 'var(--b-bg)', colorBorder: 'var(--b-border)' },
  { stage: 'agreement', label: 'Agreement', value: 6, icon: FileText, color: 'var(--accent)', colorBg: 'var(--accent-bg)', colorBorder: 'var(--accent-border)' },
  { stage: 'payment', label: 'Payment', value: 4, icon: Receipt, color: 'var(--o)', colorBg: 'var(--o-bg)', colorBorder: 'var(--o-border)' },
  { stage: 'active', label: 'Active Lease', value: 14, icon: Trophy, color: 'var(--g)', colorBg: 'var(--g-bg)', colorBorder: 'var(--g-border)' },
]

export const RE_SUMMARY: SummaryItem[] = [
  { label: 'Active Listings', value: '3', color: 'var(--b-txt)' },
  { label: 'Deals Closed', value: '33', color: 'var(--g-txt)' },
  { label: 'Commission YTD', value: '\u20AC379K', color: 'var(--g-txt)' },
  { label: 'Avg Days to Close', value: '23', color: 'var(--y-txt)' },
  { label: 'Active Rentals', value: '14', color: 'var(--p-txt)' },
]

export const HOS_JOURNEY: PipelineStep[] = [
  { stage: 'inquiry', label: 'Inquiry', value: 42, icon: Search, color: 'var(--txt3)', colorBg: 'var(--bg2)', colorBorder: 'var(--border)' },
  { stage: 'confirmed', label: 'Confirmed', value: 28, icon: CalendarCheck, color: 'var(--b)', colorBg: 'var(--b-bg)', colorBorder: 'var(--b-border)' },
  { stage: 'checkedin', label: 'Checked-In', value: 18, icon: BedDouble, color: 'var(--o)', colorBg: 'var(--o-bg)', colorBorder: 'var(--o-border)' },
  { stage: 'checkedout', label: 'Checked-Out', value: 12, icon: Briefcase, color: 'var(--p)', colorBg: 'var(--p-bg)', colorBorder: 'var(--p-border)' },
  { stage: 'reviewed', label: 'Reviewed', value: 9, icon: Star, color: 'var(--g)', colorBg: 'var(--g-bg)', colorBorder: 'var(--g-border)' },
]

export const HOS_SUMMARY: SummaryItem[] = [
  { label: 'Occupancy', value: '78%', color: 'var(--accent-txt)' },
  { label: 'RevPAR', value: '\u20AC142', color: 'var(--g-txt)' },
  { label: 'ADR', value: '\u20AC185', color: 'var(--b-txt)' },
  { label: 'Avg Stay', value: '2.8n', color: 'var(--y-txt)' },
  { label: 'Reviews', value: '189', color: 'var(--p-txt)' },
  { label: 'Satisfaction', value: '4.6/5', color: 'var(--g-txt)' },
]

// ── Component ──

const PERIOD_LABELS: Record<JourneyPeriod, string> = { month: 'M', week: 'W', day: 'D' }

export function JourneyBar({ steps, summaryItems, title, subtitle, loading = false, period = 'month', onPeriodChange }: JourneyBarProps) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

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
          {title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
            background: 'var(--g-bg)', color: 'var(--g-txt)', border: '1px solid var(--g-border)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--g)',
              animation: 'blink 1.5s ease-in-out infinite',
            }} />
            LIVE
          </span>
          {/* Period selector */}
          {onPeriodChange && (
            <div style={{
              display: 'inline-flex', gap: 2, background: 'var(--bg2)',
              border: '1px solid var(--border)', borderRadius: 8, padding: 3,
            }}>
              {(['month', 'week', 'day'] as JourneyPeriod[]).map(p => (
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
          <span style={{
            fontSize: 10.5, color: 'var(--txt3)', fontWeight: 500,
          }}>{subtitle}</span>
        </div>
      </div>

      {/* Journey steps */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {steps.map((step, i) => {
          const Icon = step.icon
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
                background: isLast ? step.colorBg : 'transparent',
                border: isLast ? `1px solid ${step.colorBorder}` : '1px solid transparent',
              }}>
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: 10, margin: '0 auto 8px',
                  background: step.colorBg, border: `1px solid ${step.colorBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={step.color} />
                </div>

                {/* Value */}
                <div className="mono" style={{
                  fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em',
                  color: loading ? 'var(--txt3)' : step.color,
                  opacity: animated ? 1 : 0,
                  transform: animated ? 'translateY(0)' : 'translateY(8px)',
                  transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.1}s`,
                }}>
                  {loading ? '\u2014' : step.value.toLocaleString('en-US')}
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
                    background: step.color,
                    width: animated ? `${barWidth}%` : '0%',
                    transition: `width 1s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.1}s`,
                  }} />
                </div>
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', width: 36, flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 16, color: 'var(--border2)', lineHeight: 1,
                  }}>{'\u2192'}</div>
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
      {summaryItems && summaryItems.length > 0 && !loading && (
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
                fontSize: 9.5, fontWeight: 500, color: 'var(--txt2)',
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
