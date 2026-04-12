'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { MapPin, Filter, Search } from 'lucide-react'

interface Property {
  id: string
  title: string
  type: string
  status: string
  address: string
  city: string
  state: string
  priceCents: number
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  createdAt: string
  _count: { viewings: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  under_contract: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  sold: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  rented: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('q', search)
      const res = await fetch(`/api/properties?${params}`)
      const json = await res.json()
      setProperties(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setProperties([]) }
    finally { setLoading(false) }
  }, [page, statusFilter, search])

  useEffect(() => { fetchData() }, [fetchData])

  const totalValue = properties.reduce((s, p) => s + p.priceCents, 0)
  const available = properties.filter(p => p.status === 'available').length

  return (
    <>
      <Topbar title="Properties" sub="Manage your real estate listings" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Properties" value={String(total)} />
          <KpiCard icon="dollar-sign" label="Portfolio Value" value={`$${(totalValue / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Available" value={String(available)} />
          <KpiCard icon="chart" label="Total Viewings" value={String(properties.reduce((s, p) => s + p._count.viewings, 0))} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12, flex: 1, maxWidth: 300 }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search properties..." style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="under_contract">Under Contract</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : properties.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>No properties found.</div>
          ) : properties.map(prop => {
            const sc = STATUS_COLORS[prop.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div key={prop.id} className="card-hover" style={{ padding: '16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>{prop.title}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, whiteSpace: 'nowrap' }}>{prop.status.replace('_', ' ')}</span>
                </div>
                {(prop.address || prop.city) && (
                  <div style={{ fontSize: 11, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                    <MapPin size={11} /> {[prop.address, prop.city, prop.state].filter(Boolean).join(', ')}
                  </div>
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', fontFamily: "var(--font-red-hat-mono), monospace", marginBottom: 8 }}>
                  ${(prop.priceCents / 100).toLocaleString()}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--txt2)' }}>
                  {prop.bedrooms != null && <span>{prop.bedrooms} bed</span>}
                  {prop.bathrooms != null && <span>{prop.bathrooms} bath</span>}
                  {prop.sqft != null && <span>{prop.sqft.toLocaleString()} sqft</span>}
                  <span style={{ marginLeft: 'auto' }}>{prop._count.viewings} viewings</span>
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
