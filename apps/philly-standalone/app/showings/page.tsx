'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Star, Plus, Trash2, CheckCircle2, Edit2 } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'
import { useFormat } from '@/hooks/philly/useFormat'

const SHOWING_COLUMNS: ColumnDef[] = [
  { id: 'property', label: 'Property', required: true },
  { id: 'date', label: 'Date/Time' },
  { id: 'duration', label: 'Duration' },
  { id: 'rating', label: 'Rating' },
  { id: 'status', label: 'Status' },
]
const SHOWING_DEFAULTS = ['property', 'date', 'duration', 'rating', 'status']
const SHOWING_WIDTHS: Record<string, string> = {
  property: '1fr',
  date: '160px',
  duration: '80px',
  rating: '80px',
  status: '100px',
}

interface Showing {
  id: string
  propertyId: string
  agentId: string | null
  contactId: string | null
  date: string
  duration: number
  status: string
  feedback: string
  rating: number | null
  notes: string
  createdAt: string
  property?: { id: string; title: string; address: string; city?: string }
}

interface PropertyLite { id: string; title: string; address: string }
interface ContactLite { id: string; name: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  scheduled: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  confirmed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  completed: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
  no_show: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
}

const emptyForm = {
  propertyId: '',
  contactId: '',
  date: '',
  time: '10:00',
  duration: '30',
  notes: '',
}

