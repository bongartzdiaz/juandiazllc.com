'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Mail, Phone, Clock, Calendar as CalIcon, Plus, Trash2, Edit2 } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useFormat } from '@/hooks/philly/useFormat'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const VOL_COLUMNS: ColumnDef[] = [
  { id: 'name', label: 'Name', required: true },
  { id: 'email', label: 'Email' },
  { id: 'status', label: 'Status' },
  { id: 'hours', label: 'Hours' },
  { id: 'logs', label: 'Logs' },
]
const VOL_DEFAULTS = ['name', 'email', 'status', 'hours', 'logs']
const VOL_WIDTHS: Record<string, string> = {
  name: '1fr',
  email: '180px',
  status: '120px',
  hours: '80px',
  logs: '80px',
}

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

const emptyForm = { name: '', email: '', phone: '', status: 'onboarding' }

export default function VolunteersPage() {
  const t = useTranslations('volunteers')
  const { addToast } = useToast()
  // LOC-03 — locale-bound number/date formatting (hours are a count).
  const fmt = useFormat()
  const fmtNumber = (n: number) => fmt.number(n)
  const fmtDate = (iso: string) => fmt.date(iso)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Volunteer | null>(null)

  // Bundle AH — column visibility prefs.
  const volColumns = useColumnPrefs('pai-volunteers-columns-v1', VOL_DEFAULTS)
  const visibleVolColumns = useMemo(
    () => VOL_COLUMNS.filter((c) => c.required || volColumns.visible.has(c.id)),
    [volColumns.visible],
  )
  const volsGridTemplate = useMemo(
    () => visibleVolColumns.map((c) => VOL_WIDTHS[c.id]).join(' '),
    [visibleVolColumns],
  )

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (statusFilter) params.set('status', statusFilter)
  interface VolunteersResponse { data: Volunteer[]; pagination: { total: number; totalPages: number } }
  const volunteersQuery = useApi<VolunteersResponse>(`/volunteers?${params}`)
  const volunteers = volunteersQuery.data?.data ?? []
  const total = volunteersQuery.data?.pagination.total ?? 0
  const totalPages = volunteersQuery.data?.pagination.totalPages ?? 0
  const loading = volunteersQuery.loading
  const fetchData = volunteersQuery.refetch

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(emptyForm); setEditingId(null); setShowForm(true)
  }

  function openEdit(v: Volunteer) {
    setForm({ name: v.name, email: v.email, phone: v.phone, status: v.status })
    setEditingId(v.id); setShowForm(true); setSelected(null)
  }

  async function submitForm() {
    if (!form.name.trim()) { addToast(t('toasts.nameRequired'), 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status,
      }
      const res = editingId
        ? await fetch(`/api/volunteers/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/volunteers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(editingId ? t('toasts.updated') : t('toasts.added'), 'success')
      setShowForm(false)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirms.remove'))) return
    try {
      const res = await fetch(`/api/volunteers/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.removed'), 'success')
        setSelected(null)
        fetchData()
      } else { addToast(t('toasts.deleteFailed'), 'error') }
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  // Live-refresh on any volunteer mutation in the org
  useEntitySubscription('volunteer', fetchData)

  const active = volunteers.filter(v => v.status === 'active').length
  const totalHours = volunteers.reduce((s, v) => s + v.totalHours, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="users" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="target" label={t('kpis.active')} value={String(active)} />
          <KpiCard icon="calendar" label={t('kpis.totalHours')} value={fmtNumber(totalHours)} />
          <KpiCard icon="trending-down" label={t('filters.inactive')} value={String(volunteers.filter(v => v.status === 'inactive').length)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} aria-label={t('filters.all')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">{t('filters.all')}</option>
              <option value="active">{t('filters.active')}</option>
              <option value="inactive">{t('filters.inactive')}</option>
              <option value="onboarding">Onboarding</option>
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
            <Plus size={13} /> {t('newVolunteer')}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={VOL_COLUMNS}
            visible={volColumns.visible}
            onToggle={volColumns.toggle}
            onReset={volColumns.reset}
            isOverridden={volColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: volsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleVolColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {volunteersQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchData} message={volunteersQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : volunteers.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : volunteers.map((vol, idx) => {
            const sc = STATUS_COLORS[vol.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div
                key={vol.id}
                onClick={() => setSelected(vol)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: volsGridTemplate, gap: 12,
                  padding: '10px 16px',
                  borderBottom: idx < volunteers.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                {visibleVolColumns.map((c) => {
                  if (c.id === 'name') return (
                    <div key="name">
                      <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{vol.name}</div>
                      {vol.phone && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{vol.phone}</div>}
                    </div>
                  )
                  if (c.id === 'email') return <span key="email" style={{ color: 'var(--txt2)', fontSize: 11 }}>{vol.email || '-'}</span>
                  if (c.id === 'status') return <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, display: 'inline-block', maxWidth: 'fit-content' }}>{vol.status}</span>
                  if (c.id === 'hours') return <span key="hours" style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontWeight: 600 }}>{vol.totalHours}</span>
                  if (c.id === 'logs') return <span key="logs" style={{ color: 'var(--txt3)' }}>{vol._count.volunteerLogs}</span>
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
        title={selected?.name ?? ''}
        subtitle={selected ? `Joined ${fmtDate(selected.createdAt)}` : ''}
        size="md"
      >
        {selected && (() => {
          const v = selected
          const sc = STATUS_COLORS[v.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.txt }}>{v.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailTile icon={Mail} label={t('fields.email')} value={v.email || '-'} />
                <DetailTile icon={Phone} label={t('fields.phone')} value={v.phone || '-'} />
                <DetailTile icon={Clock} label={t('kpis.totalHours')} value={fmtNumber(v.totalHours)} />
                <DetailTile icon={CalIcon} label={t('fields.activityLogs')} value={String(v._count.volunteerLogs)} />
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleDelete(v.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'transparent', color: 'var(--r-txt)',
                    border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Trash2 size={12} /> Remove
                </button>
                <div style={{ flex: 1 }} />
                {v.email && (
                  <a href={`mailto:${v.email}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                    border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                    textDecoration: 'none', fontFamily: 'inherit',
                  }}>
                    <Mail size={12} /> Email
                  </a>
                )}
                <button onClick={() => openEdit(v)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Edit2 size={12} /> Edit
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false) }}
        title={editingId ? t('editVolunteer') : t('newVolunteer')}
        subtitle={editingId ? 'Update contact details' : 'Onboard a new volunteer'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label={t('fields.name')}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} aria-label={t('fields.name')} style={inputStyle} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('fields.email')}>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="volunteer@example.com" aria-label={t('fields.email')} style={inputStyle} />
            </FormField>
            <FormField label={t('fields.phone')}>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 555 0100" aria-label={t('fields.phone')} style={inputStyle} />
            </FormField>
          </div>
          <FormField label={t('fields.status')}>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} aria-label={t('fields.status')} style={inputStyle}>
              <option value="onboarding">{t('filters.onboarding')}</option>
              <option value="active">{t('filters.active')}</option>
              <option value="inactive">{t('filters.inactive')}</option>
            </select>
          </FormField>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
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
            }}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add Volunteer'}</button>
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
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
