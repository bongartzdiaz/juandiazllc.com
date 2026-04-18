'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Modal, FormField } from '@/components/philly/ui/Modal'
import {
  Plus, Trash2, Edit2, GripVertical, Check, X, Columns3,
  Layers, ChevronUp, ChevronDown, ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/hooks/philly/useToast'

interface Stage {
  id: string
  pipelineId: string
  name: string
  position: number
  color: string
}

interface Pipeline {
  id: string
  organizationId: string
  name: string
  industry: string
  createdAt: string
  stages: Stage[]
  _count?: { deals: number }
}

const STAGE_COLORS = [
  '#94A3B8', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B',
]

const INDUSTRY_LABELS: Record<string, string> = {
  general: 'General',
  realestate: 'Real Estate',
  hospitality: 'Hospitality',
  philanthropy: 'Philanthropy',
}

export default function PipelineAdminPage() {
  const { addToast } = useToast()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Pipeline create/edit modal
  const [showPipelineForm, setShowPipelineForm] = useState(false)
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null)
  const [pipelineName, setPipelineName] = useState('')
  const [pipelineIndustry, setPipelineIndustry] = useState('general')
  const [saving, setSaving] = useState(false)

  // Stage edit state (inline)
  const [editingStageId, setEditingStageId] = useState<string | null>(null)
  const [stageName, setStageName] = useState('')
  const [stageColor, setStageColor] = useState('#94A3B8')

  // Add stage form
  const [addingStage, setAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#94A3B8')

  const fetchPipelines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/philly/api/pipelines', { cache: 'no-store' })
      const json = await res.json()
      const list: Pipeline[] = Array.isArray(json.data) ? json.data : []
      setPipelines(list)
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id)
    } catch { setPipelines([]) }
    finally { setLoading(false) }
  }, [selectedId])

  useEffect(() => { fetchPipelines() }, [fetchPipelines])

  const selected = pipelines.find(p => p.id === selectedId) ?? null

  /* --- Pipeline CRUD --- */

  function openCreatePipeline() {
    setEditingPipelineId(null)
    setPipelineName('')
    setPipelineIndustry('general')
    setShowPipelineForm(true)
  }

  function openEditPipeline(p: Pipeline) {
    setEditingPipelineId(p.id)
    setPipelineName(p.name)
    setPipelineIndustry(p.industry)
    setShowPipelineForm(true)
  }

  async function submitPipeline() {
    if (!pipelineName.trim()) { addToast('Name required', 'error'); return }
    setSaving(true)
    try {
      const payload = { name: pipelineName.trim(), industry: pipelineIndustry }
      const res = editingPipelineId
        ? await fetch(`/philly/api/pipelines/${editingPipelineId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/philly/api/pipelines', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast(editingPipelineId ? 'Pipeline updated' : 'Pipeline created', 'success')
      setShowPipelineForm(false)
      await fetchPipelines()
      if (!editingPipelineId && j.data?.id) setSelectedId(j.data.id)
    } catch { addToast('Network error', 'error') }
    finally { setSaving(false) }
  }

  async function handleDeletePipeline(p: Pipeline) {
    const dealCount = p._count?.deals ?? 0
    if (dealCount > 0) {
      addToast(`Cannot delete — ${dealCount} deal${dealCount > 1 ? 's' : ''} in this pipeline`, 'error')
      return
    }
    if (!confirm(`Delete pipeline "${p.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/philly/api/pipelines/${p.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Pipeline deleted', 'success')
        if (selectedId === p.id) setSelectedId(null)
        fetchPipelines()
      } else {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? 'Delete failed', 'error')
      }
    } catch { addToast('Network error', 'error') }
  }

  /* --- Stage CRUD --- */

  async function addStage() {
    if (!selectedId || !newStageName.trim()) return
    try {
      const res = await fetch(`/philly/api/pipelines/${selectedId}/stages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStageName.trim(), color: newStageColor }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { addToast(j.error ?? 'Save failed', 'error'); return }
      addToast('Stage added', 'success')
      setNewStageName('')
      setNewStageColor('#94A3B8')
      setAddingStage(false)
      fetchPipelines()
    } catch { addToast('Network error', 'error') }
  }

  function startEditStage(stage: Stage) {
    setEditingStageId(stage.id)
    setStageName(stage.name)
    setStageColor(stage.color)
  }

  async function saveStage() {
    if (!selectedId || !editingStageId) return
    if (!stageName.trim()) { addToast('Name required', 'error'); return }
    try {
      const res = await fetch(`/philly/api/pipelines/${selectedId}/stages/${editingStageId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: stageName.trim(), color: stageColor }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? 'Save failed', 'error'); return
      }
      addToast('Stage updated', 'success')
      setEditingStageId(null)
      fetchPipelines()
    } catch { addToast('Network error', 'error') }
  }

  async function deleteStage(stage: Stage) {
    if (!selectedId) return
    if (!confirm(`Delete stage "${stage.name}"?`)) return
    try {
      const res = await fetch(`/philly/api/pipelines/${selectedId}/stages/${stage.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        addToast('Stage deleted', 'success')
        fetchPipelines()
      } else {
        const j = await res.json().catch(() => ({}))
        addToast(j.error ?? 'Delete failed', 'error')
      }
    } catch { addToast('Network error', 'error') }
  }

  async function moveStage(stage: Stage, direction: 'up' | 'down') {
    if (!selected) return
    const idx = selected.stages.findIndex(s => s.id === stage.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= selected.stages.length) return
    const other = selected.stages[swapIdx]
    try {
      const res = await fetch(`/philly/api/pipelines/${selected.id}/stages`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stages: [
            { id: stage.id, position: other.position },
            { id: other.id, position: stage.position },
          ],
        }),
      })
      if (!res.ok) { addToast('Reorder failed', 'error'); return }
      fetchPipelines()
    } catch { addToast('Network error', 'error') }
  }

  /* --- KPIs --- */

  const totalStages = pipelines.reduce((s, p) => s + p.stages.length, 0)
  const totalDeals = pipelines.reduce((s, p) => s + (p._count?.deals ?? 0), 0)

  return (
    <>
      <Topbar title="Pipeline Admin" sub="Configure deal pipelines and stages" />
      <div style={{ padding: '18px 24px 40px' }}>

        <Link href="/philly/settings" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} /> Back to Settings
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="folder" label="Total Pipelines" value={String(pipelines.length)} />
          <KpiCard icon="trending-up" label="Total Stages" value={String(totalStages)} />
          <KpiCard icon="dollar-sign" label="Total Deals" value={String(totalDeals)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, alignItems: 'start' }}>

          {/* LEFT: Pipeline list */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 14px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pipelines ({pipelines.length})
              </span>
              <button onClick={openCreatePipeline} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 7,
                background: 'var(--accent)', color: '#fff', border: 'none',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Plus size={11} /> New
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
                Loading…
              </div>
            ) : pipelines.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--txt3)', fontSize: 12 }}>
                <Columns3 size={26} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                No pipelines yet. Click New to create your first.
              </div>
            ) : pipelines.map(p => {
              const isSelected = p.id === selectedId
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', textAlign: 'left',
                    background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    border: 'none', borderLeft: `3px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
                  }}
                >
                  <Columns3 size={14} style={{ color: isSelected ? 'var(--accent)' : 'var(--txt3)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 1 }}>
                      {p.stages.length} stage{p.stages.length !== 1 ? 's' : ''} · {p._count?.deals ?? 0} deal{(p._count?.deals ?? 0) !== 1 ? 's' : ''} · {INDUSTRY_LABELS[p.industry] ?? p.industry}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* RIGHT: Stage editor */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: 'var(--shadow-sm)',
            minHeight: 400,
          }}>
            {!selected ? (
              <div style={{
                padding: 60, textAlign: 'center', color: 'var(--txt3)', fontSize: 13,
              }}>
                <Layers size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                Select a pipeline on the left or create a new one.
              </div>
            ) : (
              <>
                {/* Pipeline header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>
                      {selected.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
                      {INDUSTRY_LABELS[selected.industry] ?? selected.industry} · {selected.stages.length} stages · {selected._count?.deals ?? 0} deals
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEditPipeline(selected)} title="Edit pipeline" style={secondaryBtn}>
                      <Edit2 size={12} /> Rename
                    </button>
                    <button onClick={() => handleDeletePipeline(selected)} title="Delete pipeline" style={dangerBtn}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Stages */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase',
                    letterSpacing: '0.04em', marginBottom: 10,
                  }}>
                    Stages ({selected.stages.length})
                  </div>

                  {selected.stages.length === 0 ? (
                    <div style={{
                      padding: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 12,
                      background: 'var(--bg2)', borderRadius: 8, marginBottom: 12,
                    }}>
                      No stages. Add one below.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {selected.stages.map((stage, idx) => (
                        <div key={stage.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: 'var(--bg2)', border: '1px solid var(--border)',
                        }}>
                          <GripVertical size={14} style={{ color: 'var(--txt3)', flexShrink: 0 }} />

                          {editingStageId === stage.id ? (
                            <>
                              <input
                                type="color"
                                value={stageColor}
                                onChange={e => setStageColor(e.target.value)}
                                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--panel)' }}
                              />
                              <input
                                autoFocus
                                value={stageName}
                                onChange={e => setStageName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveStage(); if (e.key === 'Escape') setEditingStageId(null) }}
                                style={{
                                  flex: 1, padding: '6px 10px', borderRadius: 7,
                                  border: '1px solid var(--accent)', background: 'var(--panel)',
                                  color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                                }}
                              />
                              <button onClick={saveStage} style={iconBtn('var(--accent)', '#fff')}>
                                <Check size={12} />
                              </button>
                              <button onClick={() => setEditingStageId(null)} style={iconBtn('var(--panel)', 'var(--txt2)', 'var(--border)')}>
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <div style={{
                                width: 14, height: 14, borderRadius: 4,
                                background: stage.color, flexShrink: 0,
                              }} />
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                                {stage.name}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--txt3)', fontFamily: 'var(--font-red-hat-mono), monospace' }}>
                                pos {stage.position}
                              </span>
                              <button onClick={() => moveStage(stage, 'up')} disabled={idx === 0} title="Move up" style={{ ...miniBtn, opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
                                <ChevronUp size={11} />
                              </button>
                              <button onClick={() => moveStage(stage, 'down')} disabled={idx === selected.stages.length - 1} title="Move down" style={{ ...miniBtn, opacity: idx === selected.stages.length - 1 ? 0.3 : 1, cursor: idx === selected.stages.length - 1 ? 'not-allowed' : 'pointer' }}>
                                <ChevronDown size={11} />
                              </button>
                              <button onClick={() => startEditStage(stage)} title="Edit" style={miniBtn}>
                                <Edit2 size={11} />
                              </button>
                              <button onClick={() => deleteStage(stage)} title="Delete" style={{ ...miniBtn, color: 'var(--r-txt)' }}>
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add stage inline */}
                  {addingStage ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 8,
                      background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
                      border: '1px dashed var(--accent-border)',
                    }}>
                      <input
                        type="color"
                        value={newStageColor}
                        onChange={e => setNewStageColor(e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--panel)' }}
                      />
                      <input
                        autoFocus
                        value={newStageName}
                        onChange={e => setNewStageName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addStage(); if (e.key === 'Escape') { setAddingStage(false); setNewStageName('') } }}
                        placeholder="Stage name (e.g. Negotiation)"
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 7,
                          border: '1px solid var(--accent)', background: 'var(--panel)',
                          color: 'var(--txt)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 3 }}>
                        {STAGE_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => setNewStageColor(c)}
                            title={c}
                            style={{
                              width: 16, height: 16, borderRadius: 4,
                              background: c, cursor: 'pointer',
                              border: newStageColor === c ? '2px solid var(--txt)' : '1px solid var(--border)',
                              padding: 0,
                            }}
                          />
                        ))}
                      </div>
                      <button onClick={addStage} style={iconBtn('var(--accent)', '#fff')}>
                        <Check size={12} />
                      </button>
                      <button onClick={() => { setAddingStage(false); setNewStageName('') }} style={iconBtn('var(--panel)', 'var(--txt2)', 'var(--border)')}>
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingStage(true)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        background: 'transparent', border: '1px dashed var(--border)',
                        color: 'var(--txt3)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Plus size={13} /> Add stage
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline create/edit modal */}
      <Modal
        open={showPipelineForm}
        onClose={() => { if (!saving) setShowPipelineForm(false) }}
        title={editingPipelineId ? 'Edit Pipeline' : 'New Pipeline'}
        subtitle={editingPipelineId ? 'Update pipeline name or industry' : 'Creates 3 default stages (editable after)'}
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Pipeline Name">
            <input value={pipelineName} onChange={e => setPipelineName(e.target.value)} placeholder="e.g. Sales, Buyer Nurture, Donor Cultivation" style={inputStyle} autoFocus />
          </FormField>
          <FormField label="Industry">
            <select value={pipelineIndustry} onChange={e => setPipelineIndustry(e.target.value)} style={inputStyle}>
              {Object.entries(INDUSTRY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <button onClick={() => setShowPipelineForm(false)} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancel</button>
            <button onClick={submitPipeline} disabled={saving} style={{
              padding: '9px 18px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 12, fontWeight: 600, cursor: saving ? 'wait' : 'pointer',
              fontFamily: 'inherit', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving…' : editingPipelineId ? 'Save' : 'Create'}</button>
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

const miniBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--txt2)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 8,
  background: 'var(--bg2)', color: 'var(--txt2)',
  border: '1px solid var(--border)', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}

const dangerBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', borderRadius: 8,
  background: 'transparent', color: 'var(--r-txt)',
  border: '1px solid var(--r-border)', fontSize: 11, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
}

function iconBtn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: bg, color, border: border ? `1px solid ${border}` : 'none',
    cursor: 'pointer', flexShrink: 0,
  }
}
