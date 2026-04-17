'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/layout/Topbar'
import { Pagination } from '@/components/ui/Pagination'
import { KpiCard } from '@/components/ui/KpiCard'
import { useToast } from '@/hooks/useToast'
import {
  Filter, Search, LayoutGrid, List as ListIcon, X, Plus, GripVertical,
  Calendar, User as UserIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useEntitySubscription } from '@/hooks/useRealtime'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useUrlState } from '@/hooks/useUrlState'

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Deal {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  expectedClose: string | null
  createdAt: string
  stage: { id: string; name: string; color: string }
  contact: { id: string; name: string } | null
  owner: { id: string; name: string } | null
  pipeline?: { id: string; name: string } | null
}

interface Pipeline {
  id: string
  name: string
  industry: string
  stages: { id: string; name: string; color: string; position: number }[]
  _count: { deals: number }
}

interface ContactOption {
  id: string
  name: string
  email: string
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  open: { bg: 'var(--b-bg)',  txt: 'var(--b-txt)',  border: 'var(--b-border)' },
  won:  { bg: 'var(--g-bg)',  txt: 'var(--g-txt)',  border: 'var(--g-border)' },
  lost: { bg: 'var(--r-bg)',  txt: 'var(--r-txt)',  border: 'var(--r-border)' },
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function fmtMoney(cents: number): string {
  const n = cents / 100
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default function DealsPage() {
  const t = useTranslations('deals')
  const { addToast } = useToast()

  const [filters, setFilters] = useUrlState({
    q: '', status: '', pipelineId: '', view: 'board',
  })
  const search = filters.q
  const statusFilter = filters.status
  const selectedPipeline = filters.pipelineId
  const view = (filters.view === 'list' ? 'list' : 'board') as 'list' | 'board'
  const debouncedSearch = useDebouncedValue(search, 250)

  const [deals, setDeals] = useState<Deal[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetStage, setDropTargetStage] = useState<string | null>(null)

  /* ---- Add form state ---- */
  const [addTitle, setAddTitle] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addProbability, setAddProbability] = useState('50')
  const [addStatus, setAddStatus] = useState('open')
  const [addPipelineId, setAddPipelineId] = useState('')
  const [addStageId, setAddStageId] = useState('')
  const [addContactId, setAddContactId] = useState('')
  const [addExpectedClose, setAddExpectedClose] = useState('')
  const [addNotes, setAddNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const resetAddForm = () => {
    setAddTitle(''); setAddValue(''); setAddProbability('50'); setAddStatus('open')
    setAddContactId(''); setAddExpectedClose(''); setAddNotes(''); setAddError(null)
    // keep pipeline / stage selection sticky
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  /* ---- Load pipelines & contacts ---- */

  useEffect(() => {
    fetch('/api/pipelines')
      .then(r => r.json())
      .then(j => {
        const list: Pipeline[] = j.data ?? []
        setPipelines(list)
        if (list.length > 0 && !addPipelineId) {
          setAddPipelineId(list[0].id)
          if (list[0].stages.length > 0) setAddStageId(list[0].stages[0].id)
        }
      })
      .catch(() => setPipelines([]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // When pipeline changes in Add form, reset to first stage
    if (!addPipelineId) return
    const pl = pipelines.find(p => p.id === addPipelineId)
    if (pl?.stages.length) {
      const found = pl.stages.find(s => s.id === addStageId)
      if (!found) setAddStageId(pl.stages[0].id)
    } else {
      setAddStageId('')
    }
  }, [addPipelineId, pipelines, addStageId])

  useEffect(() => {
    fetch('/api/contacts?limit=500')
      .then(r => r.json())
      .then(j => setContacts((j.data ?? []).map((c: ContactOption) => ({ id: c.id, name: c.name, email: c.email }))))
      .catch(() => setContacts([]))
  }, [])

  /* ---- Load deals ---- */

  const fetchDeals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: view === 'board' ? '200' : '25' })
      if (selectedPipeline) params.set('pipelineId', selectedPipeline)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/deals?${params}`)
      const json = await res.json()
      setDeals(json.data ?? [])
      setTotal(json.pagination?.total ?? (json.data?.length ?? 0))
      setTotalPages(json.pagination?.totalPages ?? 1)
    } catch { setDeals([]) }
    finally { setLoading(false) }
  }, [page, selectedPipeline, statusFilter, view])

  useEffect(() => { fetchDeals() }, [fetchDeals])
  useEntitySubscription('deal', fetchDeals)

  /* ---- Client-side search ---- */
  const visibleDeals = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return deals
    return deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.contact?.name ?? '').toLowerCase().includes(q) ||
      (d.owner?.name ?? '').toLowerCase().includes(q) ||
      (d.stage?.name ?? '').toLowerCase().includes(q),
    )
  }, [deals, debouncedSearch])

  /* ---- Aggregated KPIs (based on visible deals) ---- */
  const kpis = useMemo(() => {
    const totalValue = visibleDeals.reduce((s, d) => s + d.valueCents, 0)
    const weighted = visibleDeals
      .filter(d => d.status === 'open')
      .reduce((s, d) => s + d.valueCents * (d.probability / 100), 0)
    const open = visibleDeals.filter(d => d.status === 'open')
    const won = visibleDeals.filter(d => d.status === 'won')
    const winRate = visibleDeals.length > 0
      ? Math.round((won.length / (won.length + visibleDeals.filter(d => d.status === 'lost').length || 1)) * 100)
      : 0
    return { totalValue, weighted, openCount: open.length, wonCount: won.length, winRate }
  }, [visibleDeals])

  /* ---- Add deal ---- */
  const handleAddDeal = async () => {
    if (saving) return
    if (!addTitle.trim()) { setAddError('Title is required'); return }
    if (!addPipelineId) { setAddError('Select a pipeline'); return }
    if (!addStageId) { setAddError('Select a stage'); return }

    setSaving(true)
    setAddError(null)
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: addTitle.trim(),
          pipelineId: addPipelineId,
          stageId: addStageId,
          valueCents: Math.round(Number(addValue || 0) * 100),
          probability: Math.max(0, Math.min(100, Number(addProbability) || 0)),
          status: addStatus,
          contactId: addContactId || null,
          expectedClose: addExpectedClose ? new Date(addExpectedClose).toISOString() : null,
          notes: addNotes.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(json?.error ?? json?.message ?? `Failed (${res.status})`)
        return
      }
      resetAddForm()
      setShowAdd(false)
      addToast('Deal created', 'success')
      fetchDeals()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  /* ---- Move deal between stages (drag-and-drop) ---- */
  const moveDeal = useCallback(async (dealId: string, stageId: string) => {
    // optimistic: update locally
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d
      const newStage = currentPipelineStages.find(s => s.id === stageId)
      return newStage ? { ...d, stage: { id: newStage.id, name: newStage.name, color: newStage.color } } : d
    }))
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!res.ok) throw new Error('Failed to move deal')
      addToast('Deal moved', 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Move failed', 'error')
      fetchDeals() // revert on error
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDeals, addToast])

  /* ---- Change status (for quick won/lost) ---- */
  const setDealStatus = async (dealId: string, status: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status } : d))
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      addToast(`Marked ${status}`, 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Update failed', 'error')
      fetchDeals()
    }
  }

  /* ---- Current pipeline's stages (for board) ---- */
  const currentPipelineStages = useMemo(() => {
    if (selectedPipeline) {
      return pipelines.find(p => p.id === selectedPipeline)?.stages ?? []
    }
    // default to first pipeline
    return pipelines[0]?.stages ?? []
  }, [selectedPipeline, pipelines])

  // Auto-set filter to first pipeline for board mode
  const firstPipelineRef = useRef<string>('')
  useEffect(() => {
    if (view === 'board' && !selectedPipeline && pipelines.length > 0 && firstPipelineRef.current !== pipelines[0].id) {
      firstPipelineRef.current = pipelines[0].id
      setFilters({ pipelineId: pipelines[0].id })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pipelines])

  /* ---- Group visible deals by stage for board ---- */
  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>()
    for (const s of currentPipelineStages) map.set(s.id, [])
    for (const d of visibleDeals) {
      if (!d.stage) continue
      if (!map.has(d.stage.id)) map.set(d.stage.id, [])
      map.get(d.stage.id)!.push(d)
    }
    return map
  }, [visibleDeals, currentPipelineStages])

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */

  const noPipelines = !loading && pipelines.length === 0

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel="Deal" />
      <div style={{ padding: '18px 24px 40px' }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>
          <KpiCard icon="dollar-sign" label="Total Value" value={fmtMoney(kpis.totalValue)} />
          <KpiCard icon="trending-up" label="Weighted Pipeline" value={fmtMoney(kpis.weighted)} />
          <KpiCard icon="target" label="Open Deals" value={String(kpis.openCount)} />
          <KpiCard icon="chart" label="Won" value={String(kpis.wonCount)} />
          <KpiCard icon="zap" label="Win Rate" value={`${kpis.winRate}%`} />
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)',
            fontSize: 12, flex: '1 1 240px', maxWidth: 360, minWidth: 200,
          }}>
            <Search size={13} style={{ color: 'var(--txt3)' }} />
            <input
              value={search}
              onChange={e => setFilters({ q: e.target.value })}
              placeholder="Search deals…"
              style={{
                flex: 1, background: 'none', border: 'none',
                fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setFilters({ q: '' })} aria-label="Clear search"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--txt3)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          <FilterSelect
            icon={Filter}
            value={selectedPipeline}
            onChange={v => { setFilters({ pipelineId: v }); setPage(1) }}
            options={[
              { value: '', label: 'All Pipelines' },
              ...pipelines.map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <FilterSelect
            icon={Filter}
            value={statusFilter}
            onChange={v => { setFilters({ status: v }); setPage(1) }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
            ]}
          />

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2, padding: 3, borderRadius: 8,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            marginLeft: 'auto',
          }}>
            {[
              { key: 'board', icon: LayoutGrid, label: 'Board' },
              { key: 'list',  icon: ListIcon,   label: 'List'  },
            ].map(v => {
              const active = view === v.key
              const Icon = v.icon
              return (
                <button key={v.key} onClick={() => setFilters({ view: v.key })} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: active ? 'var(--panel)' : 'transparent',
                  color: active ? 'var(--txt)' : 'var(--txt2)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                }}>
                  <Icon size={11} /> {v.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* No pipelines state */}
        {noPipelines && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 8 }}>
              No pipelines yet
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
              Create a pipeline via the API first (POST /api/pipelines).
            </div>
          </div>
        )}

        {/* ========== BOARD VIEW ========== */}
        {view === 'board' && !noPipelines && (
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            paddingBottom: 8, minHeight: 400,
          }}>
            {currentPipelineStages.length === 0 && !loading && (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: 20 }}>
                This pipeline has no stages.
              </div>
            )}
            {currentPipelineStages.map(stage => {
              const stageDeals = dealsByStage.get(stage.id) ?? []
              const stageValue = stageDeals.reduce((s, d) => s + d.valueCents, 0)
              const isDropTarget = dropTargetStage === stage.id
              return (
                <div
                  key={stage.id}
                  onDragOver={e => { e.preventDefault(); setDropTargetStage(stage.id) }}
                  onDragLeave={() => setDropTargetStage(null)}
                  onDrop={e => {
                    e.preventDefault()
                    const dealId = e.dataTransfer.getData('text/deal-id') || draggingId
                    if (dealId) {
                      const currentDeal = deals.find(d => d.id === dealId)
                      if (currentDeal && currentDeal.stage.id !== stage.id) {
                        moveDeal(dealId, stage.id)
                      }
                    }
                    setDraggingId(null)
                    setDropTargetStage(null)
                  }}
                  style={{
                    flex: '0 0 280px', minWidth: 280,
                    background: isDropTarget ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))' : 'var(--panel)',
                    border: isDropTarget ? '1px dashed var(--accent)' : '1px solid var(--border)',
                    borderRadius: 12, padding: 10,
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'background 150ms ease, border-color 150ms ease',
                  }}
                >
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 8px 8px', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 4, background: stage.color, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt)', flex: 1 }}>
                      {stage.name}
                    </span>
                    <span className="mono" style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                      background: 'var(--bg2)', color: 'var(--txt3)',
                    }}>{stageDeals.length}</span>
                  </div>

                  {/* Column value */}
                  <div style={{ fontSize: 10.5, color: 'var(--txt3)', padding: '0 2px 2px' }}>
                    <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(stageValue)}</span> total
                  </div>

                  {/* Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1 }}>
                    {stageDeals.length === 0 ? (
                      <div style={{
                        fontSize: 11, color: 'var(--txt3)',
                        padding: '20px 8px', textAlign: 'center',
                        border: '1px dashed var(--border)', borderRadius: 8,
                      }}>
                        Drop deals here
                      </div>
                    ) : stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={e => {
                          setDraggingId(deal.id)
                          e.dataTransfer.setData('text/deal-id', deal.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => { setDraggingId(null); setDropTargetStage(null) }}
                        style={{
                          background: 'var(--bg2)',
                          border: '1px solid var(--border)',
                          borderRadius: 10, padding: '10px 12px',
                          cursor: 'grab',
                          opacity: draggingId === deal.id ? 0.4 : 1,
                          transition: 'opacity 120ms ease, transform 120ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <GripVertical size={12} style={{ color: 'var(--txt3)', marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link href={`/deals/${deal.id}`} style={{
                              fontSize: 12.5, fontWeight: 600, color: 'var(--txt)',
                              textDecoration: 'none', display: 'block', lineHeight: 1.35,
                            }}>{deal.title}</Link>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: 10.5, color: 'var(--txt3)' }}>
                              <span className="mono" style={{ fontWeight: 700, color: 'var(--txt)' }}>
                                {fmtMoney(deal.valueCents)}
                              </span>
                              <span style={{ color: 'var(--txt3)' }}>·</span>
                              <span className="mono">{deal.probability}%</span>
                              {deal.expectedClose && (
                                <>
                                  <span style={{ color: 'var(--txt3)' }}>·</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <Calendar size={9} /> {fmtDate(deal.expectedClose)}
                                  </span>
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                              {deal.contact?.name && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--txt3)' }}>
                                  <UserIcon size={9} /> {deal.contact.name}
                                </span>
                              )}
                              <span style={{
                                padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                background: STATUS_COLORS[deal.status]?.bg ?? 'var(--bg2)',
                                color: STATUS_COLORS[deal.status]?.txt ?? 'var(--txt2)',
                                border: `1px solid ${STATUS_COLORS[deal.status]?.border ?? 'var(--border)'}`,
                              }}>
                                {deal.status}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick status actions (open deals only) */}
                        {deal.status === 'open' && (
                          <div style={{
                            display: 'flex', gap: 4, marginTop: 8,
                            paddingTop: 6, borderTop: '1px solid var(--border)',
                          }}>
                            <button
                              onClick={e => { e.stopPropagation(); setDealStatus(deal.id, 'won') }}
                              style={{
                                flex: 1, padding: '4px 6px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                                background: 'var(--g-bg)', color: 'var(--g-txt)',
                                border: '1px solid var(--g-border)', cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >Won</button>
                            <button
                              onClick={e => { e.stopPropagation(); setDealStatus(deal.id, 'lost') }}
                              style={{
                                flex: 1, padding: '4px 6px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                                background: 'var(--r-bg)', color: 'var(--r-txt)',
                                border: '1px solid var(--r-border)', cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >Lost</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ========== LIST VIEW ========== */}
        {view === 'list' && !noPipelines && (
          <>
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 110px 90px 140px 100px',
                gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)',
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--txt3)',
              }}>
                <span>Deal</span><span>Stage</span><span>Value</span><span>Prob.</span><span>Contact</span><span>Status</span>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading…</div>
              ) : visibleDeals.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
                  {debouncedSearch ? 'No deals match your search.' : 'No deals found.'}
                </div>
              ) : visibleDeals.map((deal, idx) => (
                <Link key={deal.id} href={`/deals/${deal.id}`} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 110px 90px 140px 100px',
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < visibleDeals.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center',
                  background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                  textDecoration: 'none', color: 'inherit',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{deal.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{deal.owner?.name ?? 'Unassigned'}</div>
                  </div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: deal.stage.color + '22', color: deal.stage.color,
                    display: 'inline-block', maxWidth: 'fit-content',
                  }}>{deal.stage.name}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(deal.valueCents)}</span>
                  <span className="mono">{deal.probability}%</span>
                  <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{deal.contact?.name ?? '-'}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase',
                    background: STATUS_COLORS[deal.status]?.bg ?? 'var(--bg2)',
                    color: STATUS_COLORS[deal.status]?.txt ?? 'var(--txt2)',
                    display: 'inline-block', maxWidth: 'fit-content',
                  }}>{deal.status}</span>
                </Link>
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ========== ADD DEAL MODAL ========== */}
      {showAdd && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.35)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.12s ease both',
          }}
          onClick={closeAddModal}
        >
          <div
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-labelledby="deal-add-title"
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)',
              padding: '22px 26px', width: 480, maxHeight: '86vh', overflowY: 'auto',
              animation: 'scaleIn 0.14s ease both',
            }}
          >
            <div id="deal-add-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>
              New Deal
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
              Add a deal to the pipeline
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Title *">
                <input
                  value={addTitle} onChange={e => setAddTitle(e.target.value)}
                  placeholder="e.g. Acme Corp renewal"
                  style={fieldInputStyle}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Pipeline *">
                  <select value={addPipelineId} onChange={e => setAddPipelineId(e.target.value)} style={fieldInputStyle}>
                    {pipelines.length === 0 && <option value="">No pipelines</option>}
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Stage *">
                  <select value={addStageId} onChange={e => setAddStageId(e.target.value)} style={fieldInputStyle}>
                    {(pipelines.find(p => p.id === addPipelineId)?.stages ?? []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Value ($)">
                  <input
                    type="number" min={0} step={100}
                    value={addValue} onChange={e => setAddValue(e.target.value)}
                    placeholder="0"
                    style={fieldInputStyle}
                  />
                </Field>
                <Field label="Probability (%)">
                  <input
                    type="number" min={0} max={100}
                    value={addProbability} onChange={e => setAddProbability(e.target.value)}
                    style={fieldInputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Status">
                  <select value={addStatus} onChange={e => setAddStatus(e.target.value)} style={fieldInputStyle}>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </Field>
                <Field label="Expected Close">
                  <input
                    type="date"
                    value={addExpectedClose} onChange={e => setAddExpectedClose(e.target.value)}
                    style={fieldInputStyle}
                  />
                </Field>
              </div>

              <Field label="Contact">
                <select value={addContactId} onChange={e => setAddContactId(e.target.value)} style={fieldInputStyle}>
                  <option value="">— None —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>
                  ))}
                </select>
              </Field>

              <Field label="Notes">
                <textarea
                  value={addNotes} onChange={e => setAddNotes(e.target.value)}
                  rows={3} placeholder="Context, next steps…"
                  style={{ ...fieldInputStyle, resize: 'vertical', lineHeight: 1.5 }}
                />
              </Field>
            </div>

            {addError && (
              <div role="alert" style={{
                padding: '8px 12px', borderRadius: 8, marginTop: 12,
                background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
              }}>{addError}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button
                onClick={closeAddModal}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Cancel</button>
              <button
                onClick={handleAddDeal} disabled={saving}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
                  opacity: saving ? 0.65 : 1,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Plus size={13} /> {saving ? 'Saving…' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------ */

function FilterSelect({
  icon: Icon, value, onChange, options,
}: {
  icon: typeof Filter
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
      borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)',
      fontSize: 12,
    }}>
      <Icon size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)',
          fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
        }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
