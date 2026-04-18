'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Trash2 } from 'lucide-react'

interface ApiAttendee {
  id: string
  userId: string
  user?: { id: string; name: string | null } | null
}

interface ApiCalendarEvent {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  location: string | null
  color: string
  attendees?: ApiAttendee[]
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const COLOR_CHOICES = [
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#10B981' },
  { label: 'Amber', value: '#F59E0B' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Violet', value: '#8B5CF6' },
]

function toISOInput(d: Date): string {
  // YYYY-MM-DDTHH:MM — browser-local, compatible with <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function dateOnlyStr(iso: string): string {
  // Local-date YYYY-MM-DD for a full ISO timestamp
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function timeOnlyStr(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface EventFormState {
  title: string
  startTime: string
  endTime: string
  allDay: boolean
  location: string
  description: string
  color: string
}

const emptyForm: EventFormState = {
  title: '',
  startTime: '',
  endTime: '',
  allDay: false,
  location: '',
  description: '',
  color: '#3B82F6',
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [events, setEvents] = useState<ApiCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EventFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Compute the from/to window covering the full grid (includes spillover days)
  const { fromISO, toISO } = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const startOffset = (firstDay.getDay() + 6) % 7
    const gridStart = new Date(year, month, 1 - startOffset)
    const gridEnd = new Date(year, month, 1 - startOffset + 42)
    return { fromISO: gridStart.toISOString(), toISO: gridEnd.toISOString() }
  }, [year, month])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/philly/api/calendar?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const json = await res.json()
      setEvents(Array.isArray(json.data) ? json.data : [])
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [fromISO, toISO])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Live updates via SSE
  useEntitySubscription('calendarEvent', fetchEvents)

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: { date: number; month: number; current: boolean }[] = []
    const prevLast = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: prevLast - i, month: month - 1, current: false })
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: d, month, current: true })
    }
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, month: month + 1, current: false })
    }
    return days
  }, [year, month])

  const getDateStr = (d: { date: number; month: number }) => {
    const m = d.month < 0 ? 11 : d.month > 11 ? 0 : d.month
    const y = d.month < 0 ? year - 1 : d.month > 11 ? year + 1 : year
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.date).padStart(2, '0')}`
  }

  const eventsForDate = useCallback((dateStr: string) => {
    return events.filter(e => dateOnlyStr(e.startTime) === dateStr)
  }, [events])

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []
  const today = (() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })()

  const openCreateForm = (dateStr?: string) => {
    setEditingId(null)
    setFormError(null)
    if (dateStr) {
      const [y, m, dd] = dateStr.split('-').map(Number)
      const start = new Date(y, m - 1, dd, 9, 0)
      const end = new Date(y, m - 1, dd, 10, 0)
      setForm({ ...emptyForm, startTime: toISOInput(start), endTime: toISOInput(end) })
    } else {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0)
      setForm({ ...emptyForm, startTime: toISOInput(start), endTime: toISOInput(end) })
    }
    setShowForm(true)
  }

  const openEditForm = (ev: ApiCalendarEvent) => {
    setEditingId(ev.id)
    setFormError(null)
    setForm({
      title: ev.title,
      startTime: toISOInput(new Date(ev.startTime)),
      endTime: toISOInput(new Date(ev.endTime)),
      allDay: ev.allDay,
      location: ev.location ?? '',
      description: ev.description ?? '',
      color: ev.color || '#3B82F6',
    })
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setFormError('Title is required'); return }
    if (!form.startTime || !form.endTime) { setFormError('Start and end times are required'); return }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      setFormError('End time must be after start time')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        // datetime-local values are local; parse as local then convert to ISO
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        allDay: form.allDay,
        location: form.location.trim(),
        color: form.color,
      }
      const url = editingId ? `/philly/api/calendar/${editingId}` : '/philly/api/calendar'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `Request failed (${res.status})`)
      }
      setShowForm(false)
      setEditingId(null)
      await fetchEvents()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteEvent = async () => {
    if (!editingId) return
    if (!confirm('Delete this event?')) return
    setSubmitting(true)
    try {
      const res = await fetch(`/philly/api/calendar/${editingId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Delete failed')
      }
      setShowForm(false)
      setEditingId(null)
      await fetchEvents()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setSubmitting(false)
    }
  }

  const upcoming = useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter(e => new Date(e.startTime).getTime() >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5)
  }, [events])

  return (
    <>
      <Topbar title="Calendar" sub="Appointments & deadlines" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => openCreateForm(selectedDate ?? undefined)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer',
            }}
          >
            <Plus size={14} /> New event
          </button>
        </div>

        {fetchError && (
          <div style={{
            padding: '10px 14px', marginBottom: 12, borderRadius: 8,
            background: 'var(--r-bg)', border: '1px solid var(--r-border)',
            color: 'var(--r)', fontSize: 13,
          }}>
            {fetchError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          {/* Calendar Grid */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--txt2)',
                }}
              ><ChevronLeft size={16} /></button>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{MONTHS[month]} {year}</div>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)',
                  border: 'none', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--txt2)',
                }}
              ><ChevronRight size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 10.5, fontWeight: 600,
                  color: 'var(--txt3)', padding: '6px 0', textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{d}</div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {calendarDays.map((d, i) => {
                const dateStr = getDateStr(d)
                const dayEvents = eventsForDate(dateStr)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    onDoubleClick={() => openCreateForm(dateStr)}
                    title={`${dateStr}${dayEvents.length ? ` — ${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : ''}`}
                    style={{
                      aspectRatio: '1', borderRadius: 8, padding: '4px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-bg)' : isToday ? 'var(--bg2)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      opacity: d.current ? 1 : 0.35,
                      transition: 'all 100ms ease',
                      display: 'flex', flexDirection: 'column',
                      font: 'inherit', color: 'inherit',
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--accent)' : 'var(--txt)',
                      textAlign: 'center', marginBottom: 2,
                    }}>{d.date}</div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: e.color || 'var(--accent)',
                        }} />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="mono" style={{ fontSize: 8, color: 'var(--txt3)', marginLeft: 2 }}>
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Events Sidebar */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {selectedDate
                ? new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </div>

            {loading && (
              <div style={{ fontSize: 12, color: 'var(--txt3)', padding: '8px 0' }}>Loading…</div>
            )}

            {!loading && selectedDate && selectedEvents.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '12px 0', textAlign: 'center' }}>
                No events on this date
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => openCreateForm(selectedDate)}
                    style={{
                      padding: '6px 10px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 6, cursor: 'pointer', color: 'var(--txt)',
                    }}
                  >+ Add event to this day</button>
                </div>
              </div>
            )}

            {selectedEvents.map(ev => {
              const Icon = ev.location ? MapPin : Users
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => openEditForm(ev)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '12px', borderRadius: 10, marginBottom: 8,
                    background: 'var(--panel2)', border: '1px solid var(--border)',
                    borderLeft: `3px solid ${ev.color || 'var(--accent)'}`,
                    cursor: 'pointer', font: 'inherit', color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={13} color={ev.color || 'var(--accent)'} />
                    <span className="mono" style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {ev.allDay ? 'All day' : timeOnlyStr(ev.startTime)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</div>
                  {ev.location && (
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{ev.location}</div>
                  )}
                </button>
              )
            })}

            {!selectedDate && !loading && (
              <>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--txt3)',
                  marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Upcoming</div>
                {upcoming.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--txt3)', padding: '8px 0' }}>
                    No upcoming events
                  </div>
                )}
                {upcoming.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openEditForm(ev)}
                    style={{
                      display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                      background: 'transparent', border: 'none',
                      borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                      cursor: 'pointer', textAlign: 'left', font: 'inherit', color: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, background: 'var(--bg2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Clock size={13} color={ev.color || 'var(--accent)'} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{ev.title}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)' }}>
                        {dateOnlyStr(ev.startTime)} · {ev.allDay ? 'All day' : timeOnlyStr(ev.startTime)}
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showForm}
        onClose={() => { if (!submitting) { setShowForm(false); setEditingId(null) } }}
        title={editingId ? 'Edit event' : 'New event'}
        subtitle={editingId ? 'Update or delete this calendar event' : 'Add a new appointment, deadline, or milestone'}
        size="md"
      >
        <form onSubmit={submit}>
          <FormField label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Event title"
              style={{
                width: '100%', padding: '9px 11px', fontSize: 13,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 7, color: 'var(--txt)',
              }}
              autoFocus
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Start" required>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value })}
                style={{
                  width: '100%', padding: '9px 11px', fontSize: 13,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--txt)',
                }}
              />
            </FormField>
            <FormField label="End" required>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value })}
                style={{
                  width: '100%', padding: '9px 11px', fontSize: 13,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 7, color: 'var(--txt)',
                }}
              />
            </FormField>
          </div>

          <FormField label="All day">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--txt2)' }}>
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={e => setForm({ ...form, allDay: e.target.checked })}
              />
              Event lasts the whole day
            </label>
          </FormField>

          <FormField label="Location">
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="Optional"
              style={{
                width: '100%', padding: '9px 11px', fontSize: 13,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 7, color: 'var(--txt)',
              }}
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional"
              rows={3}
              style={{
                width: '100%', padding: '9px 11px', fontSize: 13,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 7, color: 'var(--txt)', resize: 'vertical',
              }}
            />
          </FormField>

          <FormField label="Color">
            <div style={{ display: 'flex', gap: 8 }}>
              {COLOR_CHOICES.map(c => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setForm({ ...form, color: c.value })}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: c.value,
                    border: form.color === c.value ? '3px solid var(--txt)' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </FormField>

          {formError && (
            <div style={{
              padding: '8px 12px', marginBottom: 12, borderRadius: 7,
              background: 'var(--r-bg)', border: '1px solid var(--r-border)',
              color: 'var(--r)', fontSize: 12.5,
            }}>{formError}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 8 }}>
            <div>
              {editingId && (
                <button
                  type="button"
                  onClick={deleteEvent}
                  disabled={submitting}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', fontSize: 12.5, fontWeight: 500,
                    background: 'transparent', color: 'var(--r)',
                    border: '1px solid var(--r-border)', borderRadius: 7,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.5 : 1,
                  }}
                ><Trash2 size={13} /> Delete</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null) }}
                disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 500,
                  background: 'var(--bg2)', color: 'var(--txt)',
                  border: '1px solid var(--border)', borderRadius: 7,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1,
                }}
              >Cancel</button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: 7,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >{submitting ? 'Saving…' : (editingId ? 'Save' : 'Create')}</button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
