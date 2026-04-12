'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface Volunteer {
  id: string
  name: string
  email: string
  phone: string
  status: string
  totalHours: number
  createdAt: string
  _count: { volunteerLogs: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  inactive: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  onboarding: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
}

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([])
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
      const res = await fetch(`/api/volunteers?${params}`)
      const json = await res.json()
      setVolunteers(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setVolunteers([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const active = volunteers.filter(v => v.status === 'active').length
  const totalHours = volunteers.reduce((s, v) => s + v.totalHours, 0)

  return (
    <>
      <Topbar title="Volunteers" sub="Volunteer management and tracking" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="users" label="Total Volunteers" value={String(total)} />
          <KpiCard icon="target" label="Active" value={String(active)} />
          <KpiCard icon="calendar" label="Total Hours" value={totalHours.toLocaleString()} />
          <KpiCard icon="trending-down" label="Inactive" value={String(volunteers.filter(v => v.status === 'inactive').length)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Name</span><span>Email</span><span>Status</span><span>Hours</span><span>Logs</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : volunteers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No volunteers found.</div>
          ) : volunteers.map((vol, idx) => {
            const sc = STATUS_COLORS[vol.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div key={vol.id} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 120px 80px 80px', gap: 12, padding: '10px 16px', borderBottom: idx < volunteers.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{vol.name}</div>
                  {vol.phone && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{vol.phone}</div>}
                </div>
                <span style={{ color: 'var(--txt2)', fontSize: 11 }}>{vol.email || '-'}</span>
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, display: 'inline-block', maxWidth: 'fit-content' }}>{vol.status}</span>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 600 }}>{vol.totalHours}</span>
                <span style={{ color: 'var(--txt3)' }}>{vol._count.volunteerLogs}</span>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
