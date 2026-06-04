'use client'

import { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Users, Filter, Plus, X, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useFormat } from '@/hooks/philly/useFormat'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { fetchJson } from '@/lib/philly/fetch-json'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const REF_COLUMNS: ColumnDef[] = [
  { id: 'referrer', label: 'Referrer', required: true },
  { id: 'referred', label: 'Referred' },
  { id: 'pct', label: 'Pct' },
  { id: 'commission', label: 'Commission' },
  { id: 'status', label: 'Status' },
  { id: 'actions', label: 'Actions', required: true },
]
const REF_DEFAULTS = ['referrer', 'referred', 'pct', 'commission', 'status', 'actions']
const REF_WIDTHS: Record<string, string> = {
  referrer: '1fr', referred: '1fr', pct: '80px',
  commission: '100px', status: '90px', actions: '100px',
}

interface Referral {
  id: string
  referrerId: string
  referredId: string
  dealId: string | null
  status: string
  commissionPct: number
  commissionCents: number
  notes: string
  createdAt: string
  referrer?: { id: string; name: string } | null
  referred?: { id: string; name: string } | null
}

interface ContactLite { id: string; name: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  active: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  closed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  paid: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
}

export default function ReferralsPage() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  interface ReferralsResponse { data: Referral[]; pagination: { total: number; totalPages: number } }
  const referralsQuery = useApi<ReferralsResponse>(`/referrals?${params}`)
  const referrals = referralsQuery.data?.data ?? []
  const total = referralsQuery.data?.pagination.total ?? 0
  const totalPages = referralsQuery.data?.pagination.totalPages ?? 0
  const loading = referralsQuery.loading
  const fetchReferrals = referralsQuery.refetch
  const [addReferrerId, setAddReferrerId] = useState('')
  const [addReferredId, setAddReferredId] = useState('')
  const [addCommissionPct, setAddCommissionPct] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const t = useTranslations('referrals')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const { addToast } = useToast()
  // LOC-03 — locale-bound currency, replacing the old $-hardcoded display.
  const fmt = useFormat()
  const fmtMoney = (cents: number) => fmt.currency(cents, { cents: true })

  // Bundle AJ — column visibility prefs.
  const refColumns = useColumnPrefs('pai-referrals-columns-v1', REF_DEFAULTS)
  const visibleRefColumns = useMemo(
    () => REF_COLUMNS.filter((c) => c.required || refColumns.visible.has(c.id)),
    [refColumns.visible],
  )
  const refsGridTemplate = useMemo(
    () => visibleRefColumns.map((c) => REF_WIDTHS[c.id]).join(' '),
    [visibleRefColumns],
  )

  useEffect(() => {
    // Bundle CK — fetchJson surfaces non-2xx as a typed error so a
    // 401 / 500 doesn't silently fall to "[]" and look like an empty
    // contact picker.
    fetchJson<{ data: ContactLite[] }>('/api/contacts?limit=500')
      .then(j => setContacts(Array.isArray(j.data) ? j.data.map((c: ContactLite) => ({ id: c.id, name: c.name })) : []))
      .catch(err => addToast(err instanceof Error ? err.message : t('toasts.loadFailed'), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.marked', { status }), 'success')
      fetchReferrals()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ title: t('confirms.delete'), confirmLabel: tCommon('delete'), cancelLabel: tCommon('cancel'), danger: true })
    if (!ok) return
    try {
      const res = await fetch(`/api/referrals?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.deleted'), 'success')
        fetchReferrals()
      }
    } catch {}
  }

  const handleAddReferral = async () => {
    if (saving) return
    if (!addReferrerId || !addReferredId) {
      setAddError('Referrer ID and Referred ID are required')
      return
    }
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrerId: addReferrerId,
          referredId: addReferredId,
          commissionPct: Number(addCommissionPct) || 0,
          notes: addNotes,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      setAddReferrerId(''); setAddReferredId(''); setAddCommissionPct(''); setAddNotes('')
      setAddError(null)
      setShowAdd(false)
      fetchReferrals()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const totalReferrals = total
  const activeCount = referrals.filter(r => r.status === 'active').length
  const totalCommission = referrals.reduce((s, r) => s + r.commissionCents, 0)
  const paidOut = referrals.filter(r => r.status === 'paid').reduce((s, r) => s + r.commissionCents, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Referral" />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="users" label="Total Referrals" value={String(totalReferrals)} />
          <KpiCard icon="trending-up" label="Active" value={String(activeCount)} />
          <KpiCard icon="dollar-sign" label="Total Commission" value={fmtMoney(totalCommission)} />
          <KpiCard icon="dollar-sign" label="Paid Out" value={fmtMoney(paidOut)} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }} ariaLabel="All Statuses"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'paid', label: 'Paid' },
            ]} />
        </div>

        {/* Table */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={REF_COLUMNS}
            visible={refColumns.visible}
            onToggle={refColumns.toggle}
            onReset={refColumns.reset}
            isOverridden={refColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: refsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleRefColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {referralsQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchReferrals} message={referralsQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : referrals.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : referrals.map((ref, idx) => (
            <div key={ref.id} style={{ display: 'grid', gridTemplateColumns: refsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: idx < referrals.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              {visibleRefColumns.map((c) => {
                if (c.id === 'referrer') return (
                  <div key="referrer" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <Users size={13} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ref.referrer?.name ?? `#${ref.referrerId.slice(0, 6)}`}
                    </span>
                  </div>
                )
                if (c.id === 'referred') return (
                  <div key="referred" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <ArrowRight size={12} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--txt2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ref.referred?.name ?? `#${ref.referredId.slice(0, 6)}`}
                    </span>
                  </div>
                )
                if (c.id === 'pct') return <span key="pct" className="mono" style={{ fontWeight: 600 }}>{ref.commissionPct}%</span>
                if (c.id === 'commission') return <span key="commission" className="mono" style={{ fontWeight: 600, color: 'var(--g-txt)' }}>{fmtMoney(ref.commissionCents)}</span>
                if (c.id === 'status') return <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', background: STATUS_COLORS[ref.status]?.bg ?? 'var(--bg2)', color: STATUS_COLORS[ref.status]?.txt ?? 'var(--txt2)', justifySelf: 'start' }}>{ref.status}</span>
                if (c.id === 'actions') return (
                  <div key="actions" style={{ display: 'flex', gap: 4 }}>
                    {ref.status !== 'paid' && (
                      <button onClick={() => changeStatus(ref.id, 'paid')} title="Mark paid" style={miniBtn('var(--g-txt)')}>
                        <CheckCircle2 size={11} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(ref.id)} title="Delete" style={miniBtn('var(--r-txt)')}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )
                return <span key={c.id} />
              })}
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Add Modal */}
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
            aria-labelledby="referral-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div id="referral-add-title" style={{ fontSize: 16, fontWeight: 700 }}>Add Referral</div>
              <button onClick={closeAddModal} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new referral record</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Referrer (who referred)</label>
                <select value={addReferrerId} onChange={e => setAddReferrerId(e.target.value)} aria-label="Referrer (who referred)" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="">Select referrer…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Referred (new lead)</label>
                <select value={addReferredId} onChange={e => setAddReferredId(e.target.value)} aria-label="Referred (new lead)" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }}>
                  <option value="">Select referred contact…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Commission %</label>
                <input type="number" min={0} max={100} value={addCommissionPct} onChange={e => setAddCommissionPct(e.target.value)} placeholder="e.g. 25" aria-label="Commission %" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Notes</label>
                <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Optional notes" rows={3} aria-label="Notes" style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg2)',
                  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  resize: 'vertical',
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
            <button onClick={handleAddReferral} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} />
                {saving ? 'Saving...' : 'Add Referral'}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function miniBtn(color: string): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 6,
    background: 'transparent', border: '1px solid var(--border)',
    color, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
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
