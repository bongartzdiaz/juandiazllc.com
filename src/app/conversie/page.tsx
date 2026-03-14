'use client'

import { useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import { useMetaAds } from '@/hooks/useMetaAds'
import { useGoogleAds } from '@/hooks/useGoogleAds'
import { useChatbot } from '@/hooks/useChatbot'
import { useSales } from '@/hooks/useSales'
import {
  Megaphone, Users, MessageSquare, CalendarCheck, BadgeDollarSign,
  AlertTriangle, GitCompareArrows, ArrowRight, TrendingDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// Journey stages for the horizontal funnel
const JOURNEY_STAGES = [
  { key: 'ads', label: 'Advertenties', sub: 'Meta + Google', Icon: Megaphone },
  { key: 'leads', label: 'Leads', sub: 'Formulier ingevuld', Icon: Users },
  { key: 'chatbot', label: 'Chatbot', sub: 'WhatsApp gesprek', Icon: MessageSquare },
  { key: 'afspraak', label: 'Afspraken', sub: 'Telefoon + buitendienst', Icon: CalendarCheck },
  { key: 'sale', label: 'Sales', sub: 'Getekend', Icon: BadgeDollarSign },
]

const stageColors = ['var(--b)', 'var(--b)', 'var(--y)', 'var(--o)', 'var(--g)']
const stageBgColors = ['var(--b-bg)', 'var(--b-bg)', 'var(--y-bg)', 'var(--o-bg)', 'var(--g-bg)']
const stageBorderColors = ['var(--b-border)', 'var(--b-border)', 'var(--y-border)', 'var(--o-border)', 'var(--g-border)']
const stageTxtColors = ['var(--b-txt)', 'var(--b-txt)', 'var(--y-txt)', 'var(--o-txt)', 'var(--g-txt)']

export default function ConversiePage() {
  const { theme } = useTheme()
  const { data: metaData } = useMetaAds('NL')
  const { data: googleData } = useGoogleAds('NL')
  const { data: chatbotData } = useChatbot()
  const { data: salesData } = useSales()

  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const tickColor = theme === 'dark' ? '#7A8DA3' : '#96A0B5'

  // Aggregate journey numbers
  const journey = useMemo(() => {
    const metaSpend = metaData?.totals?.spend || 0
    const googleSpend = googleData?.totals?.spend || 0
    const totalSpend = metaSpend + googleSpend

    const metaLeads = metaData?.totals?.leads || 0
    const googleConversions = googleData?.totals?.conversions || 0
    const totalLeads = metaLeads + googleConversions

    const chatbotGesprekken = chatbotData?.totals?.gesprekken || 0
    const chatbotGekwalificeerd = chatbotData?.totals?.gekwalificeerd || 0

    const afspraken = salesData?.totals?.afspraken || 0
    const deals = salesData?.totals?.deals || 0
    const omzet = salesData?.totals?.omzet || 0

    return {
      totalSpend,
      metaSpend,
      googleSpend,
      totalLeads,
      metaLeads,
      googleConversions,
      chatbotGesprekken,
      chatbotGekwalificeerd,
      afspraken,
      deals,
      omzet,
      // Conversion rates between stages
      leadRate: totalSpend > 0 ? totalLeads : 0,
      chatbotRate: totalLeads > 0 ? Math.round((chatbotGesprekken / totalLeads) * 100) : 0,
      afspraakRate: chatbotGekwalificeerd > 0 ? Math.round((afspraken / chatbotGekwalificeerd) * 100) : 0,
      saleRate: afspraken > 0 ? Math.round((deals / afspraken) * 100) : 0,
      totalRate: totalLeads > 0 ? ((deals / totalLeads) * 100).toFixed(1) : '0',
      cpl: totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0,
      cps: deals > 0 ? Math.round(totalSpend / deals) : 0,
    }
  }, [metaData, googleData, chatbotData, salesData])

  const funnelValues = [
    journey.totalLeads,
    journey.chatbotGesprekken,
    journey.chatbotGekwalificeerd,
    journey.afspraken,
    journey.deals,
  ]

  // Bottleneck detection
  const bottlenecks = useMemo(() => {
    const issues: { stage: string; message: string; severity: 'slecht' | 'ok' | 'goed' }[] = []

    if (journey.cpl > 25) issues.push({ stage: 'Ads → Lead', message: `CPL €${journey.cpl} — te hoog (doel < €20)`, severity: 'slecht' })
    else if (journey.cpl > 20) issues.push({ stage: 'Ads → Lead', message: `CPL €${journey.cpl} — net boven doel`, severity: 'ok' })

    if (journey.chatbotRate < 30) issues.push({ stage: 'Lead → Chatbot', message: `${journey.chatbotRate}% begint chatbot — te laag`, severity: 'slecht' })
    else if (journey.chatbotRate < 50) issues.push({ stage: 'Lead → Chatbot', message: `${journey.chatbotRate}% begint chatbot`, severity: 'ok' })

    if (journey.afspraakRate < 20) issues.push({ stage: 'Chatbot → Afspraak', message: `${journey.afspraakRate}% maakt afspraak — bottleneck`, severity: 'slecht' })

    if (journey.saleRate < 30) issues.push({ stage: 'Afspraak → Sale', message: `${journey.saleRate}% sluit deal`, severity: 'ok' })

    if (issues.length === 0) issues.push({ stage: 'Alles', message: 'Funnel loopt goed', severity: 'goed' })

    return issues
  }, [journey])

  // Source breakdown chart data
  const sourceData = useMemo(() => [
    { bron: 'Meta Ads', leads: journey.metaLeads, spend: journey.metaSpend, cpl: journey.metaLeads > 0 ? Math.round(journey.metaSpend / journey.metaLeads) : 0 },
    { bron: 'Google Ads', leads: journey.googleConversions, spend: journey.googleSpend, cpl: journey.googleConversions > 0 ? Math.round(journey.googleSpend / journey.googleConversions) : 0 },
  ], [journey])

  if (!metaData && !salesData) return null

  return (
    <>
      <Topbar title="Conversie overzicht" sub="Volledige journey: advertentie → sale" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* Top KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Totale ad spend" value={`€${journey.totalSpend.toLocaleString('nl-NL')}`} delta="Meta + Google" deltaDir="neu" accentColor="var(--o)" icon="dollar-sign" delay={80} />
          <KpiCard label="Totale leads" value={journey.totalLeads} delta={`CPL €${journey.cpl}`} deltaDir={journey.cpl < 20 ? 'up' : 'down'} accentColor="var(--b)" icon="users" delay={130} />
          <KpiCard label="Gesloten deals" value={journey.deals} delta={`${journey.totalRate}% conversie`} deltaDir={Number(journey.totalRate) > 2.5 ? 'up' : 'down'} accentColor="var(--g)" icon="target" delay={180} />
          <KpiCard label="Omzet" value={`€${journey.omzet.toLocaleString('nl-NL')}`} delta="Deze maand" deltaDir="up" accentColor="var(--g)" icon="trending-up" delay={230} />
          <KpiCard label="Kosten per sale" value={`€${journey.cps.toLocaleString('nl-NL')}`} delta="Totale spend / deals" deltaDir={journey.cps < 500 ? 'up' : 'down'} goal="Lager = beter" icon="trending-down" delay={280} />
        </div>

        {/* Journey Funnel — Horizontal */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          marginBottom: 12,
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b)' }} />
                Volledige journey
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
                Van advertentie tot getekende sale — waar vallen leads af?
              </div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--b-bg)', border: '1px solid var(--b-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GitCompareArrows size={15} color="var(--b-txt)" />
            </div>
          </div>

          <div style={{ padding: '24px 18px', display: 'flex', alignItems: 'center', gap: 0 }}>
            {JOURNEY_STAGES.map((stage, i) => {
              const value = funnelValues[i]
              const prevValue = i > 0 ? funnelValues[i - 1] : value
              const convRate = i > 0 && prevValue > 0 ? Math.round((value / prevValue) * 100) : 100
              const maxVal = funnelValues[0] || 1
              const barPct = Math.max(8, (value / maxVal) * 100)
              const StageIcon = stage.Icon

              return (
                <div key={stage.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  {/* Stage card */}
                  <div style={{
                    flex: 1, padding: '16px 12px', borderRadius: 12,
                    background: stageBgColors[i], border: `1px solid ${stageBorderColors[i]}`,
                    textAlign: 'center', position: 'relative',
                  }}>
                    {/* Icon badge top-right */}
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 28, height: 28, borderRadius: 8,
                      background: `color-mix(in srgb, ${stageColors[i]} 15%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <StageIcon size={14} color={stageTxtColors[i]} />
                    </div>

                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `color-mix(in srgb, ${stageColors[i]} 12%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 8px',
                    }}>
                      <StageIcon size={18} color={stageTxtColors[i]} />
                    </div>
                    <div className="mono" style={{
                      fontSize: 22, fontWeight: 700, color: stageTxtColors[i],
                      letterSpacing: '-0.02em',
                    }}>
                      {value.toLocaleString('nl-NL')}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt)', marginTop: 4 }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 1 }}>
                      {stage.sub}
                    </div>
                    {/* Mini bar */}
                    <div style={{
                      marginTop: 8, height: 4, background: 'var(--bg2)',
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        background: stageColors[i], width: `${barPct}%`,
                        opacity: 0.7, transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>

                  {/* Arrow between stages */}
                  {i < JOURNEY_STAGES.length - 1 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '0 6px', minWidth: 44,
                    }}>
                      <div className="mono" style={{
                        fontSize: 11, fontWeight: 700,
                        color: convRate >= 40 ? 'var(--g-txt)' : convRate >= 20 ? 'var(--y-txt)' : 'var(--r-txt)',
                      }}>
                        {convRate}%
                      </div>
                      <ArrowRight size={16} color="var(--txt3)" style={{ margin: '2px 0' }} />
                      <div className="mono" style={{ fontSize: 9, color: 'var(--txt3)' }}>
                        -{(prevValue - value).toLocaleString('nl-NL')}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottlenecks + Source breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Bottleneck detection */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--r)' }} />
                Knelpunten detectie
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AlertTriangle size={13} color="var(--r-txt)" />
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bottlenecks.map((b, i) => {
                const borderColor = b.severity === 'slecht' ? 'var(--r)' : b.severity === 'ok' ? 'var(--y)' : 'var(--g)'
                return (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: b.severity === 'slecht' ? 'var(--r-bg)' : b.severity === 'ok' ? 'var(--y-bg)' : 'var(--g-bg)',
                    border: `1px solid ${b.severity === 'slecht' ? 'var(--r-border)' : b.severity === 'ok' ? 'var(--y-border)' : 'var(--g-border)'}`,
                    borderLeft: `3px solid ${borderColor}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {b.severity === 'slecht' && <AlertTriangle size={12} color="var(--r-txt)" />}
                        {b.severity === 'ok' && <TrendingDown size={12} color="var(--y-txt)" />}
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt)' }}>{b.stage}</span>
                      </div>
                      <StatusBadge status={b.severity} label={b.severity === 'slecht' ? 'Actie nodig' : b.severity === 'ok' ? 'Let op' : 'Goed'} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{b.message}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Source breakdown */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b)' }} />
                Bronvergelijking
              </div>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--b-bg)', border: '1px solid var(--b-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Megaphone size={13} color="var(--b-txt)" />
              </div>
            </div>
            <div style={{ padding: 16 }}>
              {sourceData.map((src, i) => (
                <div key={i} style={{
                  padding: '12px', borderRadius: 8,
                  background: 'var(--bg2)', marginBottom: i < sourceData.length - 1 ? 8 : 0,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{src.bron}</span>
                    <StatusBadge status={src.cpl < 20 ? 'goed' : src.cpl < 30 ? 'ok' : 'slecht'} label={`CPL €${src.cpl}`} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Spend</div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--o-txt)' }}>€{src.spend.toLocaleString('nl-NL')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Leads</div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--b-txt)' }}>{src.leads}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>CPL</div>
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: src.cpl < 20 ? 'var(--g-txt)' : 'var(--r-txt)' }}>€{src.cpl}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Total row */}
              <div style={{
                marginTop: 12, padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Totaal</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--o-txt)' }}>€{journey.totalSpend.toLocaleString('nl-NL')}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--b-txt)' }}>{journey.totalLeads} leads</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: journey.cpl < 20 ? 'var(--g-txt)' : 'var(--r-txt)' }}>CPL €{journey.cpl}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage-by-stage conversion table */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ padding: '12px 15px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g)' }} />
              Conversie per stap
            </div>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--g-bg)', border: '1px solid var(--g-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ArrowRight size={13} color="var(--g-txt)" />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Stap', 'Van', 'Naar', 'Volume in', 'Volume uit', 'Conversie', 'Uitval', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '9px 12px', fontSize: 10.5, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
                      borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { step: 'Ads → Leads', from: 'Advertenties', to: 'Leads', vIn: journey.totalSpend, vOut: journey.totalLeads, metric: `CPL €${journey.cpl}`, status: journey.cpl < 20 ? 'goed' : journey.cpl < 30 ? 'ok' : 'slecht' },
                  { step: 'Lead → Chatbot', from: 'Leads', to: 'Chatbot', vIn: journey.totalLeads, vOut: journey.chatbotGesprekken, metric: `${journey.chatbotRate}%`, status: journey.chatbotRate > 50 ? 'goed' : journey.chatbotRate > 30 ? 'ok' : 'slecht' },
                  { step: 'Chatbot → Afspraak', from: 'Gekwalificeerd', to: 'Afspraken', vIn: journey.chatbotGekwalificeerd, vOut: journey.afspraken, metric: `${journey.afspraakRate}%`, status: journey.afspraakRate > 30 ? 'goed' : journey.afspraakRate > 15 ? 'ok' : 'slecht' },
                  { step: 'Afspraak → Sale', from: 'Afspraken', to: 'Sales', vIn: journey.afspraken, vOut: journey.deals, metric: `${journey.saleRate}%`, status: journey.saleRate > 40 ? 'goed' : journey.saleRate > 20 ? 'ok' : 'slecht' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600 }}>{row.step}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--txt2)' }}>{row.from}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--txt2)' }}>{row.to}</td>
                    <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt)' }}>{typeof row.vIn === 'number' ? row.vIn.toLocaleString('nl-NL') : row.vIn}</td>
                    <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{row.vOut.toLocaleString('nl-NL')}</td>
                    <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, color: row.status === 'goed' ? 'var(--g-txt)' : row.status === 'ok' ? 'var(--y-txt)' : 'var(--r-txt)' }}>{row.metric}</td>
                    <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--txt3)' }}>-{(row.vIn - row.vOut).toLocaleString('nl-NL')}</td>
                    <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                      <StatusBadge status={row.status} label={row.status === 'goed' ? 'Goed' : row.status === 'ok' ? 'Let op' : 'Actie nodig'} />
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
