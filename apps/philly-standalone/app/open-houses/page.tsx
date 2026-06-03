'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import {
  Filter, Calendar as CalIcon, MapPin, Users as UsersIcon, Clock,
  Plus, Trash2, Edit2,
} from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { fetchJson } from '@/lib/philly/fetch-json'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const OH_COLUMNS: ColumnDef[] = [
  { id: 'property', label: 'Property', required: true },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'status', label: 'Status' },
  { id: 'visitors', label: 'Visitors' },
]
const OH_DEFAULTS = ['property', 'date', 'time', 'status', 'visitors']
const OH_WIDTHS: Record<string, string> = {
  property: '1fr',
  date: '120px',
  time: '140px',
  status: '100px',
  visitors: '80px',
}

interface OpenHouse {
  id: string
  propertyId: string
  hostAgentId: string | null
  date: string
  startTime: string
  endTime: string
  notes: string
  status?: string
  createdAt: string
  property?: { id: string; title: string; address: string; city?: string }
  _count?: { visitors: number }
}

interface PropertyLite { id: string; title: string; address: string }

type TimeFilter = 'all' | 'upcoming' | 'past'

const emptyForm = {
  propertyId: '',
  date: '',
  startTime: '10:00',
  endTime: '14:00',
  notes: '',
}

