'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { ApiErrorBanner } from '@/components/ui/ApiErrorBanner'
import { useGoogleAds } from '@/hooks/useGoogleAds'
import type { Market } from '@/lib/types'
import {
  Globe, Search, BarChart3, Target, MousePointerClick,
  TrendingUp, TrendingDown, Eye,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'

const cpaColor = (status: string) => {
  const map: Record<string, string> = { goed: 'var(--g-txt)', ok: 'var(--o-txt)', testfase: 'var(--txt3)', slecht: 'var(--r-txt)' }
  return map[status] || 'var(--txt2)'
}

const tabIcons = {
  campagnes: Globe,
  zoekwoorden: Search,
} as const

export default function GoogleAdsPage() {
  const { theme } = useTheme()
  const [tab, setTab] = useState<'campagnes' | 'zoekwoorden'>('campagnes')
  const [market] = useState<Market>('NL')
  const { data, error } = useGoogleAds(market)

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#5D6D82' : '#96A0B5'
  const bColor = theme === 'dark' ? '#5EAAFF' : '#1650DC'
  const gColor = theme === 'dark' ? '#22DD80' : '#079455'

  const chartData = useMemo(() =>
    (data?.daily || []).map(d => ({ d: d.label, spend: d.spend, conversions: d.conversions })),
    [data],
  )

  if (!data) {
    return (
      <>
        <Topbar title="Google Ads" sub="Zoekwoorden, display en Performance Max" />
        <div style={{ padding: '18px 22px 40px' }}>
          {error && <ApiErrorBanner errors={[error]} />}
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)', fontSize: 13 }}>
            Geen data beschikbaar
          </div>
        </div>
      </>
    )
  }

  const { totals, campaigns, keywords } = data

  return (
    <>
      <Topbar title="Google Ads" sub="Zoekwoorden, display en Performance Max" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Totale spend" value={`\u20AC${totals.spend.toLocaleString('nl-NL')}`} delta="Deze maand" deltaDir="neu" accentColor="var(--b)" icon="dollar-sign" delay={80} />
          <KpiCard label="Conversies" value={totals.conversions} delta={`${campaigns.length} campagnes`} deltaDir="neu" accentColor="var(--g)" icon="target" delay={130} />
          <KpiCard label="Gemiddelde CPA" value={`\u20AC${totals.avgCpa}`} delta={totals.avgCpa < 25 ? 'Onder doel' : 'Boven doel'} deltaDir={totals.avgCpa < 25 ? 'up' : 'down'} goal="Doel < \u20AC25" icon="trending-down" delay={180} />
          <KpiCard label="Gemiddelde CTR" value={`${totals.avgCtr}%`} delta="Alle campagnes" deltaDir="neu" icon="trending-up" delay={230} />
          <KpiCard label="Totale klikken" value={totals.clicks.toLocaleString('nl-NL')} delta={`${(totals.impressions / 1000).toFixed(0)}K vertoningen`} deltaDir="neu" icon="zap" delay={280} />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Spend chart */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--b-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BarChart3 size={14} color="var(--b-txt)" />
                </div>
                Dagelijkse spend
              </div>
            </div>
            <div style={{ padding: 16, height: 200 }} key={`gspend-${theme}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={bColor} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={bColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `\u20AC${v}`} />
                  <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`\u20AC${v}`, 'Spend']} />
                  <Area type="monotone" dataKey="spend" stroke={bColor} strokeWidth={2} fill="url(#bGrad)" dot={{ r: 3, fill: bColor }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversions chart */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: 'var(--g-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Target size={14} color="var(--g-txt)" />
                </div>
                Conversies per dag
              </div>
            </div>
            <div style={{ padding: 16, height: 200 }} key={`gconv-${theme}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="conversions" fill={gColor} radius={[3, 3, 0, 0]} opacity={theme === 'dark' ? 0.8 : 0.7} name="Conversies" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pill-style tab toggle */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4, width: 'fit-content', marginBottom: 12,
        }}>
          {(['campagnes', 'zoekwoorden'] as const).map(t => {
            const TabIcon = tabIcons[t]
            const isActive = tab === t
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                background: isActive ? 'var(--panel)' : 'transparent',
                color: isActive ? 'var(--txt)' : 'var(--txt3)',
                boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
                textTransform: 'capitalize',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.2s ease',
              }}>
                <TabIcon size={13} />
                {t}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {tab === 'campagnes' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Campagne', 'Type', 'Status', 'Spend', 'Vertoningen', 'Klikken', 'CTR', 'CPC', 'Conversies', 'CPA'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 14px', fontSize: 10.5, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
                        borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={c.id || i} style={{ transition: 'background 0.15s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><StatusBadge status="muted" label={c.type} /></td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><StatusBadge status={c.status} label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} dot /></td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--o-txt)' }}>{'\u20AC'}{c.spend.toLocaleString('nl-NL')}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.impressions.toLocaleString('nl-NL')}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.clicks.toLocaleString('nl-NL')}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: cpaColor(c.status) }}>{c.ctr.toFixed(1)}%</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{'\u20AC'}{c.cpc.toFixed(2)}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.conversions}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: cpaColor(c.status) }}>{c.cpa !== null ? `\u20AC${c.cpa}` : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Zoekwoord', 'Klikken', 'CPC', 'Conversies', 'CPA'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 14px', fontSize: 10.5, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
                        borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((k, i) => (
                    <tr key={i} style={{ transition: 'background 0.15s ease' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Search size={12} color="var(--txt3)" />
                        {k.keyword}
                      </td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{k.clicks}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{'\u20AC'}{k.cpc.toFixed(2)}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{k.conversions}</td>
                      <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--g-txt)' }}>{k.cpa !== null ? `\u20AC${k.cpa}` : '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
