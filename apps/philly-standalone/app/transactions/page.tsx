'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Filter, PenTool, X } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useApi } from '@/hooks/philly/useApi'
import { useRouter } from 'next/navigation'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { useGlobalShortcuts } from '@/hooks/philly/useGlobalShortcuts'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'
import { useFormat } from '@/hooks/philly/useFormat'

const TXN_COLUMNS: ColumnDef[] = [
  { id: 'transaction', label: 'Transaction', required: true },
  { id: 'type', label: 'Type' },
  { id: 'salePrice', label: 'Sale Price' },
  { id: 'status', label: 'Status' },
  { id: 'closingDate', label: 'Closing Date' },
  { id: 'signatures', label: 'Signatures' },
]
const TXN_DEFAULTS = ['transaction', 'type', 'salePrice', 'status', 'closingDate', 'signatures']
const TXN_WIDTHS: Record<string, string> = {
  transaction: '1fr',
  type: '100px',
  salePrice: '120px',
  status: '100px',
  closingDate: '120px',
  signatures: '80px',
}

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
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
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
  // LOC-03 — locale-bound money/date, replacing $-hardcoded toLocaleString().
  const fmt = useFormat()

  // Bundle AI — j/k navigation through transactions list.
  const [focusedTxnId, setFocusedTxnId] = useState<string | null>(null)
  const txnRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Bundle AH — column visibility prefs.
  const txnColumns = useColumnPrefs('pai-transactions-columns-v1', TXN_DEFAULTS)
  const localizedColumns = useMemo<ColumnDef[]>(() => [
    { id: 'transaction', label: t('columns.transaction'), required: true },
    { id: 'type', label: t('columns.type') },
    { id: 'salePrice', label: t('columns.salePrice') },
    { id: 'status', label: t('columns.status') },
    { id: 'closingDate', label: t('columns.closingDate') },
    { id: 'signatures', label: t('columns.signatures') },
  ], [t])
  const visibleTxnColumns = useMemo(
    () => localizedColumns.filter((c) => c.required || txnColumns.visible.has(c.id)),
    [txnColumns.visible, localizedColumns],
  )
  const txnGridTemplate = useMemo(
    () => visibleTxnColumns.map((c) => TXN_WIDTHS[c.id]).join(' '),
    [visibleTxnColumns],
  )

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
      setAddError(err instanceof Error ? err.message : t('errors.networkError'))
    } finally {
      setSaving(false)
    }
  }

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  if (typeFilter) params.set('type', typeFilter)
  interface TransactionsResponse { data: Transaction[]; pagination: { total: number; totalPages: number } }
  const transactionsQuery = useApi<TransactionsResponse>(`/transactions?${params}`)
  const transactions = transactionsQuery.data?.data ?? []
  const total = transactionsQuery.data?.pagination.total ?? 0
  const totalPages = transactionsQuery.data?.pagination.totalPages ?? 0
  const loading = transactionsQuery.loading
  const fetchData = transactionsQuery.refetch

  // Live-refresh on any transaction mutation in the org
  useEntitySubscription('transaction', fetchData)

  // Bundle AI — j/k row nav.
  const moveTxnFocus = useCallback((delta: number) => {
    if (transactions.length === 0) return
    const idx = focusedTxnId ? transactions.findIndex((t) => t.id === focusedTxnId) : -1
    const nextIdx = Math.max(0, Math.min(transactions.length - 1, idx === -1 ? 0 : idx + delta))
    const nextId = transactions[nextIdx].id
    setFocusedTxnId(nextId)
    txnRefs.current.get(nextId)?.scrollIntoView({ block: 'nearest' })
  }, [transactions, focusedTxnId])
  useGlobalShortcuts({
    j: () => moveTxnFocus(1),
    k: () => moveTxnFocus(-1),
    Enter: () => { if (focusedTxnId) router.push(`/transactions/${focusedTxnId}`) },
  })
  useEffect(() => {
    if (focusedTxnId && !transactions.some((t) => t.id === focusedTxnId)) setFocusedTxnId(null)
  }, [transactions, focusedTxnId])

  const totalVolume = transactions.reduce((s, t) => s + t.salePrice, 0)
  const activeCount = transactions.filter(t => t.status === 'active').length
  const pendingClose = transactions.filter(t => t.status === 'closing').length

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel={t('addLabel')} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="file-text" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="target" label={t('kpis.active')} value={String(activeCount)} />
          <KpiCard icon="dollar-sign" label={t('kpis.totalVolume')} value={fmt.currency(totalVolume, { cents: true })} />
          <KpiCard icon="calendar" label={t('kpis.pendingClose')} value={String(pendingClose)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} ariaLabel={t('filters.allStatuses')}
            options={[{ value: '', label: t('filters.allStatuses') }, { value: 'pending', label: t('filters.pending') }, { value: 'active', label: t('filters.active') }, { value: 'closing', label: t('filters.closing') }, { value: 'closed', label: t('filters.closed') }, { value: 'cancelled', label: t('filters.cancelled') }]} />
          <FilterSelect value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1) }} ariaLabel={t('filters.allTypes')}
            options={[{ value: '', label: t('filters.allTypes') }, { value: 'purchase', label: t('filters.purchase') }, { value: 'sale', label: t('filters.sale') }, { value: 'lease', label: t('filters.lease') }, { value: 'refinance', label: t('filters.refinance') }]} />
        </div>

        {/* Table */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={localizedColumns}
            visible={txnColumns.visible}
            onToggle={txnColumns.toggle}
            onReset={txnColumns.reset}
            isOverridden={txnColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: txnGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleTxnColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {transactionsQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchData} message={transactionsQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : transactions.map((txn, idx) => (
            <div key={txn.id}
              ref={(el) => {
                if (el) txnRefs.current.set(txn.id, el)
                else txnRefs.current.delete(txn.id)
              }}
              onClick={() => router.push(`/transactions/${txn.id}`)}
              onMouseEnter={() => setFocusedTxnId(txn.id)}
              className="card-hover"
              style={{
                display: 'grid', gridTemplateColumns: txnGridTemplate, gap: 12,
                padding: '10px 16px',
                borderBottom: idx < transactions.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 12, alignItems: 'center',
                background: focusedTxnId === txn.id
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                  : (idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent'),
                outline: focusedTxnId === txn.id ? '2px solid var(--accent)' : 'none',
                outlineOffset: focusedTxnId === txn.id ? -2 : 0,
                cursor: 'pointer',
              }}>
              {visibleTxnColumns.map((c) => {
                if (c.id === 'transaction') return (
                  <div key="transaction">
                    <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{txn.escrowNumber || t('list.noEscrow')}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{txn.titleCompany || '-'}</div>
                  </div>
                )
                if (c.id === 'type') return (
                  <span key="type" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: 'var(--bg2)', color: 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{txn.type}</span>
                )
                if (c.id === 'salePrice') return (
                  <span key="salePrice" style={{ fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace' }}>{fmt.currency(txn.salePrice, { cents: true })}</span>
                )
                if (c.id === 'status') return (
                  <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[txn.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[txn.status]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content' }}>{txn.status}</span>
                )
                if (c.id === 'closingDate') return (
                  <span key="closingDate" style={{ fontSize: 11, fontFamily: 'var(--font-red-hat-mono), monospace' }}>{txn.closingDate ? fmt.date(txn.closingDate) : '-'}</span>
                )
                if (c.id === 'signatures') return (
                  <div key="signatures" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <PenTool size={11} style={{ color: 'var(--txt3)' }} />
                    <span style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontWeight: 500 }}>{txn._count?.signatures ?? 0}</span>
                  </div>
                )
                return <span key={c.id} />
              })}
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
              <div id="transaction-add-title" style={{ fontSize: 16, fontWeight: 700 }}>{t('modal.title')}</div>
              <button onClick={closeAddModal} aria-label={t('modal.close')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>{t('modal.subtitle')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.type')}</label>
                <select value={addType} onChange={e => setAddType(e.target.value)} aria-label={t('modal.type')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="purchase">{t('filters.purchase')}</option>
                  <option value="sale">{t('filters.sale')}</option>
                  <option value="lease">{t('filters.lease')}</option>
                  <option value="refinance">{t('filters.refinance')}</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.escrowNumber')}</label>
                <input value={addEscrow} onChange={e => setAddEscrow(e.target.value)} aria-label={t('modal.escrowNumber')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.titleCompany')}</label>
                <input value={addTitleCompany} onChange={e => setAddTitleCompany(e.target.value)} aria-label={t('modal.titleCompany')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.salePrice')}</label>
                <input type="number" step="1000" min="0" value={addSalePrice} onChange={e => setAddSalePrice(e.target.value)} placeholder="500000" aria-label={t('modal.salePrice')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.earnestMoney')}</label>
                <input type="number" step="500" min="0" value={addEarnest} onChange={e => setAddEarnest(e.target.value)} placeholder="5000" aria-label={t('modal.earnestMoney')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.closingDate')}</label>
                <input type="date" value={addClosingDate} onChange={e => setAddClosingDate(e.target.value)} aria-label={t('modal.closingDate')} style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>{t('modal.notes')}</label>
                <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} rows={3} aria-label={t('modal.notes')} style={{
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
            }}>{saving ? t('modal.saving') : t('modal.submit')}</button>
          </div>
        </div>
      )}
    </>
  )
}

function FilterSelect({ value, onChange, options, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
      <Filter size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)} aria-label={ariaLabel} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
