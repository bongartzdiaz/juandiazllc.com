'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { Filter, Plus, Trash2, Edit2 } from 'lucide-react'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { useApi } from '@/hooks/philly/useApi'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useFormat } from '@/hooks/philly/useFormat'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

interface Room {
  id: string
  name: string
  type: string
  status: string
  floor: number
  capacity: number
  priceCentsNight: number
  createdAt: string
  _count: { reservations: number; housekeeping: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  available: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  occupied: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  maintenance: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  blocked: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

const emptyForm = {
  name: '', type: 'standard', status: 'available',
  floor: '1', capacity: '2', price: '100',
}

export default function RoomsPage() {
  const t = useTranslations('rooms')
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const { addToast } = useToast()
  // LOC-03 — locale-bound currency, replacing the old $-hardcoded display.
  const fmt = useFormat()
  const fmtMoney = (cents: number) => fmt.currency(cents, { cents: true })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const params = new URLSearchParams({ page: String(page), limit: '20' })
  if (statusFilter) params.set('status', statusFilter)
  interface RoomsResponse { data: Room[]; pagination: { total: number; totalPages: number } }
  const roomsQuery = useApi<RoomsResponse>(`/rooms?${params}`)
  const rooms = roomsQuery.data?.data ?? []
  const total = roomsQuery.data?.pagination.total ?? 0
  const totalPages = roomsQuery.data?.pagination.totalPages ?? 0
  const loading = roomsQuery.loading
  const fetchData = roomsQuery.refetch

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function openCreate() {
    setForm(emptyForm); setEditingId(null); setShowForm(true)
  }

  function openEdit(r: Room) {
    setForm({
      name: r.name, type: r.type, status: r.status,
      floor: String(r.floor), capacity: String(r.capacity),
      price: String(r.priceCentsNight / 100),
    })
    setEditingId(r.id); setShowForm(true); setSelectedRoom(null)
  }

  async function submitForm() {
    if (!form.name.trim()) { addToast(t('toasts.nameRequired'), 'error'); return }
    const priceCentsNight = Math.round((parseFloat(form.price) || 0) * 100)
    if (priceCentsNight < 0) { addToast(t('toasts.invalidPrice'), 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        floor: parseInt(form.floor, 10) || 1,
        capacity: parseInt(form.capacity, 10) || 1,
        priceCentsNight,
      }
      const res = editingId
        ? await fetch(`/api/rooms/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(editingId ? t('toasts.updated') : t('toasts.created'), 'success')
      setShowForm(false)
      fetchData()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: tConfirms('deleteRoom.title'),
      body: tConfirms('deleteRoom.body'),
      confirmLabel: tCommon('delete'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast(t('toasts.deleted'), 'success')
        setSelectedRoom(null)
        fetchData()
      } else { addToast(t('toasts.deleteFailed'), 'error') }
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  // Live-refresh on any room mutation in the org
  useEntitySubscription('room', fetchData)

  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status === 'occupied').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label={t('kpi.totalRooms')} value={String(total)} />
          <KpiCard icon="target" label={t('kpi.available')} value={String(available)} />
          <KpiCard icon="users" label={t('kpi.occupied')} value={String(occupied)} />
          <KpiCard icon="zap" label={t('kpi.maintenance')} value={String(maintenance)} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">{t('filters.allStatuses')}</option>
              <option value="available">{t('statuses.available')}</option>
              <option value="occupied">{t('statuses.occupied')}</option>
              <option value="maintenance">{t('statuses.maintenance')}</option>
              <option value="blocked">{t('statuses.blocked')}</option>
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
            <Plus size={13} /> {t('addRoom')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {roomsQuery.error ? (
            <div style={{ gridColumn: '1 / -1' }}><ListError onRetry={fetchData} message={roomsQuery.error} /></div>
          ) : loading ? (
            <div style={{ gridColumn: '1 / -1' }}><ListLoading /></div>
          ) : rooms.length === 0 ? (
            <div style={{ gridColumn: '1 / -1' }}><ListEmpty /></div>
          ) : rooms.map(room => {
            const sc = STATUS_COLORS[room.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
            return (
              <div key={room.id} className="card-hover" onClick={() => setSelectedRoom(room)} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{room.name}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', background: sc.bg, color: sc.txt }}>{t(`statuses.${room.status}` as 'statuses.available')}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 6 }}>
                  {t(`types.${room.type}` as 'types.standard')} | {t('meta.floor')} {room.floor} | {t('meta.capacity')} {room.capacity}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', fontFamily: "var(--font-red-hat-mono), monospace" }}>
                  {fmtMoney(room.priceCentsNight)}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--txt3)' }}>{t('perNight')}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 6 }}>
                  {room._count.reservations} {t('meta.reservations')} | {room._count.housekeeping} {t('meta.tasks')}
                </div>
              </div>
            )
          })}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <Modal
        open={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        title={selectedRoom?.name ?? ''}
        subtitle={selectedRoom ? `${t(`types.${selectedRoom.type}` as 'types.standard')} · ${t('detail.floor')} ${selectedRoom.floor}` : ''}
        size="md"
      >
        {selectedRoom && (() => {
          const r = selectedRoom
          const sc = STATUS_COLORS[r.status] ?? { bg: 'var(--bg2)', txt: 'var(--txt2)' }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.txt }}>{t(`statuses.${r.status}` as 'statuses.available')}</span>
                <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--bg2)', color: 'var(--txt2)' }}>{t(`types.${r.type}` as 'types.standard')}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('detail.price')}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginTop: 4 }}>
                    {fmtMoney(r.priceCentsNight)}<span style={{ fontSize: 11, color: 'var(--txt3)' }}>{t('perNight')}</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('detail.capacity')}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginTop: 4 }}>
                    {r.capacity}<span style={{ fontSize: 11, color: 'var(--txt3)' }}>{t('detail.guests')}</span>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('detail.reservations')}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginTop: 4 }}>{r._count.reservations}</div>
                </div>
                <div style={{ padding: 12, background: 'var(--bg2)', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('detail.housekeeping')}</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', marginTop: 4 }}>{r._count.housekeeping}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button onClick={() => handleDelete(r.id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8,
                  background: 'transparent', color: 'var(--r-txt)',
                  border: '1px solid var(--r-border)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Trash2 size={12} /> {t('actions.delete')}
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => openEdit(r)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Edit2 size={12} /> {t('actions.edit')}
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
        title={editingId ? t('editRoom') : t('addRoom')}
        subtitle={editingId ? t('editSubtitle') : t('addSubtitle')}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <FormField label={t('form.name')}>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('form.namePlaceholder')} style={inputStyle} />
            </FormField>
            <FormField label={t('form.type')}>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="standard">{t('types.standard')}</option>
                <option value="deluxe">{t('types.deluxe')}</option>
                <option value="suite">{t('types.suite')}</option>
                <option value="family">{t('types.family')}</option>
                <option value="dorm">{t('types.dorm')}</option>
              </select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <FormField label={t('form.floor')}>
              <input type="number" min="0" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label={t('form.capacity')}>
              <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label={t('form.price')}>
              <input type="number" min="0" step="5" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={inputStyle} />
            </FormField>
            <FormField label={t('form.status')}>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                <option value="available">{t('statuses.available')}</option>
                <option value="occupied">{t('statuses.occupied')}</option>
                <option value="maintenance">{t('statuses.maintenance')}</option>
                <option value="blocked">{t('statuses.blocked')}</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowForm(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{t('actions.cancel')}</button>
            <button onClick={submitForm} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? t('actions.saving') : editingId ? t('actions.save') : t('addRoom')}</button>
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