export default function OpenHousesPage() {
  const [properties, setProperties] = useState<PropertyLite[]>([])
  const [page, setPage] = useState(1)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [selected, setSelected] = useState<OpenHouse | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  interface OpenHousesResponse { data: OpenHouse[]; pagination: { total: number; totalPages: number } }
  const openHousesQuery = useApi<OpenHousesResponse>(`/open-houses?${params}`)
  const openHouses = openHousesQuery.data?.data ?? []
  const total = openHousesQuery.data?.pagination.total ?? 0
  const totalPages = openHousesQuery.data?.pagination.totalPages ?? 0
  const loading = openHousesQuery.loading
  const fetchData = openHousesQuery.refetch

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const t = useTranslations('openHouses')
  const { addToast } = useToast()

  // Bundle BS — column visibility prefs.
  const ohColumns = useColumnPrefs('pai-openHouses-columns-v1', OH_DEFAULTS)
  const visibleOhColumns = useMemo(
    () => OH_COLUMNS.filter((c) => c.required || ohColumns.visible.has(c.id)),
    [ohColumns.visible],
  )
  const ohGridTemplate = useMemo(
    () => visibleOhColumns.map((c) => OH_WIDTHS[c.id]).join(' '),
    [visibleOhColumns],
  )

  useEffect(() => {
    // Load properties once for the scheduler
    // Bundle CK — fetchJson surfaces non-2xx as a typed error so a
    // 401 / 500 doesn't silently fall to "[]" and look like an empty
    // property picker.
    fetchJson<{ data: PropertyLite[] }>('/api/properties?limit=500')
      .then(j => setProperties(Array.isArray(j.data) ? j.data.map((p: PropertyLite) => ({ id: p.id, title: p.title, address: p.address })) : []))
      .catch(err => addToast(err instanceof Error ? err.message : t('toasts.loadFailed'), 'error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEntitySubscription('openHouse', fetchData)

  const now = new Date()
  const filtered = openHouses.filter(oh => {
    if (timeFilter === 'all') return true
    const d = new Date(oh.date)
    return timeFilter === 'upcoming' ? d >= now : d < now
  })
  const upcoming = openHouses.filter(oh => new Date(oh.date) >= now).length
  const totalVisits = openHouses.reduce((s, oh) => s + (oh._count?.visitors ?? 0), 0)
  const avgVisits = openHouses.length > 0 ? Math.round(totalVisits / openHouses.length) : 0

  function openScheduleForm() {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) })
    setEditingId(null)
    setShowForm(true)
  }

  function openEditForm(oh: OpenHouse) {
    setForm({
      propertyId: oh.propertyId,
      date: new Date(oh.date).toISOString().slice(0, 10),
      startTime: oh.startTime,
      endTime: oh.endTime,
      notes: oh.notes ?? '',
    })
    setEditingId(oh.id)
    setShowForm(true)
    setSelected(null)
  }

  async function submitForm() {
    if (!form.propertyId) { addToast(t('toasts.selectProperty'), 'error'); return }
    if (!form.date) { addToast(t('toasts.pickDate'), 'error'); return }
    if (form.startTime >= form.endTime) { addToast(t('toasts.endAfterStart'), 'error'); return }

    setSubmitting(true)
    try {
      const res = editingId
        ? await fetch(`/api/open-houses/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch('/api/open-houses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        addToast(j.error ?? t('toasts.saveFailed'), 'error')
        return
      }
      addToast(editingId ? t('toasts.updated') : t('toasts.scheduled'), 'success')
      setShowForm(false)
      fetchData()
    } catch {
      addToast(t('toasts.networkError'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('confirms.cancel'))) return
    try {
      const res = await fetch(`/api/open-houses/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.cancelled'), 'success')
        setSelected(null)
        fetchData()
      } else {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? t('toasts.deleteFailed'), 'error')
      }
    } catch {
      addToast(t('toasts.networkError'), 'error')
    }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="calendar" label="Total Events" value={String(total)} />
          <KpiCard icon="target" label="Upcoming" value={String(upcoming)} />
          <KpiCard icon="users" label="Total Visitors" value={String(totalVisits)} />
          <KpiCard icon="chart" label="Avg Visitors" value={String(avgVisits)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select
              value={timeFilter}
              onChange={e => { setTimeFilter(e.target.value as TimeFilter); setPage(1) }}
              style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={openScheduleForm}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={13} /> Schedule Open House
          </button>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Property</span><span>Date</span><span>Time</span><span>Status</span><span>Visitors</span>
          </div>
          {openHousesQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={fetchData} message={openHousesQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : filtered.map((oh, idx) => {
            const ohDate = new Date(oh.date)
            const isPast = ohDate < now
            return (
              <div
                key={oh.id}
                onClick={() => setSelected(oh)}
                className="card-hover"
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 140px 100px 80px', gap: 12,
                  padding: '10px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center', cursor: 'pointer',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                  opacity: isPast ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{oh.property?.title ?? 'Unknown'}</div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{oh.property?.address ?? ''}</div>
                </div>
                <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontSize: 11 }}>{ohDate.toLocaleDateString()}</span>
                <span style={{ fontSize: 11, fontFamily: "var(--font-red-hat-mono), monospace" }}>{oh.startTime} - {oh.endTime}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                  background: isPast ? 'var(--bg2)' : 'var(--g-bg)',
                  color: isPast ? 'var(--txt3)' : 'var(--g-txt)',
                  textTransform: 'uppercase', justifySelf: 'start',
                }}>{isPast ? 'Past' : 'Upcoming'}</span>
                <span style={{ fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--accent)' }}>{oh._count?.visitors ?? 0}</span>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Details modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.property?.title ?? 'Open House'}
        subtitle={selected?.property?.address ?? ''}
        size="md"
      >
        {selected && (() => {
          const d = new Date(selected.date)
          const isPast = d < now
          const visits = selected._count?.visitors ?? 0
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase',
                  background: isPast ? 'var(--bg2)' : 'var(--g-bg)',
                  color: isPast ? 'var(--txt2)' : 'var(--g-txt)',
                }}>{isPast ? 'Past' : 'Upcoming'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailTile icon={CalIcon} label="Date" value={d.toLocaleDateString()} />
                <DetailTile icon={Clock} label="Time" value={`${selected.startTime} - ${selected.endTime}`} />
                <DetailTile icon={UsersIcon} label="Visitors" value={String(visits)} />
                <DetailTile icon={MapPin} label="Address" value={selected.property?.address ?? '-'} />
              </div>

              {selected.notes && (
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Notes</div>
                  <div style={{ fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.5 }}>{selected.notes}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button
                  onClick={() => handleDelete(selected.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'transparent', color: 'var(--r-txt)',
                    border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Trash2 size={12} /> Cancel
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => openEditForm(selected)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 14px', borderRadius: 8,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    padding: '9px 14px', borderRadius: 8,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                    border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Schedule/Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!submitting) setShowForm(false) }}
        title={editingId ? 'Reschedule Open House' : 'Schedule Open House'}
        subtitle={editingId ? 'Update date, time, or notes' : 'Pick a property and time to host visitors'}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FormField label="Property">
            <select
              value={form.propertyId}
              onChange={e => setForm({ ...form, propertyId: e.target.value })}
              style={inputStyle}
              disabled={!!editingId}
            >
              <option value="">Select a property…</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.title} — {p.address}</option>
              ))}
            </select>
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <FormField label="Date">
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                style={inputStyle}
              />
            </FormField>
            <FormField label="Start">
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                style={inputStyle}
              />
            </FormField>
            <FormField label="End">
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                style={inputStyle}
              />
            </FormField>
          </div>

          <FormField label="Notes (optional)">
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Refreshments, parking info, special instructions…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </FormField>

          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowForm(false)}
              disabled={submitting}
              style={{
                padding: '9px 18px', borderRadius: 8,
                background: 'var(--bg2)', color: 'var(--txt2)',
                border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={submitForm}
              disabled={submitting}
              style={{
                padding: '9px 18px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff',
                border: 'none', fontSize: 12, fontWeight: 600,
                cursor: submitting ? 'wait' : 'pointer',
                fontFamily: 'inherit',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Saving…' : editingId ? 'Save changes' : 'Schedule'}
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

function DetailTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; value: string }) {
  return (
    <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <Icon size={11} style={{ color: 'var(--txt3)' }} />
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
    </div>
  )
}
