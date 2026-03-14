'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { useMetaAds } from '@/hooks/useMetaAds'
import { getCplStatus } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  LayoutDashboard, GitBranch, Film,
  Wallet, Users, Target, MousePointerClick,
  BarChart3, Megaphone, AlertCircle, CheckCircle2,
  Clock, Layers, Tag,
} from 'lucide-react'

const FUNNEL_COLORS = ['#079455', '#1650DC', '#DC4A11', '#B54708', '#C01048', '#96A0B5']

const cplColorMap: Record<string, string> = {
  goed: 'var(--g-txt)', ok: 'var(--o-txt)', testfase: 'var(--txt3)', slecht: 'var(--r-txt)',
}

type Tab = 'overzicht' | 'per-funnel' | 'content-analyse'

function getFunnelStatus(cpl: number, ctr: number, spend: number): 'goed' | 'ok' | 'slecht' {
  if (spend < 50) return 'ok'
  if (cpl < 20 && ctr > 1) return 'goed'
  if (cpl < 20 || ctr > 1) return 'ok'
  return 'slecht'
}

function getContentStatus(cpl: number, ctr: number): 'goed' | 'slecht' {
  return (cpl < 20 && ctr > 1) ? 'goed' : 'slecht'
}

const tabConfig: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overzicht', label: 'Overzicht', icon: <LayoutDashboard size={14} /> },
  { key: 'per-funnel', label: 'Per funnel', icon: <GitBranch size={14} /> },
  { key: 'content-analyse', label: 'Content analyse', icon: <Film size={14} /> },
]

