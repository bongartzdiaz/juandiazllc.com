'use client'

import { useState, useEffect } from 'react'
import { GoalProgress } from '@/components/ui/GoalProgress'
import { Pencil, Check, Plus, X } from 'lucide-react'
import type { SalesData } from '@/lib/types'

interface Goal {
  key: string
  label: string
  current: number
  defaultTarget: number
  unit?: string
  isCustom?: boolean
}

interface CustomGoal {
  key: string
  label: string
  target: number
  current: number
  unit?: string
}

interface StoredData {
  leads?: number
  afspraken?: number
  deals?: number
  omzet?: number
  custom?: CustomGoal[]
}

type Period = 'maand' | 'week' | 'dag'

const STORAGE_KEY = 'hmb-goal-targets'

function getNote(pct: number): string {
  if (pct >= 93) return `${Math.round(pct)}% — bijna op doel!`
  if (pct >= 70) return `${Math.round(pct)}% — op schema`
  return 'Achter op schema'
}

function getDaysInfo() {
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = daysInMonth - dayOfMonth
  return { daysInMonth, dayOfMonth, daysRemaining }
}

function scaleToPeriod(monthTarget: number, monthCurrent: number, period: Period): { target: number; current: number } {
  if (period === 'maand') return { target: monthTarget, current: monthCurrent }
  const { daysInMonth, dayOfMonth } = getDaysInfo()
  if (period === 'week') {
    const target = Math.round(monthTarget / 4.33)
    const weeksElapsed = Math.max(dayOfMonth / 7, 1)
    const current = Math.round(monthCurrent / weeksElapsed)
    return { target, current }
  }
  // dag
  const target = Math.round(monthTarget / daysInMonth)
  const current = dayOfMonth > 0 ? Math.round(monthCurrent / dayOfMonth) : 0
  return { target, current }
}

interface Props {
  sales?: SalesData | null
}

