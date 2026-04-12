'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface Grant {
  id: string
  title: string
  funder: string
  amountCents: number
  status: string
  appliedDate: string | null
  awardedDate: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  prospect: { bg: 'var(--bg2)', txt: 'var(--txt2)' },
  applied: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  under_review: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  approved: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  reporting: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  closed: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  rejected: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function GrantsPage() {
  const [grants, setGrants] = useState<Grant[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/grants?${params}`)
      const json = await res.json()
      setGrants(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setGrants([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const totalFunding = grants.reduce((s, g) => s + g.amountCents, 0)
  const activeGrants = grants.filter(g => g.status === 'active' || g.status === 'approved')
  const pending = grants.filter(g => g.status === 'applied' || g.status === 'under_review')

  return (
    <>
      <Topbar title="Grants" sub="Track funding applications and awards" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="award" label="Total Grants" value={String(total)} />
          <KpiCard icon="dollar-sign" label="Total Funding" value={`$${(totalFunding / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Active" value={String(activeGrants.length)} />
          <KpiCard icon="calendar" label="Pending" value={String(pending.length)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px 100px 140px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Grant</span><span>Funder</span><span>Amount</span><span>Status</span><span>Dates</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : grants.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No grants found.</div>
          ) : grants.map((grant, idx) => {
            const sc = STATUS_COLORS[grant.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div key={grant.id} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 120px 100px 140px', gap: 12, padding: '10px 16px', borderBottom: idx < grants.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{grant.title}</div>
                <span style={{ color: 'var(--txt2)' }}>{grant.funder || '-'}</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(grant.amountCents / 100).toLocaleString()}</span>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, display: 'inline-block', maxWidth: 'fit-content' }}>{grant.status.replace('_', ' ')}</span>
                <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{grant.startDate ? new Date(grant.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}</span>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
