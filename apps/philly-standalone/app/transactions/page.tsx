'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Filter, PenTool, X } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: string
  dealId: string | null
  propertyId: string | null
  type: string
  status: string
  closingDate: string | null
  contractDate: string | null
  escrowNumber: string
  titleCompany: string
  buyerAgentId: string | null
  sellerAgentId: string | null
  buyerContactId: string | null
  sellerContactId: string | null
  salePrice: number
  earnestMoney: number
  notes: string
  checklistJson: string | null
  createdAt: string
  _count: { signatures: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  active: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  closing: { bg: 'var(--o-bg)', txt: 'var(--o-txt)' },
  closed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addType, setAddType] = useState('purchase')
  const [addEscrow, setAddEscrow] = useState('')
  const [addTitleCompany, setAddTitleCompany] = useState('')
  const [addSalePrice, setAddSalePrice] = useState('')
  const [addEarnest, setAddEarnest] = useState('')
  const [addClosingDate, setAddClosingDate] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const t = useTranslations('transactions')
  const router = useRouter()

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const handleAddTransaction = async () => {
    if (saving) return
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addType,
          escrowNumber: addEscrow,
          titleCompany: addTitleCompany,
          salePrice: Math.round((parseFloat(addSalePrice) || 0) * 100),
          earnestMoney: Math.round((parseFloat(addEarnest) || 0) * 100),
          closingDate: addClosingDate || null,
          notes: addNotes,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddType('purchase'); setAddEscrow(''); setAddTitleCompany('')
      setAddSalePrice(''); setAddEarnest(''); setAddClosingDate(''); setAddNotes('')
      setAddError(null)
      setShowAdd(false)
      fetchData()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      setTransactions(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setTransactions([]) }
    finally { setLoading(false) }
  }, [page, statusFilter, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  // Live-refresh on any transaction mutation in the org
  useEntitySubscription('transaction', fetchData)

  const totalVolume = transactions.reduce((s, t) => s + t.salePrice, 0)
  const activeCount = transactions.filter(t => t.status === 'active').length
  const pendingClose = transactions.filter(t => t.status === 'closing').length

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Transaction" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="file-text" label="Total Transactions" value={String(total)} />
          <KpiCard icon="target" label="Active" value={String(activeCount)} />
          <KpiCard icon="dollar-sign" label="Total Volume" value={`$${(totalVolume / 100).toLocaleString()}`} />
          <KpiCard icon="calendar" label="Pending Close" value={String(pendingClose)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[{ value: '', label: 'All Statuses' }, { value: 'pending', label: 'Pending' }, { value: 'active', label: 'Active' }, { value: 'closing', label: 'Closing' }, { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' }]} />
          <FilterSelect value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1) }}
            options={[{ value: '', label: 'All Types' }, { value: 'purchase', label: 'Purchase' }, { value: 'sale', label: 'Sale' }, { value: 'lease', label: 'Lease' }, { value: 'refinance', label: 'Refinance' }]} />
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px 120px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Transaction</span><span>Type</span><span>Sale Price</span><span>Status</span><span>Closing Date</span><span>Signatures</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No transactions found.</div>
          ) : transactions.map((txn, idx) => (
            <div key={txn.id} onClick={() => router.push(`/transactions/${txn.id}`)} className="card-hover" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 100px 120px 80px', gap: 12, padding: '10px 16px', borderBottom: idx < transactions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{txn.escrowNumber || 'No Escrow #'}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{txn.titleCompany || '-'}</div>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: 'var(--bg2)', color: 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{txn.type}</span>
              <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>${(txn.salePrice / 100).toLocaleString()}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[txn.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[txn.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{txn.status}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>{txn.closingDate ? new Date(txn.closingDate).toLocaleDateString() : '-'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <PenTool size={11} style={{ color: 'var(--txt3)' }} />
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 500 }}>{txn._count?.signatures ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeAddModal}>
          <div
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div id="transaction-add-title" style={{ fontSize: 16, fontWeight: 700 }}>Add Transaction</div>
              <button onClick={closeAddModal} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new transaction</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Type</label>
                <select value={addType} onChange={e => setAddType(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="lease">Lease</option>
                  <option value="refinance">Refinance</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Escrow Number</label>
                <input value={addEscrow} onChange={e => setAddEscrow(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Title Company</label>
                <input value={addTitleCompany} onChange={e => setAddTitleCompany(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Sale Price ($)</label>
                <input type="number" step="1000" min="0" value={addSalePrice} onChange={e => setAddSalePrice(e.target.value)} placeholder="500000" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Earnest Money ($)</label>
                <input type="number" step="500" min="0" value={addEarnest} onChange={e => setAddEarnest(e.target.value)} placeholder="5000" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Closing Date</label>
                <input type="date" value={addClosingDate} onChange={e => setAddClosingDate(e.target.value)} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Notes</label>
                <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} rows={3} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', resize: 'vertical',
                }} />
              </div>
            </div>
            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={handleAddTransaction} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Add Transaction'}</button>
          </div>
        </div>
      )}
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
