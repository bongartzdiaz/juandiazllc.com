'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Euro, Calendar as CalIcon, Building2, CheckCircle2, Plus, Trash2, Edit2 } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'

const GRANT_COLUMNS: ColumnDef[] = [
  { id: 'grant', label: 'Grant', required: true },
  { id: 'funder', label: 'Funder' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
  { id: 'dates', label: 'Dates' },
]
const GRANT_DEFAULTS = ['grant', 'funder', 'amount', 'status', 'dates']
const GRANT_WIDTHS: Record<string, string> = {
  grant: '1fr',
  funder: '150px',
  amount: '120px',
  status: '100px',
  dates: '140px',
}

interface Grant {
  id: string
  title: string
  funder: string
  amountCents: number
  status: string
  appliedDate: string | null
  awardedDate: string | null
  startDate: string | null
  endDate: string | null
  description?: string
  requirements?: string
  createdAt: string
}

const emptyForm = {
  title: '', funder: '', amount: '', status: 'prospect',
  appliedDate: '', awardedDate: '', startDate: '', endDate: '',
  description: '', requirements: '',
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  prospect: { bg: 'var(--bg2)', txt: 'var(--txt2)' },
  applied: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  under_review: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  approved: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  reporting: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)' },
  closed: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  rejected: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

function fmtDate(s: string | null) {
  return s ? new Date(s).toLocaleDateString() : '-'
}

export default function GrantsPage() {
  const t = useTranslations('grants')
  const { addToast } = useToast()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Grant | null>(null)

  // Bundle AH — column visibility prefs.
  const grantColumns = useColumnPrefs('pai-grants-columns-v1', GRANT_DEFAULTS)
  const visibleGrantColumns = useMemo(
    () => GRANT_COLUMNS.filter((c) => c.required || grantColumns.visible.has(c.id)),
    [grantColumns.visible],
  )
  const grantsGridTemplate = useMemo(
    () => visibleGrantColumns.map((c) => GRANT_WIDTHS[c.id]).join(' '),
    [visibleGrantColumns],
  )

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (statusFilter) params.set('status', statusFilter)
  interface GrantsResponse { data: Grant[]; pagination: { total: number; totalPages: number } }
  const grantsQuery = useApi<GrantsResponse>(`/grants?${params}`)
  const grants = grantsQuery.data?.data ?? []
  const total = grantsQuery.data?.pagination.total ?? 0
  const totalPages = grantsQuery.data?.pagination.totalPages ?? 0
  const loading = grantsQuery.loading
  const fetchData = grantsQuery.refetch

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(g: Grant) {
    setForm({
      title: g.title,
      funder: g.funder,
      amount: String(g.amountCents / 100),
      status: g.status,
      appliedDate: g.appliedDate ? new Date(g.appliedDate).toISOString().slice(0, 10) : '',
      awardedDate: g.awardedDate ? new Date(g.awardedDate).toISOString().slice(0, 10) : '',
      startDate: g.startDate ? new Date(g.startDate).toISOString().slice(0, 10) : '',
      endDate: g.endDate ? new Date(g.endDate).toISOString().slice(0, 10) : '',
      description: g.description ?? '',
      requirements: g.requirements ?? '',
    })
    setEditingId(g.id)
    setShowForm(true)
    setSelected(null)
  }

  async function submitForm() {
    if (!form.title.trim()) { addToast('Title required', 'error'); return }
    if (!form.funder.trim()) { addToast('Funder required', 'error'); return }
    const amountCents = Math.round((parseFloat(form.amount) || 0) * 100)
    if (amountCents < 0) { addToast('Invalid amount', 'error'); return }

    const payload = {
      title: form.title.trim(),
      funder: form.funder.trim(),
      amountCents,
      status: form.status,
      appliedDate: form.appliedDate || null,
      awardedDate: form.awardedDate || null,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description,
      requirements: form.requirements,
    }

    setSaving(true)
    try {
      const res = editingId
        ? await fetch(`/api/grants/${editingId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/grants', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast(editingId ? 'Grant updated' : 'Grant added', 'success')
      setShowForm(false)
      fetchData()
    } catch { addToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this grant?')) return
    try {
      const res = await fetch(`/api/grants/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Grant deleted', 'success')
        setSelected(null)
        fetchData()
      } else { addToast('Delete failed', 'error') }
    } catch { addToast('Network error', 'error') }
  }

  // Live-refresh on any grant mutation in the org
  useEntitySubscription('grant', fetchData)

  const totalFunding = grants.reduce((s, g) => s + g.amountCents, 0)
  const activeGrants = grants.filter(g => g.status === 'active' || g.status === 'approved')
  const pending = grants.filter(g => g.status === 'applied' || g.status === 'under_review')

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="award" label="Total Grants" value={String(total)} />
          <KpiCard icon="dollar-sign" label="Total Funding" value={`$${(totalFunding / 100).toLocaleString()}`} />
          <KpiCard icon="target" label="Active" value={String(activeGrants.length)} />
          <KpiCard icon="calendar" label="Pending" value={String(pending.length)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={openCreate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
          }}>
            <Plus size={13} /> New Grant
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={GRANT_COLUMNS}
            visible={grantColumns.visible}
            onToggle={grantColumns.toggle}
            onReset={grantColumns.reset}
            isOverridden={grantColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: grantsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleGrantColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : grants.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No grants found.</div>
          ) : grants.map((grant, idx) => {
            const sc = STATUS_COLORS[grant.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div
                key={grant.id}
                onClick={() => setSelected(grant)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: grantsGridTemplate, gap: 12,
                  padding: '10px 16px',
                  borderBottom: idx < grants.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                {visibleGrantColumns.map((c) => {
                  if (c.id === 'grant') return <div key="grant" style={{ fontWeight: 600, color: 'var(--txt)' }}>{grant.title}</div>
                  if (c.id === 'funder') return <span key="funder" style={{ color: 'var(--txt2)' }}>{grant.funder || '-'}</span>
                  if (c.id === 'amount') return <span key="amount" style={{ fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace' }}>${(grant.amountCents / 100).toLocaleString()}</span>
                  if (c.id === 'status') return <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, display: 'inline-block', maxWidth: 'fit-content' }}>{grant.status.replace('_', ' ')}</span>
                  if (c.id === 'dates') return <span key="dates" style={{ fontSize: 10, color: 'var(--txt3)' }}>{grant.startDate ? new Date(grant.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '-'}</span>
                  return <span key={c.id} />
                })}
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ''}
        subtitle={selected?.funder ?? ''}
        size="md"
      >
        {selected && (() => {
          const g = selected
          const sc = STATUS_COLORS[g.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.txt }}>{g.status.replace('_', ' ')}</span>
              </div>

              <div style={{ padding: 16, background: 'var(--bg2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Euro size={18} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Grant Amount</div>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', marginTop: 2 }}>
                    ${(g.amountCents / 100).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailTile icon={Building2} label="Funder" value={g.funder || '-'} />
                <DetailTile icon={CheckCircle2} label="Applied" value={fmtDate(g.appliedDate)} />
                <DetailTile icon={CheckCircle2} label="Awarded" value={fmtDate(g.awardedDate)} />
                <DetailTile icon={CalIcon} label="Period" value={`${fmtDate(g.startDate)} → ${fmtDate(g.endDate)}`} />
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button
                  onClick={() => handleDelete(g.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'transparent', color: 'var(--r-txt)',
                    border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Trash2 size={12} /> Delete
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => openEdit(g)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    padding: '9px 14px', borderRadius: 8,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                    border: '1px solid var(--border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Create / Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false) }}
        title={editingId ? 'Edit Grant' : 'New Grant'}
        subtitle={editingId ? 'Update grant details' : 'Track a grant from application to award'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Grant Title">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Community Housing Fund" style={inputStyle} />
            </FormField>
            <FormField label="Amount ($)">
              <input type="number" min="0" step="1000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50000" style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label="Funder">
              <input value={form.funder} onChange={e => setForm({ ...form, funder: e.target.value })} placeholder="Foundation name" style={inputStyle} />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label="Applied Date">
              <input type="date" value={form.appliedDate} onChange={e => setForm({ ...form, appliedDate: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="Awarded Date">
              <input type="date" value={form.awardedDate} onChange={e => setForm({ ...form, awardedDate: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="Start Date">
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} style={inputStyle} />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Grant purpose and scope…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <FormField label="Requirements / Reporting">
            <textarea rows={2} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })}
              placeholder="Reporting deadlines, deliverables…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>

          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={submitForm} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add Grant'}</button>
          </div>
        </div>
      </Modal>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
}

function DetailTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icon size={11} style={{ color: 'var(--txt3)' }} />
        {label}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--txt)', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
