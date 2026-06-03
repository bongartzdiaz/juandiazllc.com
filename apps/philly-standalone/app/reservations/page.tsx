'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { Filter, Plus, BedDouble, User as UserIcon, Calendar as CalIcon, DollarSign } from 'lucide-react'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

interface Reservation {
  id: string
  roomId: string
  guestName: string
  guestEmail: string
  guestPhone: string
  checkIn: string
  checkOut: string
  status: string
  totalCents: number
  notes: string
  createdAt: string
  room?: { id: string; name: string; type: string } | null
}

interface RoomLite { id: string; name: string; type: string }

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  inquiry: { bg: 'var(--bg2)', txt: 'var(--txt2)' },
  confirmed: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  checked_in: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  checked_out: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
  cancelled: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

const RES_COLUMNS: ColumnDef[] = [
  { id: 'guest', label: 'Guest', required: true },
  { id: 'room', label: 'Room' },
  { id: 'dates', label: 'Dates' },
  { id: 'nights', label: 'Nights' },
  { id: 'total', label: 'Total' },
  { id: 'status', label: 'Status' },
]
const RES_DEFAULTS = ['guest', 'room', 'dates', 'nights', 'total', 'status']
const RES_WIDTHS: Record<string, string> = {
  guest: '1fr', room: '160px', dates: '180px',
  nights: '70px', total: '100px', status: '110px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)))
}