export default function MetaAdsPage() {
  const { theme } = useTheme()
  const { data, loading } = useMetaAds('NL')
  const [tab, setTab] = useState<Tab>('overzicht')

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#5D6D82' : '#96A0B5'
  const oColor = theme === 'dark' ? '#FF7A45' : '#DC4A11'
  const bColor = theme === 'dark' ? '#5EAAFF' : '#1650DC'

  // Compute funnel split from campaign data
  const funnelSplit = useMemo(() => {
    if (!data) return []
    const topCampaigns = [...data.campaigns]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)
    const topSpend = topCampaigns.reduce((s, c) => s + c.spend, 0)
    const overig = data.totals.spend - topSpend
    const entries = topCampaigns.map((c, i) => ({
      name: `${c.funnel} ${c.name.split('—')[0]?.trim() || c.name}`.substring(0, 20),
      value: c.spend,
      color: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    }))
    if (overig > 0) entries.push({ name: 'Overig', value: overig, color: '#96A0B5' })
    return entries
  }, [data])

  // Chart data mapped from daily stats
  const chartData = useMemo(() =>
    (data?.daily || []).map(d => ({ d: d.label, spend: d.spend, leads: d.leads })),
    [data],
  )

  // Per-funnel aggregation
  const funnelData = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { funnel: string; spend: number; leads: number; clicks: number; impressions: number }>()
    for (const c of data.campaigns) {
      const key = c.funnel || 'Onbekend'
      const entry = map.get(key) || { funnel: key, spend: 0, leads: 0, clicks: 0, impressions: 0 }
      entry.spend += c.spend
      entry.leads += c.leads
      entry.clicks += c.clicks
      entry.impressions += c.impressions
      map.set(key, entry)
    }
    return [...map.values()]
      .map(f => ({
        ...f,
        cpl: f.leads > 0 ? f.spend / f.leads : 0,
        ctr: f.impressions > 0 ? (f.clicks / f.impressions) * 100 : 0,
      }))
      .sort((a, b) => a.funnel.localeCompare(b.funnel))
  }, [data])

  // Content analyse: campaigns sorted by spend desc
  const contentData = useMemo(() => {
    if (!data) return []
    return [...data.campaigns].sort((a, b) => b.spend - a.spend)
  }, [data])

  if (!data) return null

  const { totals, campaigns } = data

  return (
    <>
      <Topbar title="Meta Ads" sub="Campagne-overzicht en prestaties" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* Tab bar — pill style */}
        <div style={{
          display: 'inline-flex', gap: 4, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4, marginBottom: 18,
        }}>
          {tabConfig.map(t => {
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                background: isActive ? 'var(--panel)' : 'transparent',
                color: isActive ? 'var(--txt)' : 'var(--txt3)',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' : 'none',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <span style={{ display: 'flex', opacity: isActive ? 1 : 0.6 }}>{t.icon}</span>
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ─── OVERZICHT TAB ─── */}
        {tab === 'overzicht' && (
          <>
            {/* KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
              <KpiCard label="Totale spend" value={`€${totals.spend.toLocaleString('nl-NL')}`} delta="Deze maand" deltaDir="neu" accentColor="var(--o)" delay={80} />
              <KpiCard label="Totale leads" value={totals.leads} delta={`${campaigns.length} campagnes actief`} deltaDir="neu" accentColor="var(--b)" delay={130} />
              <KpiCard label="Gemiddelde CPL" value={`€${totals.avgCpl}`} delta={totals.avgCpl < 20 ? 'Onder doel' : 'Boven doel'} deltaDir={totals.avgCpl < 20 ? 'up' : 'down'} goal="Doel < €20" accentColor="var(--g)" delay={180} />
              <KpiCard label="Gemiddelde CTR" value={`${totals.avgCtr}%`} delta="Alle campagnes" deltaDir="neu" delay={230} />
              <KpiCard label="Vertoningen" value={`${(totals.impressions / 1000).toFixed(0)}K`} delta={`${totals.clicks.toLocaleString('nl-NL')} klikken`} deltaDir="neu" delay={280} />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              {/* Daily spend + leads */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                    <BarChart3 size={15} style={{ color: 'var(--o)' }} />
                    Dagelijkse spend en leads
                  </div>
                </div>
                <div style={{ padding: 16, height: 200 }} key={`spend-${theme}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="spend" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
                      <YAxis yAxisId="leads" orientation="right" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar yAxisId="spend" dataKey="spend" fill={oColor} radius={[3, 3, 0, 0]} opacity={0.6} name="Spend" />
                      <Bar yAxisId="leads" dataKey="leads" fill={bColor} radius={[3, 3, 0, 0]} opacity={0.8} name="Leads" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Budget verdeling */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                    <Layers size={15} style={{ color: 'var(--b)' }} />
                    Budgetverdeling per funnel
                  </div>
                </div>
                <div style={{ padding: 16, height: 200, display: 'flex', alignItems: 'center' }} key={`pie-${theme}`}>
                  <div style={{ width: '45%', height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={funnelSplit} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                          {funnelSplit.map((entry, i) => (
                            <Cell key={i} fill={entry.color} opacity={0.85} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`€${Number(v).toLocaleString('nl-NL')}`, 'Spend']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {funnelSplit.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: f.color, flexShrink: 0 }} />
                        <span style={{ color: 'var(--txt2)', flex: 1 }}>{f.name}</span>
                        <span className="mono" style={{ color: 'var(--txt)', fontWeight: 600 }}>€{f.value.toLocaleString('nl-NL')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign table */}
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                  <Megaphone size={15} style={{ color: 'var(--o)' }} />
                  Alle campagnes
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Campagne', 'Funnel', 'Status', 'Budget', 'Spend', 'Vertoningen', 'Klikken', 'CTR', 'CPL', 'Leads'].map(h => (
                        <th key={h} style={{
                          textAlign: 'left', padding: '9px 12px', fontSize: 10.5, fontWeight: 600,
                          textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
                          borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c, i) => {
                      const status = getCplStatus(c.cpl || 0, c.spend)
                      return (
                        <tr key={c.id || i}>
                          <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>{c.name}</td>
                          <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}><StatusBadge status="muted" label={c.funnel} /></td>
                          <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                            <StatusBadge status={status} label={status.charAt(0).toUpperCase() + status.slice(1)} />
                          </td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>€{c.budget.toLocaleString('nl-NL')}</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--o-txt)' }}>€{c.spend.toLocaleString('nl-NL')}</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.impressions.toLocaleString('nl-NL')}</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.clicks.toLocaleString('nl-NL')}</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[status] }}>{c.ctr.toFixed(1)}%</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[status] }}>{c.cpl !== null ? `€${c.cpl}` : '—'}</td>
                          <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{c.leads}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ─── PER FUNNEL TAB ─── */}
        {tab === 'per-funnel' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {funnelData.map(f => {
              const status = getFunnelStatus(f.cpl, f.ctr, f.spend)
              const statusLabel = status === 'goed' ? 'Goed' : status === 'ok' ? 'Matig' : 'Slecht'
              const borderLeft = status === 'goed' ? 'var(--g)' : status === 'ok' ? 'var(--o)' : 'var(--r)'
              const StatusIcon = status === 'goed' ? CheckCircle2 : status === 'ok' ? Clock : AlertCircle
              const statusIconColor = status === 'goed' ? 'var(--g)' : status === 'ok' ? 'var(--o)' : 'var(--r)'
              return (
                <div key={f.funnel} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
                  overflow: 'hidden', boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${borderLeft}`,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 15px', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--txt)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusIcon size={16} style={{ color: statusIconColor }} />
                      {f.funnel}
                    </div>
                    <StatusBadge status={status} label={statusLabel} dot />
                  </div>
                  <div style={{ padding: '14px 15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Wallet size={11} style={{ opacity: 0.6 }} /> Spend
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--o-txt)' }}>€{f.spend.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={11} style={{ opacity: 0.6 }} /> Leads
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{f.leads}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={11} style={{ opacity: 0.6 }} /> CPL
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: f.cpl < 20 ? 'var(--g-txt)' : 'var(--r-txt)' }}>
                        {f.leads > 0 ? `€${f.cpl.toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MousePointerClick size={11} style={{ opacity: 0.6 }} /> CTR
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: f.ctr > 1 ? 'var(--g-txt)' : 'var(--r-txt)' }}>
                        {f.ctr.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── CONTENT ANALYSE TAB ─── */}
        {tab === 'content-analyse' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {contentData.map((c, i) => {
              const isTestfase = c.spend < 50
              const status = isTestfase ? 'testfase' : getContentStatus(c.cpl || 0, c.ctr)
              const statusLabel = isTestfase ? 'Testfase' : status === 'goed' ? 'Succesvol' : 'Niet succesvol'
              const CardIcon = isTestfase ? Clock : status === 'goed' ? CheckCircle2 : AlertCircle
              const cardIconColor = isTestfase ? 'var(--txt3)' : status === 'goed' ? 'var(--g)' : 'var(--r)'

              return (
                <div key={c.id || i} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12,
                  overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
                  opacity: isTestfase ? 0.6 : 1,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 15px', borderBottom: '1px solid var(--border)',
                    gap: 8,
                  }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, letterSpacing: '-0.01em', color: isTestfase ? 'var(--txt3)' : 'var(--txt)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                      <CardIcon size={15} style={{ color: cardIconColor, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    </div>
                    <StatusBadge status={status} label={statusLabel} dot />
                  </div>
                  <div style={{ padding: '14px 15px' }}>
                    {isTestfase ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11.5, color: 'var(--txt3)' }}>Onvoldoende data voor analyse</span>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--txt3)' }}>€{c.spend.toLocaleString('nl-NL')}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Wallet size={11} style={{ opacity: 0.6 }} /> Spend
                          </div>
                          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--o-txt)' }}>€{c.spend.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Users size={11} style={{ opacity: 0.6 }} /> Leads
                          </div>
                          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{c.leads}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Target size={11} style={{ opacity: 0.6 }} /> CPL
                          </div>
                          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: (c.cpl || 0) < 20 ? 'var(--g-txt)' : 'var(--r-txt)' }}>
                            {c.cpl !== null ? `€${c.cpl}` : '—'}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MousePointerClick size={11} style={{ opacity: 0.6 }} /> CTR
                          </div>
                          <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: c.ctr > 1 ? 'var(--g-txt)' : 'var(--r-txt)' }}>
                            {c.ctr.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isTestfase && c.funnel && (
                    <div style={{ padding: '0 15px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Tag size={11} style={{ color: 'var(--txt3)' }} />
                      <StatusBadge status="muted" label={c.funnel} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
