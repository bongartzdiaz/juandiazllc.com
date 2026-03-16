'use client'

import { useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { ApiErrorBanner } from '@/components/ui/ApiErrorBanner'
import { useChatbot } from '@/hooks/useChatbot'
import type { ChatStatus, ChatConversation } from '@/lib/types'
import {
  MessageSquare, Clock, CheckCircle, AlertCircle,
  ArrowRightLeft, Users,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts'

const chatStatusStyles: Record<string, string> = {
  gekwalificeerd: 'goed',
  wachtend: 'testfase',
  handoff: 'ok',
  afgerond: 'muted',
  afgevallen: 'slecht',
}

const statusBorderColors: Record<string, string> = {
  gekwalificeerd: 'var(--g)',
  wachtend: 'var(--y)',
  handoff: 'var(--o, var(--b))',
  afgerond: 'var(--border)',
  afgevallen: 'var(--r)',
}

const statusIcons: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  gekwalificeerd: CheckCircle,
  wachtend: Clock,
  handoff: ArrowRightLeft,
  afgerond: CheckCircle,
  afgevallen: AlertCircle,
}

type Period = 'dag' | 'week' | 'maand'

function getDateRange(period: Period): string {
  const now = new Date()
  if (period === 'dag') {
    return now.toISOString().slice(0, 10)
  }
  if (period === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    return weekAgo.toISOString().slice(0, 10)
  }
  // maand
  const monthAgo = new Date(now)
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  return monthAgo.toISOString().slice(0, 10)
}

function filterByPeriod(conversations: ChatConversation[], period: Period): ChatConversation[] {
  const cutoff = getDateRange(period)
  return conversations.filter(c => {
    if (!c.datum) return true // No date = include (legacy)
    return c.datum >= cutoff
  })
}

const periodLabels: Record<Period, string> = {
  dag: 'Vandaag',
  week: 'Deze week',
  maand: 'Deze maand',
}

export default function ChatbotPage() {
  const { theme } = useTheme()
  const { data, error } = useChatbot()
  const [period, setPeriod] = useState<Period>('maand')

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#5D6D82' : '#96A0B5'
  const gColor = theme === 'dark' ? '#22DD80' : '#079455'
  const bColor = theme === 'dark' ? '#5EAAFF' : '#1650DC'
  const yColor = theme === 'dark' ? '#F5C040' : '#B54708'

  // Filter conversations by period
  const filtered = useMemo(() => {
    if (!data?.conversations) return []
    return filterByPeriod(data.conversations, period)
  }, [data, period])

  // Recalculate totals based on filtered data
  const totals = useMemo(() => {
    const gesprekken = filtered.length
    const gekwalificeerd = filtered.filter(c => c.status === 'gekwalificeerd').length
    const wachtend = filtered.filter(c => c.status === 'wachtend' || c.status === 'handoff').length
    return {
      gesprekken,
      gekwalificeerd,
      conversieRate: gesprekken > 0 ? Math.round((gekwalificeerd / gesprekken) * 100) : 0,
      gemReactietijd: data?.totals?.gemReactietijd ?? 0,
      wachtendOpHandoff: wachtend,
    }
  }, [filtered, data])

  // Filter daily chart data by period
  const dailyChartData = useMemo(() => {
    if (!data?.daily) return []
    const cutoff = getDateRange(period)
    return data.daily
      .filter(d => d.date >= cutoff)
      .map(d => ({ d: d.label, gesprekken: d.gesprekken, gekwalificeerd: d.gekwalificeerd }))
  }, [data, period])

  const responseChartData = useMemo(() => {
    if (!data?.responseTime) return []
    const cutoff = getDateRange(period)
    return data.responseTime
      .filter(d => d.date >= cutoff)
      .map(d => ({ d: d.label, sec: d.sec }))
  }, [data, period])

  if (!data) {
    return (
      <>
        <Topbar title="Chatbot" sub="WhatsApp-gesprekken en kwalificatie" />
        <div style={{ padding: '18px 22px 40px' }}>
          {error && <ApiErrorBanner errors={[error]} />}
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--txt3)', fontSize: 13 }}>
            Geen data beschikbaar
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Chatbot" sub="WhatsApp-gesprekken en kwalificatie" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* Period toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--txt2)' }}>
            {periodLabels[period]} — {totals.gesprekken} gesprekken
          </div>
          <div style={{
            display: 'inline-flex', gap: 0, borderRadius: 8, overflow: 'hidden',
            border: '1px solid var(--border)',
          }}>
            {(['dag', 'week', 'maand'] as Period[]).map((p, i) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 14px',
                  fontSize: 11.5,
                  fontWeight: period === p ? 600 : 400,
                  letterSpacing: '0.02em',
                  background: period === p ? 'var(--b-bg)' : 'var(--panel)',
                  color: period === p ? 'var(--b-txt)' : 'var(--txt2)',
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label={`Gesprekken ${periodLabels[period].toLowerCase()}`} value={totals.gesprekken} delta={`${period === 'maand' ? 'Totaal deze maand' : period === 'week' ? 'Laatste 7 dagen' : 'Vandaag'}`} deltaDir="up" accentColor="var(--b)" icon="message-circle" delay={80} />
          <KpiCard label="Gekwalificeerde leads" value={totals.gekwalificeerd} delta={`${totals.conversieRate}% conversie`} deltaDir="up" accentColor="var(--g)" icon="users" delay={130} />
          <KpiCard label="Conversiepercentage" value={`${totals.conversieRate}%`} delta={totals.conversieRate >= 35 ? 'Boven doel' : 'Onder doel'} deltaDir={totals.conversieRate >= 35 ? 'up' : 'down'} goal="Doel > 35%" icon="zap" delay={180} />
          <KpiCard label="Gem. reactietijd" value={`${totals.gemReactietijd}s`} delta="Verbeterd" deltaDir="up" goal="Doel < 3s" icon="calendar" delay={230} />
          <KpiCard label="Wachtend op handoff" value={totals.wachtendOpHandoff} delta="Actie vereist" deltaDir={totals.wachtendOpHandoff > 3 ? 'down' : 'neu'} hot={totals.wachtendOpHandoff > 3} icon="trending-down" delay={280} />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Gesprekken per dag */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--b-bg, var(--bg2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageSquare size={14} style={{ color: bColor }} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
                Gesprekken per dag
              </div>
            </div>
            <div style={{ padding: 16, height: 200 }} key={`chats-${theme}-${period}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="gesprekken" fill={bColor} radius={[3, 3, 0, 0]} opacity={0.5} name="Totaal" />
                  <Bar dataKey="gekwalificeerd" fill={gColor} radius={[3, 3, 0, 0]} opacity={0.85} name="Gekwalificeerd" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reactietijd trend */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--y-bg, var(--bg2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Clock size={14} style={{ color: yColor }} />
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>
                Gemiddelde reactietijd
              </div>
            </div>
            <div style={{ padding: 16, height: 200 }} key={`resp-${theme}-${period}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responseChartData}>
                  <defs>
                    <linearGradient id="yGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={yColor} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={yColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}s`} domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v}s`, 'Reactietijd']} />
                  <Area type="monotone" dataKey="sec" stroke={yColor} strokeWidth={2} fill="url(#yGrad)" dot={{ r: 3, fill: yColor }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent chats table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: 'var(--g-bg, var(--bg2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={14} style={{ color: gColor }} />
              </div>
              Gesprekken ({filtered.length})
            </div>
            <StatusBadge status="goed" label={`${totals.gekwalificeerd} gekwalificeerd`} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Naam', 'Status', 'Onderwerp', 'Berichten', 'Kanaal', 'Datum'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const borderColor = statusBorderColors[c.status] || 'var(--border)'
                  const StatusIcon = statusIcons[c.status] || MessageSquare
                  return (
                    <tr key={c.id || i} style={{ borderLeft: `3px solid ${borderColor}` }}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <StatusIcon size={13} style={{ color: borderColor, flexShrink: 0 }} />
                          {c.naam}
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                        <StatusBadge status={chatStatusStyles[c.status] || 'muted'} label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} dot />
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--txt2)' }}>{c.onderwerp}</td>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.berichten}</td>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>{c.duur}</td>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt3)' }}>{c.datum || c.tijdstip}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
                      Geen gesprekken in deze periode
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
