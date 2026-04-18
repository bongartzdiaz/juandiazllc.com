'use client'

import { useEffect, useState } from 'react'
import { goalColor, goalTextColor } from '@/lib/philly/utils'

export function GoalProgress({ label, current, target, note, delay = 0 }: {
  label: string; current: number; target: number; note?: string; delay?: number
}) {
  const [width, setWidth] = useState(0)
  const pct = target > 0 ? (current / target) * 100 : 0
  const fill = goalColor(pct)
  const txtColor = goalTextColor(pct)

  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), 500 + delay)
    return () => clearTimeout(t)
  }, [pct, delay])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 11.5, color: txtColor }}>
          {current} / {target}
        </span>
      </div>
      <div style={{ height: 5, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{
          height: '100%', borderRadius: 3, background: fill,
          width: `${width}%`,
          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
      {note && <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{note}</div>}
    </div>
  )
}
