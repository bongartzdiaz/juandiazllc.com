'use client'

import { useMemo } from 'react'
import { PieChart as PieIcon } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts'

interface Source {
  name: string
  count: number
  pct: number
  conversion: number
  color: string
}

const COLORS = [
  'var(--accent)',
  'var(--g)',
  'var(--b)',
  'var(--o)',
  'var(--p)',
]

function getSources(industry: string): Source[] {
  if (industry === 'realestate') {
    return [
      { name: 'Website Portal', count: 312, pct: 30, conversion: 24, color: COLORS[0] },
      { name: 'Referral', count: 260, pct: 25, conversion: 38, color: COLORS[1] },
      { name: 'Social Media', count: 208, pct: 20, conversion: 15, color: COLORS[2] },
      { name: 'Open House', count: 156, pct: 15, conversion: 28, color: COLORS[3] },
      { name: 'Other', count: 104, pct: 10, conversion: 12, color: COLORS[4] },
    ]
  }
  if (industry === 'hospitality') {
    return [
      { name: 'Booking.com', count: 476, pct: 35, conversion: 42, color: COLORS[0] },
      { name: 'Direct', count: 340, pct: 25, conversion: 58, color: COLORS[1] },
      { name: 'Expedia', count: 204, pct: 15, conversion: 35, color: COLORS[2] },
      { name: 'Google', count: 204, pct: 15, conversion: 31, color: COLORS[3] },
      { name: 'Travel Agent', count: 136, pct: 10, conversion: 48, color: COLORS[4] },
    ]
  }
  // philanthropy / CSR
  return [
    { name: 'Referral', count: 175, pct: 35, conversion: 45, color: COLORS[0] },
    { name: 'Website', count: 125, pct: 25, conversion: 32, color: COLORS[1] },
    { name: 'Events', count: 100, pct: 20, conversion: 28, color: COLORS[2] },
    { name: 'Social Media', count: 60, pct: 12, conversion: 18, color: COLORS[3] },
    { name: 'Direct', count: 40, pct: 8, conversion: 52, color: COLORS[4] },
  ]
}

export function LeadSourceCard({ industry, themeKey }: { industry: string; themeKey: string }) {
  const sources = useMemo(() => getSources(industry), [industry])
  const total = useMemo(() => sources.reduce((s, src) => s + src.count, 0), [sources])

  const pieData = useMemo(() => sources.map(s => ({
    name: s.name,
    value: s.count,
  })), [sources])

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '16px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <PieIcon size={15} color="var(--txt2)" />
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {industry === 'hospitality' ? 'Booking Sources' : industry === 'realestate' ? 'Lead Sources' : 'Contact Sources'}
        </span>
      </div>

      {/* Content: donut + table */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        padding: '16px 20px',
      }}>
        {/* Donut chart */}
        <div style={{ width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={sources[i].color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: 'var(--shadow-sm)',
                  fontFamily: 'inherit',
                }}
                formatter={(value, name) => {
                  const n = typeof value === 'number' ? value : 0
                  return [`${n} (${((n / total) * 100).toFixed(0)}%)`, String(name)]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 50px 40px 50px',
            gap: 4, padding: '0 0 6px 0',
            borderBottom: '1px solid var(--border)',
            marginBottom: 4,
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Source</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Count</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>%</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Conv.</span>
          </div>

          {/* Source rows */}
          {sources.map((src) => (
            <div key={src.name} style={{
              display: 'grid', gridTemplateColumns: '1fr 50px 40px 50px',
              gap: 4, padding: '5px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: src.color, flexShrink: 0,
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {src.name}
                </span>
              </div>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt)', textAlign: 'right' }}>
                {src.count}
              </span>
              <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt2)', textAlign: 'right' }}>
                {src.pct}%
              </span>
              <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--g-txt)', textAlign: 'right' }}>
                {src.conversion}%
              </span>
            </div>
          ))}

          {/* Totals */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 50px 40px 50px',
            gap: 4, padding: '6px 0 0 0',
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--txt)' }}>Total</span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt)', textAlign: 'right' }}>
              {total.toLocaleString('nl-NL')}
            </span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt2)', textAlign: 'right' }}>
              100%
            </span>
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}
