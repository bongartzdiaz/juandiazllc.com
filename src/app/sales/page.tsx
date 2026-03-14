'use client'

import { useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { useSales } from '@/hooks/useSales'
import {
  Users, TrendingUp, BarChart3,
  ArrowRight, Contact,
} from 'lucide-react'
import type { GhlPipelineStep, GhlContact } from '@/lib/types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

const stageStatusMap: Record<string, string> = {
  website_lead: 'muted',
  chatbot: 'testfase',
  telefoon: 'ok',
  buitendienst: 'ok',
  sale: 'goed',
}

const stageColorMap: Record<string, string> = {
  website_lead: 'var(--b)',
  chatbot: 'var(--y, #E8B931)',
  telefoon: 'var(--o)',
  buitendienst: 'var(--o)',
  sale: 'var(--g)',
}

export default function SalesPage() {
  const { theme } = useTheme()
  const { data } = useSales()

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#5D6D82' : '#96A0B5'
  const bColor = theme === 'dark' ? '#5EAAFF' : '#1650DC'
  const gColor = theme === 'dark' ? '#22DD80' : '#079455'
  const oColor = theme === 'dark' ? '#FF7A45' : '#DC4A11'

  const chartData = useMemo(() =>
    (data?.daily || []).map(d => ({ d: d.label, leads: d.leads, afspraken: d.afspraken, deals: d.deals })),
    [data],
  )

  if (!data) return null

  const { totals, pipeline, contacts } = data

  return (
    <>
      <Topbar title="Sales (GHL)" sub="Pipeline, contacten en omzet" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Leads deze maand" value={totals.leads} delta="Totaal nieuwe leads" deltaDir="neu" accentColor="var(--b)" icon="users" delay={80} />
          <KpiCard label="Afspraken" value={totals.afspraken} delta="Telefoon + buitendienst" deltaDir="neu" accentColor="var(--o)" icon="calendar" delay={130} />
          <KpiCard label="Gesloten deals" value={totals.deals} delta={`${totals.conversieRate}% conversie`} deltaDir={totals.deals > 10 ? 'up' : 'neu'} accentColor="var(--g)" icon="trending-up" delay={180} />
          <KpiCard label="Totale omzet" value={`€${totals.omzet.toLocaleString('nl-NL')}`} delta="Deze maand" deltaDir="up" accentColor="var(--g)" icon="dollar-sign" delay={230} />
          <KpiCard label="Conversiepercentage" value={`${totals.conversieRate}%`} delta="Lead → sale" deltaDir={totals.conversieRate > 2.5 ? 'up' : 'down'} goal="Doel > 3%" accentColor="var(--b)" icon="target" delay={280} />
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Daily leads + deals */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--b-bg, rgba(22,80,220,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart3 size={12} color="var(--b)" />
                </div>
                Leads en deals per dag
              </div>
            </div>
            <div style={{ padding: 16, height: 200 }} key={`sales-${theme}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="d" tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: tickColor, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="leads" fill={bColor} radius={[3, 3, 0, 0]} opacity={0.4} name="Leads" />
                  <Bar dataKey="afspraken" fill={oColor} radius={[3, 3, 0, 0]} opacity={0.7} name="Afspraken" />
                  <Bar dataKey="deals" fill={gColor} radius={[3, 3, 0, 0]} opacity={0.9} name="Deals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pipeline funnel */}
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--g-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={12} color="var(--g-txt)" />
                </div>
                Pipeline-overzicht
              </div>
            </div>
            <div style={{ padding: '16px 16px 12px' }}>
              {/* Step indicators row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16, padding: '0 2px' }}>
                {pipeline.map((step: GhlPipelineStep, i: number) => {
                  const isLast = i === pipeline.length - 1
                  const color = stageColorMap[step.stage] || 'var(--b)'
                  return (
                    <div key={`indicator-${step.stage}`} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isLast ? 'var(--g-bg)' : 'var(--bg2)',
                        border: `2px solid ${color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
                          {step.value}
                        </span>
                      </div>
                      {!isLast && (
                        <div style={{ flex: 1, height: 2, background: 'var(--border)', margin: '0 4px', position: 'relative' }}>
                          <ArrowRight size={10} color="var(--txt3)" style={{ position: 'absolute', right: -2, top: -4 }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Bar rows */}
              {pipeline.map((step: GhlPipelineStep, i: number) => {
                const maxVal = pipeline[0]?.value || 1
                const pct = Math.round((step.value / maxVal) * 100)
                const isLast = i === pipeline.length - 1
                const color = stageColorMap[step.stage] || 'var(--b)'
                return (
                  <div key={step.stage} style={{ marginBottom: i < pipeline.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={stageStatusMap[step.stage] || 'muted'} label={step.label} dot />
                      </div>
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: isLast ? 'var(--g-txt)' : 'var(--txt)' }}>{step.value}</span>
                    </div>
                    <div style={{ height: 7, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        background: color,
                        width: `${pct}%`,
                        opacity: isLast ? 0.9 : 0.45 + (i * 0.12),
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>{step.description}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Contacts table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--o-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Contact size={12} color="var(--o-txt)" />
              </div>
              Recente contacten
            </div>
            <StatusBadge status="goed" label={`${totals.deals} deals gesloten`} />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Naam', 'Bron', 'Stage', 'Waarde', 'Aangemaakt', 'Laatste activiteit'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c: GhlContact, i: number) => (
                  <tr key={c.id || i} style={{ cursor: 'default' }}>
                    <td style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--b-bg, rgba(22,80,220,0.08))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Users size={11} color="var(--b)" />
                        </div>
                        {c.naam}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><StatusBadge status="muted" label={c.bron} /></td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <StatusBadge status={stageStatusMap[c.stage] || 'muted'} label={c.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} dot />
                    </td>
                    <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: c.waarde > 0 ? 'var(--g-txt)' : 'var(--txt3)', fontWeight: c.waarde > 0 ? 600 : 400 }}>
                      {c.waarde > 0 ? `€${c.waarde.toLocaleString('nl-NL')}` : '—'}
                    </td>
                    <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt2)' }}>
                      {c.aangemaakt ? new Date(c.aangemaakt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                    <td className="mono" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--txt3)' }}>
                      {c.laatsteActiviteit ? new Date(c.laatsteActiviteit).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
