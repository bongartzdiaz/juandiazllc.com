'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter, Search, Calendar, Star } from 'lucide-react'

interface Showing {
  id: string
  propertyId: string
  agentId: string
  contactId: string | null
  scheduledAt: string
  duration: number
  status: string
  feedback: string
  rating: number | null
  createdAt: string
  property?: { id: string; title: string; address: string }
  agent?: { id: string; name: string }
  contact?: { id: string; name: string } | null
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  scheduled: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  completed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  no_show: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

export default function ShowingsPage() {
  const [showings, setShowings] = useState<Showing[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/showings?${params}`)
      const json = await res.json()
      setShowings(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setShowings([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const scheduled = showings.filter(s => s.status === 'scheduled').length
  const completed = showings.filter(s => s.status === 'completed').length
  const avgRating = showings.filter(s => s.rating != null).reduce((s, sh) => s + (sh.rating ?? 0), 0) /
    (showings.filter(s => s.rating != null).length || 1)

  return (
    <>
      <Topbar title="Showings" sub="Schedule and track property showings" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="calendar" label="Total Showings" value={String(total)} />
          <KpiCard icon="target" label="Scheduled" value={String(scheduled)} />
          <KpiCard icon="chart" label="Completed" value={String(completed)} />
          <KpiCard icon="award" label="Avg Rating" value={avgRating ? avgRating.toFixed(1) : '-'} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: '', label: 'All Statuses' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'no_show', label: 'No Show' }]} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px 80px 100px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Property</span><span>Date/Time</span><span>Agent</span><span>Contact</span><span>Rating</span><span>Status</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : showings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No showings scheduled yet.</div>
          ) : showings.map((showing, idx) => (
            <div key={showing.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px 80px 100px', gap: 12, padding: '10px 16px', borderBottom: idx < showings.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{showing.property?.title ?? 'Unknown'}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{showing.property?.address ?? ''}</div>
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>
                  {new Date(showing.scheduledAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                  {new Date(showing.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({showing.duration}min)
                </div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{showing.agent?.name ?? '-'}</span>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{showing.contact?.name ?? '-'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {showing.rating != null ? (
                  <>
                    <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>{showing.rating}</span>
                  </>
                ) : <span style={{ fontSize: 10, color: 'var(--txt3)' }}>-</span>}
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[showing.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[showing.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{showing.status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
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
