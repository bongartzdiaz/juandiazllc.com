'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { MetaDailyStats, GhlDailyStats } from '@/lib/types'

const FALLBACK_CPL = [
  { d: '1/3', cpl: 28 }, { d: '2/3', cpl: 25 }, { d: '3/3', cpl: 22 },
  { d: '4/3', cpl: 26 }, { d: '5/3', cpl: 20 }, { d: '6/3', cpl: 19 },
  { d: '7/3', cpl: 18 }, { d: '8/3', cpl: 21 }, { d: '9/3', cpl: 17 },
  { d: '10/3', cpl: 16 }, { d: '11/3', cpl: 18 }, { d: '12/3', cpl: 15 },
  { d: '13/3', cpl: 14 }, { d: '14/3', cpl: 14 },
]

const FALLBACK_LEADS = [
  { d: '1/3', leads: 22 }, { d: '2/3', leads: 31 }, { d: '3/3', leads: 28 },
  { d: '4/3', leads: 35 }, { d: '5/3', leads: 41 }, { d: '6/3', leads: 38 },
  { d: '7/3', leads: 44 }, { d: '8/3', leads: 39 }, { d: '9/3', leads: 48 },
  { d: '10/3', leads: 52 }, { d: '11/3', leads: 47 }, { d: '12/3', leads: 56 },
  { d: '13/3', leads: 51 }, { d: '14/3', leads: 47 },
]

interface Props {
  dailyMeta?: MetaDailyStats[]
  dailySales?: GhlDailyStats[]
}

export function ChartsSection({ dailyMeta, dailySales }: Props) {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#7A8DA3' : '#96A0B5'
  const oColor = theme === 'dark' ? '#FF7A45' : '#DC4A11'
  const gColor = theme === 'dark' ? '#22DD80' : '#079455'

  // Build CPL chart data from real Meta daily stats
  const cplData = dailyMeta && dailyMeta.length > 0
    ? dailyMeta.map(d => ({
        d: d.label,
        cpl: d.leads > 0 ? Math.round(d.spend / d.leads) : 0,
      }))
    : FALLBACK_CPL

  // Build leads chart data from real GHL daily stats
  const leadsData = dailySales && dailySales.length > 0
    ? dailySales.map(d => ({ d: d.label, leads: d.leads }))
    : FALLBACK_LEADS

  // Calculate week-over-week change for leads
  const recentLeads = leadsData.slice(-7).reduce((s, d) => s + d.leads, 0)
  const prevLeads = leadsData.slice(-14, -7).reduce((s, d) => s + d.leads, 0)
  const leadsDelta = prevLeads > 0 ? Math.round(((recentLeads - prevLeads) / prevLeads) * 100) : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
      {/* CPL Trend */}
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
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--o)' }} />
            CPL-trend — {cplData.length} dagen
          </div>
        </div>
        <div style={{ padding: 16, height: 200 }} key={`cpl-${theme}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cplData}>
              <defs>
                <linearGradient id="oGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={oColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={oColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: tickColor }}
                formatter={(v) => [`€${v}`, 'CPL']}
              />
              <Area type="monotone" dataKey="cpl" stroke={oColor} strokeWidth={2} fill="url(#oGrad)" dot={{ r: 3, fill: oColor }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leads per dag */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        animation: 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.35s both',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 15px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--g)' }} />
            Leads per dag
          </div>
          {leadsDelta !== 0 && (
            <StatusBadge
              status={leadsDelta > 0 ? 'goed' : 'slecht'}
              label={`${leadsDelta > 0 ? '+' : ''}${leadsDelta}% vs vorige week`}
            />
          )}
        </div>
        <div style={{ padding: 16, height: 200 }} key={`leads-${theme}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: tickColor }}
                formatter={(v) => [v, 'Leads']}
              />
              <Bar dataKey="leads" fill={gColor} radius={[4, 4, 0, 0]} opacity={theme === 'dark' ? 0.8 : 0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
