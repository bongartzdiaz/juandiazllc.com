'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Users, TrendingDown, TrendingUp, MessageCircle, Calendar,
  Zap, DollarSign, Target, Leaf, Globe2, HeartHandshake,
  TreePine, Droplets, BarChart3, FolderKanban, Award,
  Pencil, Check, X,
} from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'users': Users,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  'message-circle': MessageCircle,
  'calendar': Calendar,
  'zap': Zap,
  'dollar-sign': DollarSign,
  'target': Target,
  'leaf': Leaf,
  'globe': Globe2,
  'heart': HeartHandshake,
  'tree': TreePine,
  'water': Droplets,
  'chart': BarChart3,
  'folder': FolderKanban,
  'award': Award,
}

interface KpiCardProps {
  label: string
  value: string | number
  delta?: string
  deltaDir?: 'up' | 'down' | 'neu'
  goal?: string
  goalCurrent?: number
  goalTarget?: number
  hot?: boolean
  accentColor?: string
  icon?: string
  delay?: number
  editable?: boolean
  onValueChange?: (newValue: string) => void
  sparkData?: number[]
}

export function KpiCard({
  label, value, delta, deltaDir = 'neu', goal, goalCurrent, goalTarget,
  hot, accentColor = 'var(--accent)', icon, delay = 0,
  editable = false, onValueChange, sparkData,
}: KpiCardProps) {
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = () => {
    setEditing(false)
    if (onValueChange && editValue !== String(value)) {
      onValueChange(editValue)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setEditValue(String(value))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  const deltaColor = deltaDir === 'up' ? 'var(--g-txt)' : deltaDir === 'down' ? 'var(--r-txt)' : 'var(--txt3)'
  const deltaIcon = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : ''
  const Icon = icon ? iconMap[icon] : null

  // Goal progress
  const hasGoalProgress = goalCurrent !== undefined && goalTarget !== undefined && goalTarget > 0
  const goalPct = hasGoalProgress ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0

  return (
    <div
      style={{
        background: hot ? 'var(--g-bg)' : 'var(--panel)',
        border: `1px solid ${hot ? 'var(--g-border)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 15px',
        position: 'relative', overflow: 'hidden', cursor: editable ? 'pointer' : 'default',
        boxShadow: 'var(--shadow-sm)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'all 0.45s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Top accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: hot ? 'var(--g)' : accentColor,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--txt3)',
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {editable && !editing && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditValue(String(value)) }}
              style={{
                width: 20, height: 20, borderRadius: 5, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--txt3)', opacity: 0.5,
                transition: 'opacity 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
            >
              <Pencil size={10} />
            </button>
          )}
          {Icon && (
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: hot ? 'var(--g-border)' : 'var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={13} color={hot ? 'var(--g-txt)' : accentColor} />
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: 22, fontWeight: 500, fontFamily: "var(--font-red-hat-mono), 'Red Hat Mono', monospace",
              background: 'var(--bg2)', border: '1px solid var(--accent)',
              borderRadius: 6, padding: '2px 8px', width: '100%',
              color: 'var(--txt)', outline: 'none',
            }}
          />
          <button onClick={handleSave} style={{
            width: 24, height: 24, borderRadius: 6, border: 'none',
            background: 'var(--g)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Check size={12} /></button>
          <button onClick={handleCancel} style={{
            width: 24, height: 24, borderRadius: 6, border: 'none',
            background: 'var(--r)', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={12} /></button>
        </div>
      ) : (
        <div className="mono" style={{
          fontSize: 26, fontWeight: 500, lineHeight: 1, marginBottom: 8,
          color: hot ? 'var(--g-txt)' : 'var(--txt)',
          letterSpacing: '-0.02em',
        }}>{value}</div>
      )}

      {delta && (
        <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: deltaColor }}>
          {deltaIcon} {delta}
        </div>
      )}

      {goal && !hasGoalProgress && (
        <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 3 }}>{goal}</div>
      )}

      {/* Goal progress bar */}
      {hasGoalProgress && (
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9.5, color: 'var(--txt3)' }}>Goal: {goalTarget}</span>
            <span className="mono" style={{ fontSize: 9.5, fontWeight: 600, color: goalPct >= 100 ? 'var(--g-txt)' : 'var(--txt3)' }}>{goalPct}%</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--bg2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${goalPct}%`,
              background: goalPct >= 100 ? 'var(--g)' : goalPct >= 70 ? 'var(--accent)' : 'var(--y)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      )}

      {/* Sparkline mini-chart */}
      {sparkData && sparkData.length > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, opacity: 0.6, borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData.map((v, i) => ({ v, i }))}>
              <Line type="monotone" dataKey="v" stroke={accentColor || 'var(--accent)'} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
