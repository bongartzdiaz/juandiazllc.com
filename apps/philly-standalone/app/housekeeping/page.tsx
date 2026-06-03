'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import { useApi } from '@/hooks/philly/useApi'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useToast } from '@/hooks/philly/useToast'
import { Plus, BedDouble, Sparkles, AlertCircle, CheckCircle2, Clock, GripVertical } from 'lucide-react'

interface HouseTask {
  id: string
  roomId: string
  type: string
  status: string
  priority: string
  assignedTo: string | null
  notes: string
  completedAt: string | null
  createdAt: string
  room?: { id: string; name: string; type: string } | null
}

interface RoomLite { id: string; name: string; type: string }

const STATUSES = ['pending', 'in_progress', 'completed'] as const
const PRIORITY_BG: Record<string, string> = {
  low: 'var(--bg2)', medium: 'var(--y-bg)', high: 'var(--o-bg)', urgent: 'var(--r-bg)',
}
const PRIORITY_TXT: Record<string, string> = {
  low: 'var(--txt3)', medium: 'var(--y-txt)', high: 'var(--o-txt)', urgent: 'var(--r-txt)',
}
const TYPE_ICONS: Record<string, typeof Sparkles> = {
  cleaning: Sparkles, inspection: AlertCircle, maintenance: BedDouble, turnover: Clock,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

export default function HousekeepingPage() {
  const t = useTranslations('housekeeping')
  const { addToast } = useToast()

  const tasksQuery = useApi<{ data: HouseTask[]; pagination: { total: number } }>('/housekeeping?limit=200')
  const tasks = tasksQuery.data?.data ?? []
  const total = tasksQuery.data?.pagination?.total ?? 0
  useEntitySubscription('housekeepingTask', tasksQuery.refetch)

  const roomsQuery = useApi<{ data: RoomLite[] }>('/rooms?limit=200')
  const rooms = roomsQuery.data?.data ?? []

  // Drag-drop between status columns.
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map: Record<string, HouseTask[]> = { pending: [], in_progress: [], completed: [] }
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t)
    }
    return map
  }, [tasks])

  const pending = grouped.pending.length
  const inProgress = grouped.in_progress.length
  const completed = grouped.completed.length
  const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ roomId: '', type: 'cleaning', priority: 'medium', notes: '' })
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setForm({ roomId: '', type: 'cleaning', priority: 'medium', notes: '' })
  }

  async function submitForm() {
    if (!form.roomId) { addToast(t('toasts.selectRoom'), 'error'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/housekeeping', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: form.roomId, type: form.type,
          priority: form.priority, notes: form.notes.trim(),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? t('toasts.saveFailed'), 'error'); return }
      addToast(t('toasts.added'), 'success')
      resetForm(); setShowAdd(false); tasksQuery.refetch()
    } catch { addToast(t('toasts.networkError'), 'error') }
    finally { setSaving(false) }
  }

  async function moveTask(id: string, status: string) {
    try {
      const res = await fetch(`/api/housekeeping/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { addToast(t('toasts.updateFailed'), 'error'); return }
      addToast(t('toasts.moved', { status }), 'success')
      tasksQuery.refetch()
    } catch { addToast(t('toasts.networkError'), 'error') }
  }

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} addLabel={t('newTask')} onAdd={() => setShowAdd(true)} />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="sparkles" label={t('kpis.total')} value={String(total)} />
          <KpiCard icon="clock" label={t('kpis.pending')} value={String(pending)} />
          <KpiCard icon="alert-circle" label={t('kpis.urgent')} value={String(urgent)} />
          <KpiCard icon="check-circle-2" label={t('kpis.completed')} value={String(completed)} />
        </div>

        {/* Kanban */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {STATUSES.map((status) => {
            const items = grouped[status] ?? []
            const isOver = dragOverStatus === status
            return (
              <div
                key={status}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status) }}
                onDragLeave={() => { if (dragOverStatus === status) setDragOverStatus(null) }}
                onDrop={(e) => {
                  e.preventDefault()
                  const id = e.dataTransfer.getData('text/task-id') || dragId
                  setDragId(null); setDragOverStatus(null)
                  if (id) moveTask(id, status)
                }}
                style={{
                  background: 'var(--panel)',
                  border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, padding: 12, minHeight: 220,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--txt3)' }}>
                    {t(`statuses.${status}` as 'statuses.pending')}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--txt2)', padding: '1px 8px', borderRadius: 5, background: 'var(--bg2)' }}>
                    {items.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.length === 0 ? (
                    <div style={{
                      fontSize: 11, color: 'var(--txt3)', padding: '20px 8px', textAlign: 'center',
                      border: '1px dashed var(--border)', borderRadius: 8,
                    }}>{t('dropHere')}</div>
                  ) : items.map((task) => {
                    const Icon = TYPE_ICONS[task.type] ?? Sparkles
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => {
                          setDragId(task.id)
                          e.dataTransfer.setData('text/task-id', task.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => { setDragId(null); setDragOverStatus(null) }}
                        style={{
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '10px 12px', cursor: 'grab',
                          opacity: dragId === task.id ? 0.4 : 1,
                          transition: 'opacity 120ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <GripVertical size={12} style={{ color: 'var(--txt3)', marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Icon size={11} color="var(--accent)" />
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>
                                {task.room?.name ?? '—'}
                              </span>
                              <span style={{ flex: 1 }} />
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                textTransform: 'uppercase',
                                background: PRIORITY_BG[task.priority] ?? 'var(--bg2)',
                                color: PRIORITY_TXT[task.priority] ?? 'var(--txt3)',
                              }}>{t(`priorities.${task.priority}` as 'priorities.medium')}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--txt3)', textTransform: 'capitalize' }}>
                              {t(`types.${task.type}` as 'types.cleaning')}
                            </div>
                            {task.notes && (
                              <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 4, whiteSpace: 'pre-wrap' }}>
                                {task.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title={t('newTask')} subtitle={t('subtitle')} size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label={t('fields.room')}>
            <select aria-label={t('fields.room')} value={form.roomId} onChange={e => setForm({ ...form, roomId: e.target.value })} style={inputStyle}>
              <option value="">{t('filters.allRooms')}</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
            </select>
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField label={t('fields.type')}>
              <select aria-label={t('fields.type')} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                <option value="cleaning">{t('types.cleaning')}</option>
                <option value="inspection">{t('types.inspection')}</option>
                <option value="maintenance">{t('types.maintenance')}</option>
                <option value="turnover">{t('types.turnover')}</option>
              </select>
            </FormField>
            <FormField label={t('fields.priority')}>
              <select aria-label={t('fields.priority')} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                <option value="low">{t('priorities.low')}</option>
                <option value="medium">{t('priorities.medium')}</option>
                <option value="high">{t('priorities.high')}</option>
                <option value="urgent">{t('priorities.urgent')}</option>
              </select>
            </FormField>
          </div>
          <FormField label={t('fields.notes')}>
            <textarea aria-label={t('fields.notes')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => { setShowAdd(false); resetForm() }} disabled={saving} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
              cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>{t('actions.cancel')}</button>
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
