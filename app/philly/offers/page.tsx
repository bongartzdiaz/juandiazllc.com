'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, Edit2, DollarSign } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'

interface Offer {
  id: string
  propertyId: string
  contactId: string | null
  dealId: string | null
  amountCents: number
  status: string
  expiresAt: string | null
  earnestCents: number
  closingCostsCents: number
  inspectionDays: number
  financingType: string
  contingencies: string
  notes: string
  submittedAt: string
  respondedAt: string | null
  createdAt: string
  property?: { id: string; title: string; address?: string; city?: string; priceCents?: number }
  contact?: { id: string; name: string; email?: string }
  deal?: { id: string; title: string } | null
}

interface PropertyLite { id: string; title: string; address: string; priceCents: number }
interface ContactLite { id: string; name: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  accepted: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  rejected: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  countered: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  withdrawn: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  expired: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

const FINANCING_TYPES = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'fha', label: 'FHA' },
  { value: 'va', label: 'VA' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
]

const emptyForm = {
  propertyId: '',
  contactId: '',
  amount: '',
  earnest: '',
  closingCosts: '',
  inspectionDays: '10',
  financingType: 'conventional',
  expiresAt: '',
  notes: '',
}

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString()}`
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [properties, setProperties] = useState<PropertyLite[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<Offer | null>(null)

  const t = useTranslations('offers')
  const { addToast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/philly/api/offers?${params}`)
      const json = await res.json()
      setOffers(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setOffers([]) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetch('/philly/api/properties?limit=500').then(r => r.json()).then(j => {
      setProperties(Array.isArray(j.data) ? j.data : [])
    }).catch(() => {})
    fetch('/philly/api/contacts?limit=500').then(r => r.json()).then(j => {
      setContacts(Array.isArray(j.data) ? j.data : [])
    }).catch(() => {})
  }, [])

  useEntitySubscription('offer', fetchData)

  const totalValue = offers.reduce((s, o) => s + o.amountCents, 0)
  const pending = offers.filter(o => o.status === 'pending').length
  const accepted = offers.filter(o => o.status === 'accepted').length
  const decided = offers.filter(o => ['accepted', 'rejected'].includes(o.status)).length
  const acceptRate = decided > 0 ? Math.round((accepted / decided) * 100) : 0

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(o: Offer) {
    setForm({
      propertyId: o.propertyId,
      contactId: o.contactId ?? '',
      amount: String(o.amountCents / 100),
      earnest: String(o.earnestCents / 100),
      closingCosts: String(o.closingCostsCents / 100),
      inspectionDays: String(o.inspectionDays),
      financingType: o.financingType,
      expiresAt: o.expiresAt ? new Date(o.expiresAt).toISOString().slice(0, 10) : '',
      notes: o.notes ?? '',
    })
    setEditingId(o.id)
    setShowForm(true)
    setSelected(null)
  }

  async function submitForm() {
    if (!form.propertyId) { addToast('Select a property', 'error'); return }
    const amountCents = Math.round(parseFloat(form.amount) * 100)
    if (!amountCents || amountCents <= 0) { addToast('Enter a positive amount', 'error'); return }

    const payload = {
      propertyId: form.propertyId,
      contactId: form.contactId || null,
      amountCents,
      earnestCents: Math.round(parseFloat(form.earnest || '0') * 100),
      closingCostsCents: Math.round(parseFloat(form.closingCosts || '0') * 100),
      inspectionDays: parseInt(form.inspectionDays, 10) || 10,
      financingType: form.financingType,
      expiresAt: form.expiresAt || null,
      notes: form.notes,
    }

    setSaving(true)
    try {
      const res = editingId
        ? await fetch(`/philly/api/offers/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/philly/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast(editingId ? 'Offer updated' : 'Offer submitted', 'success')
      setShowForm(false)
      fetchData()
    } catch {
      addToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const payload: Record<string, unknown> = { status }
      if (['accepted', 'rejected', 'withdrawn'].includes(status)) {
        payload.respondedAt = new Date().toISOString()
      }
      const res = await fetch(`/philly/api/offers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { addToast('Update failed', 'error'); return }
      addToast(`Offer ${status}`, 'success')
      setSelected(null)
      fetchData()
    } catch { addToast('Network error', 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this offer?')) return
    try {
      const res = await fetch(`/philly/api/offers/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Offer deleted', 'success')
        setSelected(null)
        fetchData()
      } else {
        addToast('Delete failed', 'error')
      }
    } catch { addToast('Network error', 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="dollar-sign" label="Total Offer Value" value={fmtMoney(totalValue)} />
          <KpiCard icon="target" label="Pending" value={String(pending)} />
          <KpiCard icon="trending-up" label="Accepted" value={String(accepted)} />
          <KpiCard icon="chart" label="Accept Rate" value={`${acceptRate}%`} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <FilterSelect
            value={statusFilter}
            onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'countered', label: 'Countered' },
              { value: 'withdrawn', label: 'Withdrawn' },
              { value: 'expired', label: 'Expired' },
            ]}
          />
          <div style={{ flex: 1 }} />
          <button onClick={openCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> Submit Offer
          </button>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 100px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Property</span><span>Buyer</span><span>Amount</span><span>Date</span><span>Status</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : offers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
              No offers yet. Click Submit Offer to create one.
            </div>
          ) : offers.map((offer, idx) => (
            <div
              key={offer.id}
              onClick={() => setSelected(offer)}
              className="card-hover"
              style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 120px 120px 100px', gap: 12,
                padding: '10px 16px',
                borderBottom: idx < offers.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 12, alignItems: 'center', cursor: 'pointer',
                background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{offer.property?.title ?? 'Unknown'}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{offer.property?.address ?? ''}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{offer.contact?.name ?? '-'}</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace' }}>{fmtMoney(offer.amountCents)}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-red-hat-mono), monospace' }}>{new Date(offer.submittedAt).toLocaleDateString()}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                textTransform: 'uppercase',
                background: STATUS_COLORS[offer.status]?.bg ?? 'var(--bg2)',
                color: STATUS_COLORS[offer.status]?.txt ?? 'var(--txt2)',
                justifySelf: 'start',
              }}>{offer.status}</span>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Detail modal with Accept/Reject/Counter/Withdraw */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.property?.title ?? 'Offer'}
        subtitle={selected?.property?.address ?? ''}
        size="md"
      >
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase',
                background: STATUS_COLORS[selected.status]?.bg ?? 'var(--bg2)',
                color: STATUS_COLORS[selected.status]?.txt ?? 'var(--txt2)',
              }}>{selected.status}</span>
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                background: 'var(--bg2)', color: 'var(--txt2)',
              }}>{selected.financingType.toUpperCase()}</span>
            </div>

            {/* Financials grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatTile label="Offer Amount" value={fmtMoney(selected.amountCents)} highlight />
              <StatTile
                label="List Price"
                value={selected.property?.priceCents != null ? fmtMoney(selected.property.priceCents) : '—'}
              />
              <StatTile label="Earnest" value={fmtMoney(selected.earnestCents)} />
              <StatTile label="Closing Costs" value={fmtMoney(selected.closingCostsCents)} />
              <StatTile label="Inspection" value={`${selected.inspectionDays} days`} />
              <StatTile label="Buyer" value={selected.contact?.name ?? '—'} />
            </div>

            {selected.property?.priceCents != null && selected.property.priceCents > 0 && (
              <div style={{
                padding: 12, background: 'var(--bg2)', borderRadius: 10,
                fontSize: 12, color: 'var(--txt2)',
              }}>
                <strong style={{ color: 'var(--txt)' }}>
                  {((selected.amountCents / selected.property.priceCents) * 100).toFixed(1)}%
                </strong>{' '}
                of list price
                {selected.amountCents < selected.property.priceCents && (
                  <span style={{ color: 'var(--r-txt)', marginLeft: 6 }}>
                    (−{fmtMoney(selected.property.priceCents - selected.amountCents)})
                  </span>
                )}
                {selected.amountCents > selected.property.priceCents && (
                  <span style={{ color: 'var(--g-txt)', marginLeft: 6 }}>
                    (+{fmtMoney(selected.amountCents - selected.property.priceCents)})
                  </span>
                )}
              </div>
            )}

            {selected.notes && (
              <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                <div style={{ fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
              </div>
            )}

            {/* Status actions */}
            {!['accepted', 'rejected', 'withdrawn', 'expired'].includes(selected.status) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBtn onClick={() => changeStatus(selected.id, 'accepted')} color="#fff" bg="var(--g)">
                  <CheckCircle2 size={12} /> Accept
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'rejected')} color="#fff" bg="var(--r)">
                  <XCircle size={12} /> Reject
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'countered')} color="var(--b-txt)" bg="transparent" border="var(--b-border)">
                  <RefreshCw size={12} /> Counter
                </StatusBtn>
                <StatusBtn onClick={() => changeStatus(selected.id, 'withdrawn')} color="var(--txt2)" bg="transparent" border="var(--border)">
                  Withdraw
                </StatusBtn>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button onClick={() => handleDelete(selected.id)} style={outlineBtn('var(--r-txt)', 'var(--r-border)')}>
                <Trash2 size={12} /> Delete
              </button>
              <div style={{ flex: 1 }} />
              <button onClick={() => openEdit(selected)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Edit2 size={12} /> Edit
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit form */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false) }}
        title={editingId ? 'Edit Offer' : 'Submit Offer'}
        subtitle={editingId ? 'Update offer details' : 'Enter buyer offer terms'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Property">
            <select
              value={form.propertyId}
              onChange={e => setForm({ ...form, propertyId: e.target.value })}
              disabled={!!editingId}
              style={inputStyle}
            >
              <option value="">Select a property…</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} — {p.address} {p.priceCents ? `(${fmtMoney(p.priceCents)})` : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Buyer (contact)">
            <select
              value={form.contactId}
              onChange={e => setForm({ ...form, contactId: e.target.value })}
              style={inputStyle}
            >
              <option value="">No contact linked</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Offer Amount ($)">
              <input
                type="number"
                min="0"
                step="1000"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="500000"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Earnest Money ($)">
              <input
                type="number"
                min="0"
                step="500"
                value={form.earnest}
                onChange={e => setForm({ ...form, earnest: e.target.value })}
                placeholder="5000"
                style={inputStyle}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <FormField label="Closing Costs ($)">
              <input
                type="number" min="0" step="500"
                value={form.closingCosts}
                onChange={e => setForm({ ...form, closingCosts: e.target.value })}
                placeholder="0"
                style={inputStyle}
              />
            </FormField>
            <FormField label="Inspection (days)">
              <input
                type="number" min="0" max="60"
                value={form.inspectionDays}
                onChange={e => setForm({ ...form, inspectionDays: e.target.value })}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Financing">
              <select
                value={form.financingType}
                onChange={e => setForm({ ...form, financingType: e.target.value })}
                style={inputStyle}
              >
                {FINANCING_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Offer Expires (optional)">
            <input
              type="date"
              value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              style={inputStyle}
            />
          </FormField>

          <FormField label="Notes (optional)">
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Contingencies, seller concessions, closing preferences…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={submitForm} disabled={saving} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>
              <DollarSign size={12} />
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Submit Offer'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--txt)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
}

function outlineBtn(color: string, border: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    background: 'transparent', color,
    border: `1px solid ${border}`, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function StatusBtn({ onClick, color, bg, border, children }: { onClick: () => void; color: string; bg: string; border?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '7px 13px', borderRadius: 8,
      background: bg, color,
      border: border ? `1px solid ${border}` : 'none',
      fontSize: 11, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
  )
}

function StatTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: highlight ? 18 : 14,
        fontWeight: 700, color: highlight ? 'var(--accent)' : 'var(--txt)',
        fontFamily: 'var(--font-red-hat-mono), monospace',
      }}>{value}</div>
    </div>
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
