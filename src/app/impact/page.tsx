'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SDG_GOALS: { id: number; name: string; color: string }[] = [
  { id: 1, name: 'No Poverty', color: '#E5243B' },
  { id: 2, name: 'Zero Hunger', color: '#DDA63A' },
  { id: 3, name: 'Good Health', color: '#4C9F38' },
  { id: 4, name: 'Quality Education', color: '#C5192D' },
  { id: 5, name: 'Gender Equality', color: '#FF3A21' },
  { id: 6, name: 'Clean Water', color: '#26BDE2' },
  { id: 7, name: 'Affordable Energy', color: '#FCC30B' },
  { id: 8, name: 'Decent Work', color: '#A21942' },
  { id: 9, name: 'Industry & Innovation', color: '#FD6925' },
  { id: 10, name: 'Reduced Inequalities', color: '#DD1367' },
  { id: 11, name: 'Sustainable Cities', color: '#FD9D24' },
  { id: 12, name: 'Responsible Consumption', color: '#BF8B2E' },
  { id: 13, name: 'Climate Action', color: '#3F7E44' },
  { id: 14, name: 'Life Below Water', color: '#0A97D9' },
  { id: 15, name: 'Life on Land', color: '#56C02B' },
  { id: 16, name: 'Peace & Justice', color: '#00689D' },
  { id: 17, name: 'Partnerships', color: '#19486A' },
]

const ACTIVE_SDGS = new Set([1, 2, 3, 4, 6, 7, 10, 11, 13, 14, 15, 17])

interface ProjectImpact {
  project: string
  co2Kg: number
  peopleHelped: number
  trees: number
  donated: number
}

const PROJECT_IMPACT: ProjectImpact[] = [
  { project: 'Urban Reforestation Amsterdam', co2Kg: 1200, peopleHelped: 85, trees: 1800, donated: 42000 },
  { project: 'Clean Water Access Kenya', co2Kg: 340, peopleHelped: 520, trees: 0, donated: 112500 },
  { project: 'Tech Education for Youth', co2Kg: 80, peopleHelped: 310, trees: 0, donated: 70400 },
  { project: 'Renewable Energy Transition', co2Kg: 2400, peopleHelped: 45, trees: 0, donated: 75000 },
  { project: 'Food Bank Partnership', co2Kg: 150, peopleHelped: 95, trees: 0, donated: 43200 },
  { project: 'Ocean Plastic Cleanup', co2Kg: 380, peopleHelped: 45, trees: 540, donated: 54000 },
]

const TREND_DATA = [
  { month: 'Sep', co2: 280, people: 60, trees: 150 },
  { month: 'Oct', co2: 420, people: 95, trees: 320 },
  { month: 'Nov', co2: 610, people: 180, trees: 540 },
  { month: 'Dec', co2: 850, people: 290, trees: 780 },
  { month: 'Jan', co2: 1100, people: 440, trees: 1050 },
  { month: 'Feb', co2: 1450, people: 620, trees: 1400 },
  { month: 'Mar', co2: 1800, people: 780, trees: 1800 },
  { month: 'Apr', co2: 2200, people: 880, trees: 2100 },
  { month: 'May', co2: 2900, people: 960, trees: 2340 },
  { month: 'Jun', co2: 3400, people: 1020, trees: 2340 },
  { month: 'Jul', co2: 3900, people: 1060, trees: 2340 },
  { month: 'Aug', co2: 4500, people: 1100, trees: 2340 },
]

export default function ImpactPage() {
  const totals = PROJECT_IMPACT.reduce(
    (acc, p) => ({
      co2Kg: acc.co2Kg + p.co2Kg,
      peopleHelped: acc.peopleHelped + p.peopleHelped,
      trees: acc.trees + p.trees,
      donated: acc.donated + p.donated,
    }),
    { co2Kg: 0, peopleHelped: 0, trees: 0, donated: 0 }
  )

  return (
    <>
      <Topbar title="Impact" sub="Measure what matters" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="CO2 Reduced" value="4.5t" delta="+18% vs last quarter" deltaDir="up" icon="leaf" accentColor="var(--g)" delay={80} />
          <KpiCard label="People Helped" value="1,100" delta="+240 this month" deltaDir="up" icon="users" accentColor="var(--accent)" delay={130} />
          <KpiCard label="Trees Planted" value="2,340" delta="On track for 3K goal" deltaDir="up" icon="tree" accentColor="var(--g)" delay={180} />
          <KpiCard label="Water Saved" value="45kL" delta="+12% vs target" deltaDir="up" icon="water" accentColor="var(--b)" delay={230} />
          <KpiCard label="Energy Saved" value="890 MWh" delta="Renewable transition" deltaDir="neu" icon="zap" accentColor="var(--o)" delay={280} />
        </div>

        {/* SDG Alignment */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px', marginBottom: 14,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>SDG Alignment</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {SDG_GOALS.map(sdg => {
              const active = ACTIVE_SDGS.has(sdg.id)
              return (
                <div key={sdg.id} style={{
                  borderRadius: 8, padding: '10px 8px',
                  background: active ? sdg.color : 'var(--bg2)',
                  opacity: active ? 1 : 0.35,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'default',
                  transition: 'opacity 200ms ease, transform 150ms ease',
                }}>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: active ? '#fff' : 'var(--txt3)',
                  }}>{sdg.id}</div>
                  <div style={{
                    fontSize: 9, fontWeight: 600, textAlign: 'center', lineHeight: 1.2,
                    color: active ? 'rgba(255,255,255,0.9)' : 'var(--txt3)',
                  }}>{sdg.name}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Impact by Project table + Trend chart side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Table */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 600 }}>Impact by Project</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Project', 'CO2 (kg)', 'People', 'Trees', 'Donated'].map(h => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: h === 'Project' ? 'left' : 'right',
                      fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                      color: 'var(--txt3)', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROJECT_IMPACT.map(p => (
                  <tr key={p.project} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.project}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.co2Kg.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.peopleHelped.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>{p.trees.toLocaleString()}</td>
                    <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right' }}>${(p.donated / 1000).toFixed(1)}K</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: 'var(--bg2)' }}>
                  <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>Total</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.co2Kg.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.peopleHelped.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>{totals.trees.toLocaleString()}</td>
                  <td className="mono" style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>${(totals.donated / 1000).toFixed(1)}K</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Trend Chart */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-sm)',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Impact Trend (12 months)</div>
            <div style={{ flex: 1, minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TREND_DATA} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCO2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D7377" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0D7377" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradTrees" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#56C02B" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#56C02B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--txt3)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow)',
                    }}
                  />
                  <Area type="monotone" dataKey="co2" name="CO2 (kg)" stroke="#059669" fill="url(#gradCO2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="people" name="People Helped" stroke="#0D7377" fill="url(#gradPeople)" strokeWidth={2} />
                  <Area type="monotone" dataKey="trees" name="Trees Planted" stroke="#56C02B" fill="url(#gradTrees)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
