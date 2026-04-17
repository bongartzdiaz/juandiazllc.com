'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { useEntitySubscription } from '@/hooks/useRealtime'
import { ListChecks, Play, Pause, Filter, Users, X, Trash2 } from 'lucide-react'

interface ActionPlan {
  id: string
  name: string
  description: string
  triggerEvent: string
  stepsJson: string
  status: string
  createdAt: string
  _count: { enrollments: number }
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual',
  new_lead: 'New Lead',
  stage_change: 'Stage Change',
  date_trigger: 'Date Trigger',
}

const STATUS_COLORS: Record<string, { bg: string; txt: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  archived: { bg: 'var(--bg2)', txt: 'var(--txt3)' },
}

const TRIGGER_OPTIONS = Object.entries(TRIGGER_LABELS)

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block',
}

export default function ActionPlansPage() {
  const [plans, setPlans] = useState<ActionPlan[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addTrigger, setAddTrigger] = useState(TRIGGER_OPTIONS[0][0])
  const [addStatus, setAddStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const t = useTranslations('actionPlans')

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/action-plans?${params}`)
      const json = await res.json()
      setPlans(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Live updates when plans are created/updated
  useEntitySubscription('actionPlan', fetchPlans)

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
    try {
      await fetch('/api/action-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })
    } catch {
      setPlans(prev => prev.map(p => p.id === id ? { ...p, status: currentStatus } : p))
    }
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this action plan? Enrollments will be lost.')) return
    try {
      const res = await fetch(`/api/action-plans?id=${id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) fetchPlans()
    } catch {}
  }

  const createPlan = async () => {
    if (saving) return
    if (!addName.trim()) {
      setAddError('Name is required')
      return
    }
    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          description: addDescription.trim(),
          triggerEvent: addTrigger,
          steps: [],
          status: addStatus,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? `Failed to create plan (${res.status})`)
        return
      }
      setAddName('')
      setAddDescription('')
      setAddTrigger(TRIGGER_OPTIONS[0][0])
      setAddStatus('active')
      setAddError(null)
      setShowAdd(false)
      fetchPlans()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  const activePlans = plans.filter(p => p.status === 'active').length
  const totalEnrollments = plans.reduce((s, p) => s + p._count.enrollments, 0)

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => { setAddError(null); setShowAdd(true) }} addLabel="Plan" />
      <div style={{ padding: '18px 24px 40px' }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Plans" value={String(total || plans.length)} />
          <KpiCard icon="zap" label="Active" value={String(activePlans)} />
          <KpiCard icon="users" label="Total Enrollments" value={String(totalEnrollments)} />
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <FilterSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'archived', label: 'Archived' },
            ]} />
        </div>

        {/* Plan Cards */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
        ) : plans.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13, background: 'var(--panel)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <ListChecks size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            No action plans yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plans.map(plan => {
              let steps: unknown[] = []
              try { steps = JSON.parse(plan.stepsJson) } catch {}
              const statusStyle = STATUS_COLORS[plan.status] ?? STATUS_COLORS.archived

              return (
                <div key={plan.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  border: '1px solid var(--border)', background: 'var(--panel)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: statusStyle.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <ListChecks size={16} style={{ color: statusStyle.txt }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{plan.name}</div>
                    {plan.description && (
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plan.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                  }}>
                    {TRIGGER_LABELS[plan.triggerEvent] ?? plan.triggerEvent}
                  </span>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    <ListChecks size={10} /> {steps.length} step{steps.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    <Users size={10} /> {plan._count.enrollments}
                  </div>
                  <button onClick={() => toggleStatus(plan.id, plan.status)} style={{
                    padding: '5px 10px', borderRadius: 6,
                    border: '1px solid var(--border)',
                    background: statusStyle.bg, color: statusStyle.txt,
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {plan.status === 'active' ? <><Pause size={10} /> Active</> : <><Play size={10} /> Paused</>}
                  </button>
                  <button onClick={() => deletePlan(plan.id)} title="Delete" style={{
                    width: 28, height: 28, borderRadius: 6,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--r-txt)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      {/* Add Plan Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={closeAddModal}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-plan-add-title"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div id="action-plan-add-title" style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>Add Action Plan</div>
              <button onClick={closeAddModal} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', padding: 2, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>Create a new action plan</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. New Lead Onboarding" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea value={addDescription} onChange={e => setAddDescription(e.target.value)} placeholder="Describe this action plan..." rows={3} style={{
                  ...inputStyle, resize: 'vertical',
                }} />
              </div>
              <div>
                <label style={labelStyle}>Trigger Event</label>
                <select value={addTrigger} onChange={e => setAddTrigger(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {TRIGGER_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={addStatus} onChange={e => setAddStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            {addError && (
              <div role="alert" style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 8,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}
            <button onClick={createPlan} disabled={saving} style={{
              width: '100%', marginTop: 18, padding: '10px 0',
              borderRadius: 10, border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
            }}>{saving ? 'Saving...' : 'Add Plan'}</button>
          </div>
        </div>
      )}
    </>
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
