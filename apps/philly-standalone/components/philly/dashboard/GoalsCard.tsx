'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Target, Check, AlertTriangle, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Goal {
  label: string
  current: number
  target: number
  unit: string
  prefix?: string
  suffix?: string
}

function getDefaultGoals(industry: string): Goal[] {
  if (industry === 'realestate') {
    return [
      { label: 'Listings', current: 4, target: 10, unit: '' },
      { label: 'Deals Closed', current: 2, target: 5, unit: '' },
      { label: 'Commission', current: 18500, target: 35000, unit: 'EUR', prefix: '\u20AC' },
      { label: 'Viewings', current: 12, target: 20, unit: '' },
      { label: 'Leads', current: 28, target: 50, unit: '' },
    ]
  }
  if (industry === 'hospitality') {
    return [
      { label: 'Occupancy', current: 72, target: 85, unit: '%', suffix: '%' },
      { label: 'RevPAR', current: 95, target: 120, unit: 'EUR', prefix: '\u20AC' },
      { label: 'Satisfaction', current: 4.2, target: 4.5, unit: '/5' },
      { label: 'Bookings', current: 148, target: 200, unit: '' },
      { label: 'F&B Revenue', current: 32000, target: 45000, unit: 'EUR', prefix: '\u20AC' },
    ]
  }
  // philanthropy / CSR
  return [
    { label: 'Projects', current: 3, target: 6, unit: '' },
    { label: 'People Helped', current: 420, target: 1000, unit: '' },
    { label: 'CO2 Reduced', current: 1200, target: 5000, unit: 'kg', suffix: ' kg' },
    { label: 'Donations', current: 14000, target: 25000, unit: 'EUR', prefix: '\u20AC' },
  ]
}

function formatValue(val: number, goal: Goal): string {
  const p = goal.prefix || ''
  const s = goal.suffix || ''
  if (goal.unit === 'EUR') {
    if (val >= 1000) return `${p}${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K${s}`
    return `${p}${val}${s}`
  }
  return `${p}${val.toLocaleString('nl-NL')}${s}`
}

// Status labels live in i18n now; this helper returns a stable status KEY so
// the component can call t(`status.${key}`) at render time.
function getStatus(pct: number): { key: 'onTrack' | 'atRisk' | 'behind'; color: string; bg: string; Icon: typeof Check } {
  if (pct >= 85) return { key: 'onTrack', color: 'var(--g-txt)', bg: 'var(--g-bg)', Icon: Check }
  if (pct >= 60) return { key: 'atRisk', color: 'var(--y-txt)', bg: 'var(--y-bg)', Icon: AlertTriangle }
  return { key: 'behind', color: 'var(--r-txt)', bg: 'var(--r-bg)', Icon: X }
}

function progressColor(pct: number): string {
  if (pct >= 85) return 'var(--g)'
  if (pct >= 60) return 'var(--y)'
  return 'var(--r)'
}

const STORAGE_KEY = 'pai-goals'

export function GoalsCard({ industry }: { industry: string }) {
  const t = useTranslations('dashboard.goals')
  const defaults = useMemo(() => getDefaultGoals(industry), [industry])
  const [goals, setGoals] = useState<Goal[]>(defaults)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed[industry]) {
          setGoals(parsed[industry])
          return
        }
      }
    } catch { /* ignore */ }
    setGoals(defaults)
  }, [industry, defaults])

  // Save to localStorage
  const saveGoals = useCallback((updated: Goal[]) => {
    setGoals(updated)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const all = stored ? JSON.parse(stored) : {}
      all[industry] = updated
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch { /* ignore */ }
  }, [industry])

  const daysRemaining = useMemo(() => {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }, [])

  const handleEditStart = (i: number) => {
    setEditingIdx(i)
    setEditVal(String(goals[i].target))
  }

  const handleEditSave = () => {
    if (editingIdx === null) return
    const num = parseFloat(editVal)
    if (isNaN(num) || num <= 0) {
      setEditingIdx(null)
      return
    }
    const updated = goals.map((g, i) => i === editingIdx ? { ...g, target: num } : g)
    saveGoals(updated)
    setEditingIdx(null)
  }

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
          <Target size={15} color="var(--txt2)" />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>{t('title')}</span>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 500 }}>
          {daysRemaining} days remaining
        </span>
      </div>

      {/* Goal rows */}
      <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {goals.map((goal, i) => {
          const pct = Math.min(100, (goal.current / goal.target) * 100)
          const status = getStatus(pct)
          const isEditing = editingIdx === i

          return (
            <div key={goal.label}>
              {/* Top row: label + status + values */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)' }}>{goal.label}</span>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 4, background: status.bg, color: status.color,
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}>
                    {t(`status.${status.key}`)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>
                    {formatValue(goal.current, goal)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>/</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onBlur={handleEditSave}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingIdx(null) }}
                      autoFocus
                      style={{
                        width: 60, fontSize: 12, fontWeight: 600,
                        padding: '1px 4px', borderRadius: 4,
                        border: '1px solid var(--accent)',
                        background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                        outline: 'none', fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <span
                      className="mono"
                      onClick={() => handleEditStart(i)}
                      style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--txt3)',
                        cursor: 'pointer', borderBottom: '1px dashed var(--border)',
                      }}
                      title="Click to edit target"
                    >
                      {formatValue(goal.target, goal)}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 3,
                background: 'var(--bg2)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: progressColor(pct),
                  width: `${pct}%`,
                  transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>

              {/* Percentage */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                <span className="mono" style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)' }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
