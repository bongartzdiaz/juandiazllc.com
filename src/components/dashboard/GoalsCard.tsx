'use client'

import { useState, useEffect } from 'react'
import { GoalProgress } from '@/components/ui/GoalProgress'
import { Pencil, Check } from 'lucide-react'
import type { SalesData } from '@/lib/types'

interface Goal {
  key: string
  label: string
  current: number
  defaultTarget: number
  unit?: string
}

const STORAGE_KEY = 'hmb-goal-targets'

function getNote(pct: number): string {
  if (pct >= 93) return `${Math.round(pct)}% — bijna op doel!`
  if (pct >= 70) return `${Math.round(pct)}% — op schema`
  return 'Achter op schema'
}

interface Props {
  sales?: SalesData | null
}

export function GoalsCard({ sales }: Props) {
  const [editing, setEditing] = useState(false)
  const [targets, setTargets] = useState<Record<string, number>>({})
  const [tempTargets, setTempTargets] = useState<Record<string, string>>({})

  const goals: Goal[] = [
    { key: 'leads', label: 'Leads', current: sales?.totals?.leads ?? 87, defaultTarget: 120 },
    { key: 'afspraken', label: 'Afspraken', current: sales?.totals?.afspraken ?? 24, defaultTarget: 40 },
    { key: 'deals', label: 'Deals', current: sales?.totals?.deals ?? 14, defaultTarget: 15 },
    { key: 'omzet', label: 'Omzet', current: sales?.totals?.omzet ?? 28000, defaultTarget: 45000, unit: '€' },
  ]

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setTargets(JSON.parse(saved))
    } catch {}
  }, [])

  const getTarget = (goal: Goal) => targets[goal.key] || goal.defaultTarget

  const startEditing = () => {
    const temp: Record<string, string> = {}
    goals.forEach(g => { temp[g.key] = String(getTarget(g)) })
    setTempTargets(temp)
    setEditing(true)
  }

  const saveTargets = () => {
    const newTargets: Record<string, number> = {}
    goals.forEach(g => {
      const val = parseInt(tempTargets[g.key], 10)
      if (!isNaN(val) && val > 0) newTargets[g.key] = val
    })
    setTargets(newTargets)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTargets))
    setEditing(false)
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
          Maanddoelen
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="mono" style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
            background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
          }}>18d over</span>
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
        {goals.map((g, i) => {
          const target = getTarget(g)
          const displayCurrent = g.unit === '€' ? Math.round(g.current / 1000) : g.current
          const displayTarget = g.unit === '€' ? Math.round(target / 1000) : target
          const pct = target > 0 ? (g.current / target) * 100 : 0

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
                      style={{
                        width: 70, padding: '3px 6px', borderRadius: 5, textAlign: 'right',
                        fontSize: 11.5, fontWeight: 600,
                        background: 'var(--bg2)', color: 'var(--txt)',
                        border: '1px solid var(--border2)', outline: 'none',
                        fontFamily: 'inherit',
                      }}
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
      </div>
    </div>
  )
}
