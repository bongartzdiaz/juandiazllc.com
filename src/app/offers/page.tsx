'use client'

import { useState, useEffect, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { Filter } from 'lucide-react'

interface Offer {
  id: string
  propertyId: string
  contactId: string
  dealId: string | null
  offerAmountCents: number
  status: string
  offerDate: string
  expiresAt: string | null
  contingencies: string
  notes: string
  createdAt: string
  property?: { id: string; title: string; address: string }
  contact?: { id: string; name: string }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  accepted: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  rejected: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  countered: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  withdrawn: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  expired: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
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
      const res = await fetch(`/api/offers?${params}`)
      const json = await res.json()
      setOffers(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setOffers([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const totalValue = offers.reduce((s, o) => s + o.offerAmountCents, 0)
  const pending = offers.filter(o => o.status === 'pending').length
  const accepted = offers.filter(o => o.status === 'accepted').length
  const acceptRate = total > 0 ? Math.round((accepted / total) * 100) : 0

  return (
    <>
      <Topbar title="Offers" sub="Track and manage property offers" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label="Total Offer Value" value={`$${(totalValue / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Pending" value={String(pending)} />
          <KpiCard icon="trending-up" label="Accepted" value={String(accepted)} />
          <KpiCard icon="chart" label="Accept Rate" value={`${acceptRate}%`} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'accepted', label: 'Accepted' }, { value: 'rejected', label: 'Rejected' }, { value: 'countered', label: 'Countered' }, { value: 'withdrawn', label: 'Withdrawn' }, { value: 'expired', label: 'Expired' }]} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Property</span><span>Buyer</span><span>Amount</span><span>Date</span><span>Status</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : offers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No offers yet.</div>
          ) : offers.map((offer, idx) => (
            <div key={offer.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 100px', gap: 12, padding: '10px 16px', borderBottom: idx < offers.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{offer.property?.title ?? 'Unknown'}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{offer.property?.address ?? ''}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{offer.contact?.name ?? '-'}</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(offer.offerAmountCents / 100).toLocaleString()}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>{new Date(offer.offerDate).toLocaleDateString()}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[offer.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[offer.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{offer.status}</span>
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
