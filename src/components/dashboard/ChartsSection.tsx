'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { MetaDailyStats, GhlDailyStats } from '@/lib/types'

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
  const cplData = (dailyMeta || []).map(d => ({
    d: d.label,
    cpl: d.leads > 0 ? Math.round(d.spend / d.leads) : 0,
  }))

  // Build leads chart data from real GHL daily stats
  const leadsData = (dailySales || []).map(d => ({ d: d.label, leads: d.leads }))

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
          {cplData.length > 0 ? (
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
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--txt3)', fontSize: 12 }}>
              Geen CPL data beschikbaar
            </div>
          )}
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
          {leadsData.length > 0 ? (
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
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--txt3)', fontSize: 12 }}>
              Geen leads data beschikbaar
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
