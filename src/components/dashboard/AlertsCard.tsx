'use client'

import { useMemo } from 'react'
import type { MetaAdsData, SalesData, ChatbotData } from '@/lib/types'

interface Alert {
  type: 'ok' | 'warn' | 'crit'
  msg: string
  sub: string
  cta: string
}

const alertStyles = {
  ok:   { bg: 'var(--g-bg)', border: 'var(--g)', msgColor: 'var(--g-txt)' },
  warn: { bg: 'var(--o-bg)', border: 'var(--o)', msgColor: 'var(--o-txt)' },
  crit: { bg: 'var(--r-bg)', border: 'var(--r)', msgColor: 'var(--r-txt)' },
}

interface Props {
  meta?: MetaAdsData | null
  sales?: SalesData | null
  chatbot?: ChatbotData | null
}

export function AlertsCard({ meta, sales, chatbot }: Props) {
  const alerts = useMemo(() => {
    const list: Alert[] = []

    // Meta Ads alerts
    if (meta?.campaigns) {
      const bestCampaign = [...meta.campaigns].sort((a, b) => (a.cpl ?? 999) - (b.cpl ?? 999))[0]
      if (bestCampaign && bestCampaign.cpl && bestCampaign.cpl < 20) {
        list.push({
          type: 'ok',
          msg: `${bestCampaign.funnel} draait op CPL €${Math.round(bestCampaign.cpl)}`,
          sub: 'Beste funnel — schaal budget op',
          cta: 'Bekijk',
        })
      }

      const worstCampaign = [...meta.campaigns]
        .filter(c => c.spend >= 50 && c.cpl !== null && c.cpl > 25)
        .sort((a, b) => (b.cpl ?? 0) - (a.cpl ?? 0))[0]
      if (worstCampaign && worstCampaign.cpl) {
        list.push({
          type: 'warn',
          msg: `${worstCampaign.funnel} CPL €${Math.round(worstCampaign.cpl)} — te hoog`,
          sub: 'Pauzeer of pas creative aan',
          cta: 'Fix',
        })
      }
    }

    // Chatbot alerts
    if (chatbot?.totals) {
      if (chatbot.totals.wachtendOpHandoff > 0) {
        list.push({
          type: 'crit',
          msg: `${chatbot.totals.wachtendOpHandoff} chatbotgesprekken wachten`,
          sub: 'Menselijke overdracht vereist',
          cta: 'Nu',
        })
      }
      if (chatbot.totals.conversieRate < 25) {
        list.push({
          type: 'warn',
          msg: `Chatbot conversie ${Math.round(chatbot.totals.conversieRate)}%`,
          sub: 'Onder minimum van 25%',
          cta: 'Bekijk',
        })
      }
    }

    // Sales alerts
    if (sales?.totals) {
      if (sales.totals.deals >= 10) {
        list.push({
          type: 'ok',
          msg: `${sales.totals.deals} deals gesloten`,
          sub: `€${(sales.totals.omzet / 1000).toFixed(1)}k omzet bereikt`,
          cta: 'Details',
        })
      }
    }

    // Fallback if no data
    if (list.length === 0) {
      list.push(
        { type: 'ok', msg: 'F1 draait op CPL €12', sub: 'Beste funnel — schaal budget op', cta: 'Bekijk' },
        { type: 'warn', msg: 'F5 CPL €34 — te hoog', sub: 'Pauzeer of pas creative aan', cta: 'Fix' },
        { type: 'crit', msg: '7 chatbotgesprekken wachten', sub: 'Menselijke overdracht vereist', cta: 'Nu' },
      )
    }

    return list.slice(0, 4)
  }, [meta, sales, chatbot])

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      animation: 'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) 0.25s both',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 15px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--r)' }} />
          Signalen
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
          background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
        }}>{alerts.length} actief</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12 }}>
        {alerts.map((a, i) => {
          const s = alertStyles[a.type]
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 9,
              padding: '10px 11px', borderRadius: 8,
              background: s.bg, borderLeft: `3px solid ${s.border}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: s.msgColor }}>{a.msg}</div>
                <div style={{ fontSize: 11.5, color: 'var(--txt2)', marginTop: 2 }}>{a.sub}</div>
              </div>
              <button style={{
                flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--txt2)',
                border: '1px solid var(--border2)', padding: '3px 8px', borderRadius: 5,
                cursor: 'pointer', background: 'var(--panel)',
              }}>{a.cta}</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