export function GoalsCard({ sales }: Props) {
  const [editing, setEditing] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([])
  const [tempTargets, setTempTargets] = useState<Record<string, string>>({})
  const [tempCustom, setTempCustom] = useState<CustomGoal[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [period, setPeriod] = useState<Period>('maand')

  const baseGoals: Goal[] = [
    { key: 'leads', label: 'Leads', current: sales?.totals?.leads ?? 0, defaultTarget: 120 },
    { key: 'afspraken', label: 'Afspraken', current: sales?.totals?.afspraken ?? 0, defaultTarget: 40 },
    { key: 'deals', label: 'Deals', current: sales?.totals?.deals ?? 0, defaultTarget: 15 },
    { key: 'omzet', label: 'Omzet', current: sales?.totals?.omzet ?? 0, defaultTarget: 45000, unit: '€' },
  ]

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const data: StoredData = JSON.parse(saved)
        const t: Record<string, number> = {}
        if (data.leads) t.leads = data.leads
        if (data.afspraken) t.afspraken = data.afspraken
        if (data.deals) t.deals = data.deals
        if (data.omzet) t.omzet = data.omzet
        setTargets(t)
        if (data.custom) setCustomGoals(data.custom)
      }
    } catch {}
  }, [])

  const getTarget = (goal: Goal) => targets[goal.key] || goal.defaultTarget

  const saveToStorage = (newTargets: Record<string, number>, newCustom: CustomGoal[]) => {
    const data: StoredData = { ...newTargets, custom: newCustom }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const startEditing = () => {
    const temp: Record<string, string> = {}
    baseGoals.forEach(g => { temp[g.key] = String(getTarget(g)) })
    setTempTargets(temp)
    setTempCustom(customGoals.map(c => ({ ...c })))
    setNewLabel('')
    setNewTarget('')
    setEditing(true)
  }

  const saveTargets = () => {
    const newTargets: Record<string, number> = {}
    baseGoals.forEach(g => {
      const val = parseInt(tempTargets[g.key], 10)
      if (!isNaN(val) && val > 0) newTargets[g.key] = val
    })
    const validCustom = tempCustom.filter(c => c.label.trim() && c.target > 0)
    setTargets(newTargets)
    setCustomGoals(validCustom)
    saveToStorage(newTargets, validCustom)
    setEditing(false)
  }

  const addCustomGoal = () => {
    if (!newLabel.trim() || !newTarget.trim()) return
    const target = parseInt(newTarget, 10)
    if (isNaN(target) || target <= 0) return
    const key = `custom_${Date.now()}`
    setTempCustom([...tempCustom, { key, label: newLabel.trim(), target, current: 0 }])
    setNewLabel('')
    setNewTarget('')
  }

  const removeCustomGoal = (key: string) => {
    setTempCustom(tempCustom.filter(c => c.key !== key))
  }

  const updateCustomTarget = (key: string, value: string) => {
    setTempCustom(tempCustom.map(c => c.key === key ? { ...c, target: parseInt(value, 10) || 0 } : c))
  }

  const updateCustomCurrent = (key: string, value: string) => {
    setTempCustom(tempCustom.map(c => c.key === key ? { ...c, current: parseInt(value, 10) || 0 } : c))
  }

  const { daysRemaining } = getDaysInfo()

  const allGoals: Goal[] = [
    ...baseGoals,
    ...customGoals.map(c => ({
      key: c.key,
      label: c.label,
      current: c.current,
      defaultTarget: c.target,
      unit: c.unit,
      isCustom: true,
    })),
  ]

  const periodLabel = period === 'maand' ? 'Maanddoelen' : period === 'week' ? 'Weekdoelen' : 'Dagdoelen'

  const periodBtnStyle = (p: Period) => ({
    padding: '2px 6px', borderRadius: 4, cursor: 'pointer' as const,
    fontSize: 9, fontWeight: 700 as const, letterSpacing: '0.02em',
    background: period === p ? 'var(--b-bg)' : 'transparent',
    color: period === p ? 'var(--b-txt)' : 'var(--txt3)',
    border: `1px solid ${period === p ? 'var(--b-border)' : 'transparent'}`,
  })

  const inputStyle = {
    width: 60, padding: '3px 6px', borderRadius: 5, textAlign: 'right' as const,
    fontSize: 11.5, fontWeight: 600,
    background: 'var(--bg2)', color: 'var(--txt)',
    border: '1px solid var(--border2)', outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      animation: 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.3s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 15px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g)' }} />
          {periodLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="mono" style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
            background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
          }}>{daysRemaining}d over</span>
          {/* Period toggle */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setPeriod('maand')} style={periodBtnStyle('maand')}>M</button>
            <button onClick={() => setPeriod('week')} style={periodBtnStyle('week')}>W</button>
            <button onClick={() => setPeriod('dag')} style={periodBtnStyle('dag')}>D</button>
          </div>
          <button
            onClick={editing ? saveTargets : startEditing}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
              background: editing ? 'var(--g-bg)' : 'transparent',
              border: `1px solid ${editing ? 'var(--g-border)' : 'var(--border)'}`,
              color: editing ? 'var(--g-txt)' : 'var(--txt3)',
            }}
          >
            {editing ? <Check size={12} /> : <Pencil size={11} />}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Base goals */}
        {baseGoals.map((g, i) => {
          const monthTarget = getTarget(g)
          const { target, current } = scaleToPeriod(monthTarget, g.current, period)
          const displayCurrent = g.unit === '€' ? Math.round(current / 1000) : current
          const displayTarget = g.unit === '€' ? Math.round(target / 1000) : target
          const pct = target > 0 ? (current / target) * 100 : 0

          if (editing) {
            return (
              <div key={g.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {g.unit && <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>{g.unit}</span>}
                    <input
                      type="number"
                      className="mono"
                      value={tempTargets[g.key] || ''}
                      onChange={e => setTempTargets({ ...tempTargets, [g.key]: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            )
          }

          return (
            <GoalProgress
              key={g.key}
              label={g.label}
              current={displayCurrent}
              target={displayTarget}
              note={getNote(pct)}
              delay={i * 100}
            />
          )
        })}

        {/* Custom goals */}
        {editing ? (
          <>
            {tempCustom.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {tempCustom.map(c => (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                    <input
                      type="number"
                      className="mono"
                      placeholder="Nu"
                      value={c.current || ''}
                      onChange={e => updateCustomCurrent(c.key, e.target.value)}
                      style={{ ...inputStyle, width: 50 }}
                    />
                    <span className="mono" style={{ fontSize: 10, color: 'var(--txt3)' }}>/</span>
                    <input
                      type="number"
                      className="mono"
                      placeholder="Doel"
                      value={c.target || ''}
                      onChange={e => updateCustomTarget(c.key, e.target.value)}
                      style={{ ...inputStyle, width: 50 }}
                    />
                    <button
                      onClick={() => removeCustomGoal(c.key)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                        background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                        color: 'var(--r-txt)', flexShrink: 0,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add new custom goal */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              borderTop: tempCustom.length === 0 ? '1px solid var(--border)' : undefined,
              paddingTop: tempCustom.length === 0 ? 10 : 0,
            }}>
              <input
                type="text"
                placeholder="Label"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: 5,
                  fontSize: 11, background: 'var(--bg2)', color: 'var(--txt)',
                  border: '1px solid var(--border2)', outline: 'none',
                }}
              />
              <input
                type="number"
                className="mono"
                placeholder="Doel"
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                style={{ ...inputStyle, width: 50 }}
              />
              <button
                onClick={addCustomGoal}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 4, cursor: 'pointer',
                  background: 'var(--g-bg)', border: '1px solid var(--g-border)',
                  color: 'var(--g-txt)', flexShrink: 0,
                }}
              >
                <Plus size={10} />
              </button>
            </div>
          </>
        ) : (
          customGoals.map((c, i) => {
            const { target, current } = scaleToPeriod(c.target, c.current, period)
            const pct = target > 0 ? (current / target) * 100 : 0
            return (
              <GoalProgress
                key={c.key}
                label={c.label}
                current={current}
                target={target}
                note={getNote(pct)}
                delay={(baseGoals.length + i) * 100}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
