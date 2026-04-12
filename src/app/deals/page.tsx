'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface Deal {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  expectedClose: string | null
  createdAt: string
  stage: { id: string; name: string; color: string }
  contact: { id: string; name: string } | null
  owner: { id: string; name: string } | null
}

interface Pipeline {
  id: string
  name: string
  stages: { id: string; name: string; color: string; position: number }[]
  _count: { deals: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  open: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  won: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  lost: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedPipeline, setSelectedPipeline] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/pipelines').then(r => r.json()).then(j => setPipelines(j.data ?? []))
  }, [])

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (selectedPipeline) params.set('pipelineId', selectedPipeline)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/deals?${params}`)
      const json = await res.json()
      setDeals(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setDeals([]) }
    finally { setLoading(false) }
  }, [page, selectedPipeline, statusFilter])

  useEffect(() => { fetchDeals() }, [fetchDeals])

  const totalValue = deals.reduce((s, d) => s + d.valueCents, 0)
  const openDeals = deals.filter(d => d.status === 'open')
  const wonDeals = deals.filter(d => d.status === 'won')
  const avgProb = openDeals.length ? Math.round(openDeals.reduce((s, d) => s + d.probability, 0) / openDeals.length) : 0

  return (
    <>
      <Topbar title="Deals" sub="Track and manage your deal pipeline" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label="Total Value" value={`$${(totalValue / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Open Deals" value={String(openDeals.length)} />
          <KpiCard icon="trending-up" label="Won" value={String(wonDeals.length)} />
          <KpiCard icon="chart" label="Avg Probability" value={`${avgProb}%`} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterSelect icon={Filter} value={selectedPipeline} onChange={v => { setSelectedPipeline(v); setPage(1) }}
            options={[{ value: '', label: 'All Pipelines' }, ...pipelines.map(p => ({ value: p.id, label: p.name }))]} />
          <FilterSelect icon={Filter} value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: '', label: 'All Statuses' }, { value: 'open', label: 'Open' }, { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }]} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px 100px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Deal</span><span>Stage</span><span>Value</span><span>Prob.</span><span>Contact</span><span>Status</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : deals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No deals found. Create a pipeline first.</div>
          ) : deals.map((deal, idx) => (
            <div key={deal.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 120px 100px', gap: 12, padding: '10px 16px', borderBottom: idx < deals.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{deal.title}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{deal.owner?.name ?? 'Unassigned'}</div>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: deal.stage.color + '22', color: deal.stage.color, display: 'inline-block', maxWidth: 'fit-content' }}>{deal.stage.name}</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(deal.valueCents / 100).toLocaleString()}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace" }}>{deal.probability}%</span>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{deal.contact?.name ?? '-'}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[deal.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[deal.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{deal.status}</span>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}

function FilterSelect({ icon: Icon, value, onChange, options }: { icon: any; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Icon size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
