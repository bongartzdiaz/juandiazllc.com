'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter, Mail, Play, Pause } from 'lucide-react'

interface DripCampaign {
  id: string
  organizationId: string
  name: string
  type: string
  status: string
  stepsJson: string
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; icon: typeof Play }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', icon: Play },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', icon: Pause },
  draft: { bg: 'var(--bg2)', txt: 'var(--txt3)', icon: Pause },
  completed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)', icon: Play },
}

const TYPE_LABELS: Record<string, string> = {
  buyer: 'Buyer Nurture',
  seller: 'Seller Nurture',
  listing: 'New Listing',
  open_house: 'Open House Follow-up',
  anniversary: 'Home Anniversary',
  referral: 'Referral Request',
  just_sold: 'Just Sold',
  market_update: 'Market Update',
}

export default function DripCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([])
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    fetch(`/api/drip-campaigns?${params}`)
      .then(r => r.json())
      .then(j => setCampaigns(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [typeFilter])

  const filtered = statusFilter ? campaigns.filter(c => c.status === statusFilter) : campaigns
  const active = campaigns.filter(c => c.status === 'active').length
  const totalSteps = campaigns.reduce((s, c) => {
    try { return s + JSON.parse(c.stepsJson).length } catch { return s }
  }, 0)

  return (
    <>
      <Topbar title="Drip Campaigns" sub="Automated email and SMS sequences" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="zap" label="Total Campaigns" value={String(campaigns.length)} />
          <KpiCard icon="trending-up" label="Active" value={String(active)} />
          <KpiCard icon="target" label="Total Steps" value={String(totalSteps)} />
          <KpiCard icon="users" label="Types" value={String(new Set(campaigns.map(c => c.type)).size)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <FilterSelect value={typeFilter} onChange={setTypeFilter}
            options={[{ value: '', label: 'All Types' }, ...Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))]} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter}
            options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'paused', label: 'Paused' }, { value: 'draft', label: 'Draft' }, { value: 'completed', label: 'Completed' }]} />
        </div>

        {/* Campaign Cards */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>No campaigns found.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {filtered.map(campaign => {
              let steps: unknown[] = []
              try { steps = JSON.parse(campaign.stepsJson) } catch {}
              const statusStyle = STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft
              const StatusIcon = statusStyle.icon

              return (
                <div key={campaign.id} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-sm)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--txt)', marginBottom: 2 }}>{campaign.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{TYPE_LABELS[campaign.type] ?? campaign.type}</div>
                    </div>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: statusStyle.bg, color: statusStyle.txt,
                    }}>
                      <StatusIcon size={9} /> {campaign.status}
                    </span>
                  </div>

                  {/* Steps visual */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {steps.length > 0 ? steps.map((_, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--accent-bg)', color: 'var(--accent-txt)',
                          fontSize: 9, fontWeight: 700,
                        }}>{i + 1}</div>
                        {i < steps.length - 1 && <div style={{ width: 12, height: 1, background: 'var(--border)' }} />}
                      </div>
                    )) : (
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>No steps configured</span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--txt3)', marginLeft: 4 }}>{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 10, color: 'var(--txt3)' }}>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    <Mail size={13} style={{ color: 'var(--txt3)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
