'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import type { MetaCampaign, CampaignStatus } from '@/lib/types'

interface FallbackCampaign {
  name: string
  funnel: string
  status: CampaignStatus
  spend: number
  ctr: string
  cpl: string
  leads: number
}

const FALLBACK: FallbackCampaign[] = [
  { name: 'F1 Thuisbatterij — Interesse NL', funnel: 'F1', status: 'goed', spend: 1284, ctr: '2.4%', cpl: '€12', leads: 107 },
  { name: 'F7 Lookalike — Zonnepanelen', funnel: 'F7', status: 'goed', spend: 876, ctr: '1.8%', cpl: '€13', leads: 67 },
  { name: 'F4 Retarget — 30 dagen', funnel: 'F4', status: 'ok', spend: 654, ctr: '1.1%', cpl: '€18', leads: 36 },
  { name: 'F3 Combi Deal — Test', funnel: 'F3', status: 'testfase', spend: 38, ctr: '0.9%', cpl: '—', leads: 4 },
  { name: 'F5 Koude Traffic — Video', funnel: 'F5', status: 'slecht', spend: 523, ctr: '0.3%', cpl: '€34', leads: 15 },
]

const cplColorMap: Record<string, string> = {
  goed: 'var(--g-txt)', ok: 'var(--o-txt)', testfase: 'var(--txt3)', slecht: 'var(--r-txt)',
}

function getStatus(campaign: MetaCampaign): CampaignStatus {
  if (campaign.spend < 50) return 'testfase'
  if (campaign.ctr > 1 && campaign.cpl !== null && campaign.cpl < 20) return 'goed'
  if (campaign.ctr > 0.7 && campaign.cpl !== null && campaign.cpl < 25) return 'ok'
  return 'slecht'
}

interface Props {
  campaigns?: MetaCampaign[]
}

export function CampaignTable({ campaigns }: Props) {
  const hasRealData = campaigns && campaigns.length > 0

  // Sort by spend desc, take top 5
  const topCampaigns = hasRealData
    ? [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 5)
    : null

  return (
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
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--o)' }} />
          Meta Ads — Topcampagnes
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
          background: 'var(--bg2)', color: 'var(--txt3)', border: '1px solid var(--border)',
        }}>NL</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Campagne', 'Funnel', 'Status', 'Spend', 'CTR', 'CPL', 'Leads'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '9px 12px',
                  fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--txt3)',
                  borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topCampaigns ? topCampaigns.map((c, i) => {
              const status = getStatus(c)
              return (
                <tr key={c.id || i}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                    {c.name}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                    <StatusBadge status="muted" label={c.funnel} />
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                    <StatusBadge status={status} label={status.charAt(0).toUpperCase() + status.slice(1)} />
                  </td>
                  <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--o-txt)' }}>
                    €{Math.round(c.spend).toLocaleString('nl-NL')}
                  </td>
                  <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[status] }}>
                    {c.ctr.toFixed(1)}%
                  </td>
                  <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[status] }}>
                    {c.cpl !== null ? `€${Math.round(c.cpl)}` : '—'}
                  </td>
                  <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                    {c.leads}
                  </td>
                </tr>
              )
            }) : FALLBACK.map((c, i) => (
              <tr key={i}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>{c.name}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                  <StatusBadge status="muted" label={c.funnel} />
                </td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                  <StatusBadge status={c.status} label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} />
                </td>
                <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: 'var(--o-txt)' }}>
                  €{c.spend.toLocaleString('nl-NL')}
                </td>
                <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[c.status] }}>
                  {c.ctr}
                </td>
                <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', color: cplColorMap[c.status] }}>
                  {c.cpl}
                </td>
                <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                  {c.leads}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