export default function ShowingsPage() {
  const [properties, setProperties] = useState<PropertyLite[]>([])
  const [contacts, setContacts] = useState<ContactLite[]>([])
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)
  interface ShowingsResponse { data: Showing[]; pagination: { total: number; totalPages: number } }
  const showingsQuery = useApi<ShowingsResponse>(`/showings?${params}`)
  const showings = showingsQuery.data?.data ?? []
  const total = showingsQuery.data?.pagination.total ?? 0
  const totalPages = showingsQuery.data?.pagination.totalPages ?? 0
  const loading = showingsQuery.loading
  const fetchData = showingsQuery.refetch

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<Showing | null>(null)
  const [feedback, setFeedback] = useState('')
  const [rating, setRating] = useState<number | null>(null)

  const t = useTranslations('showings')
  const { addToast } = useToast()
  // LOC-03 — locale-bound date/time, replacing native toLocale*String().
  const fmt = useFormat()

  // Bundle BS — column visibility prefs.
  const showingColumns = useColumnPrefs('pai-showings-columns-v1', SHOWING_DEFAULTS)
  const visibleShowingColumns = useMemo(
    () => SHOWING_COLUMNS.filter((c) => c.required || showingColumns.visible.has(c.id)),
    [showingColumns.visible],
  )
  const showingsGridTemplate = useMemo(
    () => visibleShowingColumns.map((c) => SHOWING_WIDTHS[c.id]).join(' '),
    [visibleShowingColumns],
  )

  useEffect(() => {
    fetch('/api/properties?limit=500').then(r => r.json()).then(j => {
      setProperties(Array.isArray(j.data) ? j.data.map((p: PropertyLite) => ({ id: p.id, title: p.title, address: p.address })) : [])
    }).catch(() => {})
    fetch('/api/contacts?limit=500').then(r => r.json()).then(j => {
      setContacts(Array.isArray(j.data) ? j.data.map((c: ContactLite) => ({ id: c.id, name: c.name })) : [])
    }).catch(() => {})
  }, [])

  useEntitySubscription('showing', fetchData)

  const scheduled = showings.filter(s => s.status === 'scheduled' || s.status === 'confirmed').length
  const completed = showings.filter(s => s.status === 'completed').length
  const rated = showings.filter(s => s.rating != null)
  const avgRating = rated.length ? rated.reduce((s, sh) => s + (sh.rating ?? 0), 0) / rated.length : 0

  function openCreate() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(sh: Showing) {
    const d = new Date(sh.date)
    const pad = (n: number) => String(n).padStart(2, '0')
    setForm({
      propertyId: sh.propertyId,
      contactId: sh.contactId ?? '',
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      duration: String(sh.duration),
      notes: sh.notes ?? '',
    })
    setEditingId(sh.id)
    setShowForm(true)
    setSelected(null)
  }

  async function submitForm() {
    if (!form.propertyId) { addToast(t('toasts.selectProperty'), 'error'); return }
    if (!form.date) { addToast(t('toasts.pickDate'), 'error'); return }
    const duration = Number(form.duration) || 30
    const dateISO = new Date(`${form.date}T${form.time}:00`).toISOString()

    setSaving(true)
    try {
      const payload = {
        propertyId: form.propertyId,
        contactId: form.contactId || null,
        date: dateISO,
        duration,
        notes: form.notes,
      }
      const res = editingId
        ? await fetch(`/api/showings/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateISO, notes: form.notes }),
          })
        : await fetch('/api/showings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(editingId ? t('toasts.updated') : t('toasts.scheduled'), 'success')
      setShowForm(false)
      fetchData()
    } catch {
      addToast(t('toasts.networkError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/showings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.marked', { status: status.replace('_', ' ') }), 'success')
      setSelected(null)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  async function saveFeedback() {
    if (!selected) return
    try {
      const res = await fetch(`/api/showings/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, rating, status: 'completed' }),
      })
      if (!res.ok) { addToast(t('toasts.saveFailed'), 'error'); return }
      addToast(t('toasts.feedbackSaved'), 'success')
      setSelected(null)
      setFeedback(''); setRating(null)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirms.delete'))) return
    try {
      const res = await fetch(`/api/showings/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.deleted'), 'success')
        setSelected(null)
        fetchData()
      } else {
        addToast(t('toasts.deleteFailed'), 'error')
      }
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  function openDetail(sh: Showing) {
    setSelected(sh)
    setFeedback(sh.feedback ?? '')
    setRating(sh.rating)
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="calendar" label="Total Showings" value={String(total)} />
          <KpiCard icon="target" label="Scheduled" value={String(scheduled)} />
          <KpiCard icon="chart" label="Completed" value={String(completed)} />
          <KpiCard icon="award" label="Avg Rating" value={avgRating ? avgRating.toFixed(1) : '-'} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'no_show', label: 'No Show' },
            ]} />
          <div style={{ flex: 1 }} />
          <ColumnPicker
            columns={SHOWING_COLUMNS}
            visible={showingColumns.visible}
            onToggle={showingColumns.toggle}
            onReset={showingColumns.reset}
            isOverridden={showingColumns.isOverridden}
          />
          <button
            onClick={openCreate}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={13} /> Schedule Showing
          </button>
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: showingsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleShowingColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {showingsQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchData} message={showingsQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : showings.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : showings.map((showing, idx) => {
            const d = new Date(showing.date)
            return (
              <div
                key={showing.id}
                onClick={() => openDetail(showing)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: showingsGridTemplate, gap: 12,
                  padding: '10px 16px',
                  borderBottom: idx < showings.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                }}
              >
                {visibleShowingColumns.map((c) => {
                  if (c.id === 'property') return (
                    <div key="property">
                      <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{showing.property?.title ?? 'Unknown'}</div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{showing.property?.address ?? ''}</div>
                    </div>
                  )
                  if (c.id === 'date') return (
                    <div key="date">
                      <div style={{ fontWeight: 500, fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>
                        {fmt.date(d)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                        {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  )
                  if (c.id === 'duration') return (
                    <span key="duration" style={{ fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--txt2)' }}>{showing.duration}min</span>
                  )
                  if (c.id === 'rating') return (
                    <div key="rating" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {showing.rating != null ? (
                        <>
                          <Star size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                          <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace" }}>{showing.rating}</span>
                        </>
                      ) : <span style={{ fontSize: 10, color: 'var(--txt3)' }}>-</span>}
                    </div>
                  )
                  if (c.id === 'status') return (
                    <span key="status" style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase',
                      background: STATUS_COLORS[showing.status]?.bg ?? 'var(--bg2)',
                      color: STATUS_COLORS[showing.status]?.txt ?? 'var(--txt2)',
                      justifySelf: 'start',
                    }}>{showing.status.replace('_', ' ')}</span>
                  )
                  return <span key={c.id} />
                })}
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Detail modal with status actions + feedback */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.property?.title ?? 'Showing'}
        subtitle={selected?.property?.address ?? ''}
        size="md"
      >
        {selected && (() => {
          const d = new Date(selected.date)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase',
                  background: STATUS_COLORS[selected.status]?.bg ?? 'var(--bg2)',
                  color: STATUS_COLORS[selected.status]?.txt ?? 'var(--txt2)',
                }}>{selected.status.replace('_', ' ')}</span>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                }}>{fmt.dateTime(d)}</span>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                }}>{selected.duration} min</span>
              </div>

              {selected.notes && (
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}

              {/* Status actions */}
              {selected.status !== 'completed' && selected.status !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <StatusBtn onClick={() => changeStatus(selected.id, 'confirmed')} color="var(--b-txt)" border="var(--b-border)">
                    Confirm
                  </StatusBtn>
                  <StatusBtn onClick={() => changeStatus(selected.id, 'no_show')} color="var(--y-txt)" border="var(--y-border)">
                    No Show
                  </StatusBtn>
                  <StatusBtn onClick={() => changeStatus(selected.id, 'cancelled')} color="var(--r-txt)" border="var(--r-border)">
                    Cancel
                  </StatusBtn>
                </div>
              )}

              {/* Feedback section */}
              <div style={{ padding: 14, background: 'var(--bg2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', marginBottom: 10, textTransform: 'uppercase' }}>
                  Post-Showing Feedback
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', marginBottom: 6 }}>Buyer Interest</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <button
                        key={r}
                        onClick={() => setRating(rating === r ? null : r)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer', padding: 2,
                        }}
                      >
                        <Star
                          size={20}
                          style={{
                            color: rating != null && r <= rating ? '#f59e0b' : 'var(--txt3)',
                            fill: rating != null && r <= rating ? '#f59e0b' : 'transparent',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Buyer feedback, next steps, concerns…"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--panel)',
                    fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', resize: 'vertical',
                  }}
                />
                <button
                  onClick={saveFeedback}
                  style={{
                    marginTop: 8, padding: '7px 14px', borderRadius: 8,
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <CheckCircle2 size={12} /> Save as completed
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <button onClick={() => handleDelete(selected.id)} style={outlineBtn('var(--r-txt)', 'var(--r-border)')}>
                  <Trash2 size={12} /> Delete
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => openEdit(selected)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                  border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Edit2 size={12} /> Reschedule
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Create/Edit form */}
      <Modal
        open={showForm}
        onClose={() => { if (!saving) setShowForm(false) }}
        title={editingId ? 'Reschedule Showing' : 'Schedule Showing'}
        subtitle={editingId ? 'Update date or notes' : 'Book a property showing'}
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
              {properties.map(p => <option key={p.id} value={p.id}>{p.title} — {p.address}</option>)}
            </select>
          </FormField>

          <FormField label="Contact (optional)">
            <select
              value={form.contactId}
              onChange={e => setForm({ ...form, contactId: e.target.value })}
              disabled={!!editingId}
              style={inputStyle}
            >
              <option value="">No contact linked</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <FormField label="Date">
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="Time">
              <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label="Duration (min)">
              <input type="number" min="5" step="5" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={inputStyle} />
            </FormField>
          </div>

          <FormField label="Notes (optional)">
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
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
            }}>{saving ? 'Saving…' : editingId ? 'Save' : 'Schedule'}</button>
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

function StatusBtn({ onClick, color, border, children }: { onClick: () => void; color: string; border: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 11px', borderRadius: 8,
      background: 'transparent', color,
      border: `1px solid ${border}`, fontSize: 11, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{children}</button>
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

