'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Alert {
  severity: 'ok' | 'warn' | 'crit'
  title: string
  message: string
  metric?: number
  suggestion: string
}

const severityStyles = {
  ok:   { bg: 'var(--g-bg)', border: 'var(--g)', color: 'var(--g-txt)', dot: 'var(--g)', Icon: Info },
  warn: { bg: 'var(--o-bg)', border: 'var(--o)', color: 'var(--o-txt)', dot: 'var(--o)', Icon: AlertTriangle },
  crit: { bg: 'var(--r-bg)', border: 'var(--r)', color: 'var(--r-txt)', dot: 'var(--r)', Icon: AlertCircle },
}

function generateAlerts(industry: string): Alert[] {
  if (industry === 'realestate') {
    return [
      { severity: 'crit', title: '2 offers expiring today', message: 'Penthouse Suite and Townhouse Jordaan require urgent follow-up', metric: 2, suggestion: 'Contact buyers immediately to negotiate extension or closing terms.' },
      { severity: 'warn', title: '3 listings stale >30 days', message: 'Commercial Office Centrum (45d), Family Home Amstelveen (38d), Loft Oost (32d)', metric: 3, suggestion: 'Schedule price review meeting and consider enhanced marketing packages for these properties.' },
      { severity: 'warn', title: 'Low viewing conversion', message: 'Viewing-to-offer rate dropped to 18% this week (target: 25%)', metric: 18, suggestion: 'Review property presentations and agent follow-up timing. Consider staging improvements.' },
      { severity: 'ok', title: 'New leads up 22%', message: '14 new qualified leads this week vs 11 last week', metric: 14, suggestion: 'Distribute leads evenly across agents and prioritize high-value prospects.' },
    ]
  }

  if (industry === 'hospitality') {
    return [
      { severity: 'crit', title: 'Maintenance overdue', message: '2 rooms out of service: Room 108 AC (3 days), Room 302 plumbing (2 days)', metric: 2, suggestion: 'Escalate to facilities manager. Consider temporary room upgrades for affected guests.' },
      { severity: 'warn', title: 'Occupancy below target', message: 'Current week occupancy at 68% vs 85% target', metric: 68, suggestion: 'Activate last-minute deal on Booking.com and push email campaign to loyalty members.' },
      { severity: 'warn', title: 'High cancellation rate', message: 'Cancellation rate at 14% this month (threshold: 10%)', metric: 14, suggestion: 'Review flexible booking policy impact and consider non-refundable rate incentives.' },
      { severity: 'ok', title: 'Guest satisfaction stable', message: 'Average review score 4.3/5 across all platforms', metric: 4.3, suggestion: 'Maintain current service standards. Target 4.5 by improving check-in experience.' },
      { severity: 'warn', title: 'F&B underperforming', message: 'Restaurant revenue at 71% of monthly target', metric: 71, suggestion: 'Launch weekend brunch promotion and review menu pricing strategy.' },
    ]
  }

  // philanthropy / CSR
  return [
    { severity: 'warn', title: 'Clean Water Kenya delayed', message: 'Project at 45% completion, 2 weeks behind schedule', metric: 45, suggestion: 'Reallocate resources from completed projects. Schedule call with local partner.' },
    { severity: 'crit', title: 'Q2 budget overrun risk', message: 'Current spend at 62% with 40% of quarter remaining', metric: 62, suggestion: 'Freeze non-essential purchases and review contractor invoices for discrepancies.' },
    { severity: 'ok', title: 'CO2 target on track', message: '1,200 kg reduced this quarter -- 45% of yearly goal', metric: 1200, suggestion: 'Continue current trajectory. Document methodology for annual impact report.' },
    { severity: 'warn', title: 'Partner deadline approaching', message: 'GreenTech Solutions MOU expires in 12 days', metric: 12, suggestion: 'Schedule renewal meeting this week. Prepare updated terms with expanded scope.' },
  ]
}

export function AlertsCard({ industry }: { industry: string }) {
  const t = useTranslations('dashboard.alerts')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const alerts = useMemo(() => generateAlerts(industry), [industry])

  const counts = useMemo(() => ({
    ok: alerts.filter(a => a.severity === 'ok').length,
    warn: alerts.filter(a => a.severity === 'warn').length,
    crit: alerts.filter(a => a.severity === 'crit').length,
  }), [alerts])

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
          <AlertTriangle size={15} color="var(--txt2)" />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('title')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {counts.crit > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--r)' }} />
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--r-txt)' }}>{counts.crit}</span>
            </div>
          )}
          {counts.warn > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--o)' }} />
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--o-txt)' }}>{counts.warn}</span>
            </div>
          )}
          {counts.ok > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--g)' }} />
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--g-txt)' }}>{counts.ok}</span>
            </div>
          )}
        </div>
      </div>

      {/* Alert list */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {alerts.map((alert, i) => {
          const s = severityStyles[alert.severity]
          const isExpanded = expandedIdx === i
          return (
            <div key={i}>
              <div
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 20px',
                  borderBottom: i < alerts.length - 1 || isExpanded ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${s.border}`,
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                }}
              >
                <s.Icon size={14} color={s.color} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: s.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {alert.title}
                    {alert.metric !== undefined && (
                      <span className="mono" style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 5px',
                        borderRadius: 4, background: s.bg, color: s.color,
                      }}>{alert.metric}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2, lineHeight: 1.4 }}>{alert.message}</div>
                </div>
                {isExpanded
                  ? <ChevronUp size={14} color="var(--txt3)" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <ChevronDown size={14} color="var(--txt3)" style={{ flexShrink: 0, marginTop: 2 }} />
                }
              </div>
              {isExpanded && (
                <div style={{
                  padding: '10px 20px 12px 36px',
                  background: s.bg,
                  borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${s.border}`,
                  animation: 'fadeIn 200ms ease',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--txt3)', marginBottom: 4 }}>
                    Suggestion
                  </div>
                  <div style={{ fontSize: 12, color: s.color, lineHeight: 1.5 }}>{alert.suggestion}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* View All */}
      <div style={{
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        cursor: 'pointer',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{t('viewAll')}</span>
        <ArrowRight size={12} color="var(--accent)" />
      </div>
    </div>
  )
}
