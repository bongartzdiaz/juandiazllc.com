'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface Room {
  id: string
  name: string
  type: string
  status: string
  floor: number
  capacity: number
  priceCentsNight: number
  createdAt: string
  _count: { reservations: number; housekeeping: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  occupied: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  maintenance: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  blocked: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
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
      const res = await fetch(`/api/rooms?${params}`)
      const json = await res.json()
      setRooms(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setRooms([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status === 'occupied').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  return (
    <>
      <Topbar title="Rooms" sub="Room management and housekeeping" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Rooms" value={String(total)} />
          <KpiCard icon="target" label="Available" value={String(available)} />
          <KpiCard icon="users" label="Occupied" value={String(occupied)} />
          <KpiCard icon="zap" label="Maintenance" value={String(maintenance)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Maintenance</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : rooms.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>No rooms found.</div>
          ) : rooms.map(room => {
            const sc = STATUS_COLORS[room.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div key={room.id} className="card-hover" style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{room.name}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt }}>{room.status}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6 }}>
                  {room.type} | Floor {room.floor} | Cap. {room.capacity}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', fontFamily: "var(--font-red-hat-mono), monospace" }}>
                  ${(room.priceCentsNight / 100).toFixed(0)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--txt3)' }}>/night</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 6 }}>
                  {room._count.reservations} reservations | {room._count.housekeeping} tasks
                </div>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
