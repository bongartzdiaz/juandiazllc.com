'use client'

import { useEffect, useState } from 'react'
import {
  Users, TrendingDown, TrendingUp, MessageCircle, Calendar,
  Zap, DollarSign, Target, Leaf, Globe2, HeartHandshake,
  TreePine, Droplets, BarChart3, FolderKanban, Award,
} from 'lucide-react'

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
  hot?: boolean
  accentColor?: string
  icon?: string
  delay?: number
}

export function KpiCard({ label, value, delta, deltaDir = 'neu', goal, hot, accentColor = 'var(--accent)', icon, delay = 0 }: KpiCardProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const deltaColor = deltaDir === 'up' ? 'var(--g-txt)' : deltaDir === 'down' ? 'var(--r-txt)' : 'var(--txt3)'
  const deltaIcon = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : ''
  const Icon = icon ? iconMap[icon] : null

  return (
    <div
      style={{
        background: hot ? 'var(--g-bg)' : 'var(--panel)',
        border: `1px solid ${hot ? 'var(--g-border)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 15px',
        position: 'relative', overflow: 'hidden', cursor: 'default',
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

      <div className="mono" style={{
        fontSize: 26, fontWeight: 500, lineHeight: 1, marginBottom: 8,
        color: hot ? 'var(--g-txt)' : 'var(--txt)',
        letterSpacing: '-0.02em',
      }}>{value}</div>

      {delta && (
        <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: deltaColor }}>
          {deltaIcon} {delta}
        </div>
      )}

      {goal && (
        <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginTop: 3 }}>{goal}</div>
      )}
    </div>
  )
}