export default function ReservationsPage() {
  const t = useTranslations('reservations')
  const { addToast } = useToast()

  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<Reservation | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (statusFilter) params.set('status', statusFilter)

  interface ReservationsResponse { data: Reservation[]; pagination: { total: number; totalPages: number } }
  const reservationsQuery = useApi<ReservationsResponse>(`/reservations?${params}`)
  const reservations = reservationsQuery.data?.data ?? []
  const total = reservationsQuery.data?.pagination?.total ?? 0
  const totalPages = reservationsQuery.data?.pagination?.totalPages ?? 0
  const loading = reservationsQuery.loading
  useEntitySubscription('reservation', reservationsQuery.refetch)

  const roomsQuery = useApi<{ data: RoomLite[] }>('/rooms?limit=200')
  const rooms = roomsQuery.data?.data ?? []

  // Column prefs (Bundle AC pattern).
  const resColumns = useColumnPrefs('pai-reservations-columns-v1', RES_DEFAULTS)
  const visibleResColumns = useMemo(
    () => RES_COLUMNS.filter((c) => c.required || resColumns.visible.has(c.id)),
    [resColumns.visible],
  )
  const resGridTemplate = useMemo(
    () => visibleResColumns.map((c) => RES_WIDTHS[c.id]).join(' '),
    [visibleResColumns],
  )

  // KPIs (computed from the current page; total comes from server)
  const upcoming = reservations.filter((r) => r.status === 'confirmed' && new Date(r.checkIn) >= new Date()).length
  const checkedIn = reservations.filter((r) => r.status === 'checked_in').length
  const monthRevenueCents = reservations
    .filter((r) => r.status === 'checked_out' || r.status === 'checked_in')
    .reduce((s, r) => s + r.totalCents, 0)

  // Add form
  const [form, setForm] = useState({
    roomId: '', guestName: '', guestEmail: '', guestPhone: '',
    checkIn: '', checkOut: '', total: '', status: 'confirmed', notes: '',
  })
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setForm({ roomId: '', guestName: '', guestEmail: '', guestPhone: '',
      checkIn: '', checkOut: '', total: '', status: 'confirmed', notes: '' })
  }

  async function submitForm() {
    if (!form.roomId) { addToast(t('toasts.selectRoom'), 'error'); return }
    if (!form.guestName.trim()) { addToast(t('toasts.guestNameRequired'), 'error'); return }
    if (!form.checkIn || !form.checkOut) { addToast(t('toasts.datesRequired'), 'error'); return }
    if (new Date(form.checkOut) <= new Date(form.checkIn)) {
      addToast(t('toasts.checkoutAfterCheckin'), 'error'); return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: form.roomId,
          guestName: form.guestName.trim(),
          guestEmail: form.guestEmail.trim(),
          guestPhone: form.guestPhone.trim(),
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          status: form.status,
          totalCents: Math.round((parseFloat(form.total) || 0) * 100),
          notes: form.notes.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(t('toasts.created'), 'success')
      resetForm()
      setShowAdd(false)
      reservationsQuery.refetch()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.marked', { status }), 'success')
      setSelected(null)
      reservationsQuery.refetch()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} addLabel={t('newReservation')} onAdd={() => setShowAdd(true)} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="calendar" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="users" label={t('kpis.upcoming')} value={String(upcoming)} />
          <KpiCard icon="bed-double" label={t('kpis.checkedIn')} value={String(checkedIn)} />
          <KpiCard icon="dollar-sign" label={t('kpis.revenue')} value={`$${(monthRevenueCents / 100).toLocaleString()}`} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">{t('filters.all')}</option>
              {Object.keys(STATUS_COLORS).map(s => (
                <option key={s} value={s}>{t(`filters.${s}` as 'filters.confirmed')}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker columns={RES_COLUMNS} visible={resColumns.visible} onToggle={resColumns.toggle} onReset={resColumns.reset} isOverridden={resColumns.isOverridden} />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: resGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleResColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {reservationsQuery.error ? (
            <div style={{ padding: 16 }}><ListError onRetry={reservationsQuery.refetch} message={reservationsQuery.error} /></div>
          ) : loading ? (
            <div style={{ padding: 16 }}><ListLoading /></div>
          ) : reservations.length === 0 ? (
            <div style={{ padding: 16 }}><ListEmpty /></div>
          ) : reservations.map((r, idx) => {
            const sc = STATUS_COLORS[r.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            const nights = nightsBetween(r.checkIn, r.checkOut)
            return (
              <div key={r.id} onClick={() => setSelected(r)} className="card-hover" style={{
                display: 'grid', gridTemplateColumns: resGridTemplate, gap: 12,
                padding: '10px 16px',
                borderBottom: idx < reservations.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 12, alignItems: 'center', cursor: 'pointer',
                background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
              }}>
                {visibleResColumns.map((c) => {
                  if (c.id === 'guest') return (
                    <div key="guest">
                      <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{r.guestName}</div>
                      {r.guestEmail && <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{r.guestEmail}</div>}
                    </div>
                  )
                  if (c.id === 'room') return (
                    <span key="room" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--txt2)' }}>
                      <BedDouble size={11} color="var(--txt3)" /> {r.room?.name ?? '—'}
                    </span>
                  )
                  if (c.id === 'dates') return (
                    <span key="dates" style={{ fontSize: 11, color: 'var(--txt2)', fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                      {new Date(r.checkIn).toLocaleDateString()} → {new Date(r.checkOut).toLocaleDateString()}
                    </span>
                  )
                  if (c.id === 'nights') return <span key="nights" className="mono">{nights}</span>
                  if (c.id === 'total') return <span key="total" className="mono" style={{ fontWeight: 600 }}>${(r.totalCents / 100).toLocaleString()}</span>
                  if (c.id === 'status') return <span key="status" style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt, justifySelf: 'start' }}>{r.status.replace('_', ' ')}</span>
                  return <span key={c.id} />
                })}
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.guestName ?? ''} subtitle={selected?.room?.name ?? ''} size="md">
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DetailTile icon={CalIcon} label={t('fields.checkIn')} value={new Date(selected.checkIn).toLocaleDateString()} />
              <DetailTile icon={CalIcon} label={t('fields.checkOut')} value={new Date(selected.checkOut).toLocaleDateString()} />
              <DetailTile icon={DollarSign} label={t('fields.total')} value={`$${(selected.totalCents / 100).toLocaleString()}`} />
              <DetailTile icon={UserIcon} label={t('fields.email')} value={selected.guestEmail || '—'} />
            </div>
            {selected.notes && (
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 4 }}>{t('fields.notes')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--txt2)', padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              {selected.status !== 'checked_in' && (
                <button onClick={() => changeStatus(selected.id, 'checked_in')} style={miniActionBtn('var(--g)')}>{t('actions.checkIn')}</button>
              )}
              {selected.status !== 'checked_out' && (
                <button onClick={() => changeStatus(selected.id, 'checked_out')} style={miniActionBtn('var(--b)')}>{t('actions.checkOut')}</button>
              )}
              {selected.status !== 'cancelled' && (
                <button onClick={() => changeStatus(selected.id, 'cancelled')} style={miniActionBtn('var(--r)')}>{t('actions.cancel')}</button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title={t('newReservation')} subtitle={t('subtitle')} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label={t('fields.room')}>
            <select value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} style={inputStyle}>
              <option value="">{t('filters.allRooms')}</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
            </select>
          </FormField>
          <FormField label={t('fields.guest')}>
            <input value={form.guestName} onChange={e => setForm({ ...form, guestName: e.target.value })} placeholder="Jane Doe" style={inputStyle} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('fields.email')}>
              <input type="email" value={form.guestEmail} onChange={e => setForm({ ...form, guestEmail: e.target.value })} placeholder="guest@example.com" style={inputStyle} />
            </FormField>
            <FormField label={t('fields.phone')}>
              <input value={form.guestPhone} onChange={e => setForm({ ...form, guestPhone: e.target.value })} placeholder="+1 555 555 0100" style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('fields.checkIn')}>
              <input type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label={t('fields.checkOut')}>
              <input type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} style={inputStyle} />
            </FormField>
          </div>
          <FormField label={t('fields.total')}>
            <input type="number" min="0" step="10" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="450" style={inputStyle} />
          </FormField>
          <FormField label={t('fields.notes')}>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => { setShowAdd(false); resetForm() }} disabled={saving} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>{t('actions.cancelForm')}</button>
            <button onClick={submitForm} disabled={saving} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none',
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.65 : 1, display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Plus size={12} /> {t('actions.save')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function miniActionBtn(color: string): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 7,
    background: 'transparent', color, border: `1px solid ${color}`,
    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}

function DetailTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10 }}>
      <div style={{ fontSize: 10.5, color: 'var(--txt3)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icon size={11} color="var(--txt3)" /> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt)' }}>{value}</div>
    </div>
  )
}
