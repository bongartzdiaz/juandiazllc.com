'use client'

import { useState, useMemo } from 'react'
import { Bell, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import type { Industry } from '@/hooks/philly/useIndustry'

interface Alert {
  type: 'ok' | 'warn' | 'crit'
  title: string
  detail: string
  expandable?: boolean
  items?: { label: string; sub: string }[]
}

const alertStyles = {
  ok:   { bg: 'var(--g-bg)', border: 'var(--g)', color: 'var(--g-txt)', Icon: Info },
  warn: { bg: 'var(--o-bg)', border: 'var(--o)', color: 'var(--o-txt)', Icon: AlertTriangle },
  crit: { bg: 'var(--r-bg)', border: 'var(--r)', color: 'var(--r-txt)', Icon: AlertCircle },
}

function generateAlerts(industry: Industry): Alert[] {
  const alerts: Alert[] = []

  if (industry === 'realestate') {
    alerts.push({
      type: 'warn',
      title: '3 listings with 30+ days on market',
      detail: 'Consider price adjustments or enhanced marketing',
      expandable: true,
      items: [
        { label: 'Commercial Office - Centrum', sub: '45 days, 6 viewings' },
        { label: 'Family Home - Amstelveen', sub: '28 days, 15 viewings' },
        { label: 'Studio Apartment - De Pijp', sub: '5 days, 22 viewings' },
      ],
    })
    alerts.push({
      type: 'ok',
      title: 'Conversion rate up 12% this month',
      detail: 'Enquiry-to-viewing rate at 67%',
    })
    alerts.push({
      type: 'crit',
      title: '2 pending offers expiring today',
      detail: 'Penthouse Suite and Townhouse Jordaan',
    })
  } else if (industry === 'hospitality') {
    alerts.push({
      type: 'ok',
      title: 'Occupancy at 78% — above target',
      detail: 'Weekend forecast: 92% occupancy',
    })
    alerts.push({
      type: 'warn',
      title: 'F&B revenue below target',
      detail: 'Room service orders down 15% vs last month',
    })
    alerts.push({
      type: 'crit',
      title: '2 maintenance requests overdue',
      detail: 'Room 108 AC, Room 302 plumbing',
      expandable: true,
      items: [
        { label: 'Room 108 — AC repair', sub: 'Reported 3 days ago' },
        { label: 'Room 302 — Plumbing', sub: 'Reported 2 days ago' },
      ],
    })
  } else {
    alerts.push({
      type: 'ok',
      title: 'CO2 reduction target on track',
      detail: '4.5t reduced — 45% of yearly goal',
    })
    alerts.push({
      type: 'warn',
      title: 'Clean Water Access Kenya at 45%',
      detail: 'Behind schedule — needs resource allocation',
    })
    alerts.push({
      type: 'ok',
      title: 'New partner: GreenTech Solutions',
      detail: 'Onboarded today — assigned to Reforestation',
    })
  }

  return alerts
}

export function NotificationBell({ industry }: { industry: Industry }) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)

  const alerts = useMemo(() => generateAlerts(industry), [industry])
  const critCount = alerts.filter(a => a.type === 'crit' || a.type === 'warn').length

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--txt2)', position: 'relative',
          fontFamily: 'inherit',
        }}
      >
        <Bell size={15} />
        {critCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--r)', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--panel)',
          }}>{critCount}</span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />

          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: 42, right: 0, zIndex: 30,
            width: 340, maxHeight: 400, overflowY: 'auto',
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-md)',
            animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600,
            }}>
              Notifications
              <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginLeft: 8 }}>
                {alerts.length}
              </span>
            </div>

            {alerts.map((a, i) => {
              const s = alertStyles[a.type]
              const isExpanded = expanded === i
              return (
                <div key={i}>
                  <div
                    onClick={() => a.expandable ? setExpanded(isExpanded ? null : i) : undefined}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 16px',
                      borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: a.expandable ? 'pointer' : 'default',
                      borderLeft: `3px solid ${s.border}`,
                      transition: 'background 150ms ease',
                    }}
                  >
                    <s.Icon size={14} color={s.color} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: s.color }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>{a.detail}</div>
                    </div>
                    {a.expandable && (
                      isExpanded ? <ChevronUp size={14} color="var(--txt3)" /> : <ChevronDown size={14} color="var(--txt3)" />
                    )}
                  </div>
                  {a.expandable && isExpanded && a.items && (
                    <div style={{ padding: '4px 16px 12px 32px', background: 'var(--bg2)' }}>
                      {a.items.map((item, j) => (
                        <div key={j} style={{
                          padding: '6px 0',
                          borderBottom: j < a.items!.length - 1 ? '1px solid var(--border)' : 'none',
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{item.sub}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
