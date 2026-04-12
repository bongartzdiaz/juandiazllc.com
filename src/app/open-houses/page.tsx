'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface OpenHouse {
  id: string
  propertyId: string
  hostId: string
  date: string
  startTime: string
  endTime: string
  notes: string
  visitCount: number
  createdAt: string
  property?: { id: string; title: string; address: string }
  host?: { id: string; name: string }
  _count?: { visits: number }
}

export default function OpenHousesPage() {
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      const res = await fetch(`/api/open-houses?${params}`)
      const json = await res.json()
      setOpenHouses(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setOpenHouses([]) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchData() }, [fetchData])

  const now = new Date()
  const upcoming = openHouses.filter(oh => new Date(oh.date) >= now).length
  const totalVisits = openHouses.reduce((s, oh) => s + (oh._count?.visits ?? oh.visitCount ?? 0), 0)
  const avgVisits = openHouses.length > 0 ? Math.round(totalVisits / openHouses.length) : 0

  return (
    <>
      <Topbar title="Open Houses" sub="Schedule and manage open house events" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="calendar" label="Total Events" value={String(total)} />
          <KpiCard icon="target" label="Upcoming" value={String(upcoming)} />
          <KpiCard icon="users" label="Total Visitors" value={String(totalVisits)} />
          <KpiCard icon="chart" label="Avg Visitors" value={String(avgVisits)} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Property</span><span>Date</span><span>Time</span><span>Host</span><span>Visitors</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : openHouses.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No open houses scheduled.</div>
          ) : openHouses.map((oh, idx) => {
            const ohDate = new Date(oh.date)
            const isPast = ohDate < now
            return (
              <div key={oh.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: idx < openHouses.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent', opacity: isPast ? 0.6 : 1 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{oh.property?.title ?? 'Unknown'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{oh.property?.address ?? ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11 }}>{ohDate.toLocaleDateString()}</span>
                  {!isPast && (
                    <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: 'var(--g-bg)', color: 'var(--g-txt)' }}>Upcoming</span>
                  )}
                </div>
                <span style={{ fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>{oh.startTime} - {oh.endTime}</span>
                <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{oh.host?.name ?? '-'}</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--accent)' }}>{oh._count?.visits ?? oh.visitCount ?? 0}</span>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
