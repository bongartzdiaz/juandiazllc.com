'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useToast } from '@/hooks/philly/useToast'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useFormat } from '@/hooks/philly/useFormat'
import {
  Filter, Search, LayoutGrid, List as ListIcon, X, Plus, GripVertical,
  Calendar, User as UserIcon, Eye, ExternalLink, Copy, Trash2, CheckCircle, XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import { useDebouncedValue } from '@/hooks/philly/useDebouncedValue'
import { useUrlState } from '@/hooks/philly/useUrlState'
import { useApi } from '@/hooks/philly/useApi'
import { DealQuickView } from '@/components/philly/deals/DealQuickView'
import { SavedViewsBar } from '@/components/philly/views/SavedViewsBar'
import type { SavedView } from '@/hooks/philly/useSavedViews'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ContextMenu, type ContextMenuItem } from '@/components/philly/ui/ContextMenu'
import { AdvancedFilterBuilder } from '@/components/philly/filter/AdvancedFilterBuilder'
import { DEAL_FILTER_SCHEMA } from '@/lib/philly/filter/schemas'
import type { FilterSpec } from '@/lib/philly/filter/types'
import { useGlobalShortcuts } from '@/hooks/philly/useGlobalShortcuts'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const DEAL_COLUMN_DEFS: ColumnDef[] = [
  { id: 'deal', label: 'Deal', required: true },
  { id: 'stage', label: 'Stage' },
  { id: 'value', label: 'Value' },
  { id: 'probability', label: 'Probability' },
  { id: 'contact', label: 'Contact' },
  { id: 'status', label: 'Status' },
]
const DEAL_COLUMN_DEFAULTS = ['deal', 'stage', 'value', 'probability', 'contact', 'status']
const DEAL_COLUMN_WIDTHS: Record<string, string> = {
  deal: '1fr',
  stage: '140px',
  value: '110px',
  probability: '90px',
  contact: '140px',
  status: '100px',
}

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

interface DealsResponse {
  data: Deal[]
  pagination?: { total: number; totalPages: number }
}

const STATUS_COLORS: Record<string, { bg: string; txt: string; border: string }> = {
  open: { bg: 'var(--b-bg)',  txt: 'var(--b-txt)',  border: 'var(--b-border)' },
  won:  { bg: 'var(--g-bg)',  txt: 'var(--g-txt)',  border: 'var(--g-border)' },
  lost: { bg: 'var(--r-bg)',  txt: 'var(--r-txt)',  border: 'var(--r-border)' },
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default function DealsPage() {
  const t = useTranslations('deals')
  const tCommon = useTranslations('common')
  const confirm = useConfirm()
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/date, replacing the old $-hardcoded helpers.
  const fmt = useFormat()
  const fmtMoney = (cents: number) => fmt.compactCurrency(cents, { cents: true })
  const fmtDate = (iso: string | null) => (iso ? fmt.date(iso) : '—')
  const router = useRouter()

  const [filters, setFilters] = useUrlState({
    q: '', status: '', pipelineId: '', view: 'board',
  })
  const search = filters.q
  const statusFilter = filters.status
  const selectedPipeline = filters.pipelineId
  const view = (filters.view === 'list' ? 'list' : 'board') as 'list' | 'board'
  const debouncedSearch = useDebouncedValue(search, 250)

  const applySavedView = useCallback((saved: SavedView) => {
    const f = saved.filters
    const next: Record<string, string> = {}
    if (typeof f.q === 'string') next.q = f.q
    if (typeof f.status === 'string') next.status = f.status
    if (typeof f.pipelineId === 'string') next.pipelineId = f.pipelineId
    if (typeof f.view === 'string') next.view = f.view
    setFilters(next)
    // Bundle BU — round-trip the advanced filter spec from the saved
    // view. Pre-BU saved views don't have an `advanced` key; clear in
    // that case so the user doesn't carry over a stale spec.
    if (f.advanced && typeof f.advanced === 'object') {
      setFilterSpec(f.advanced as FilterSpec)
    } else {
      setFilterSpec(null)
    }
    addToast(t('toasts.applied', { name: saved.name }), 'success')
  }, [setFilters, addToast, t])

  const [page, setPage] = useState(1)
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

  // Bundle V — quick-view popover for deals (list + kanban).
  const [quickViewId, setQuickViewId] = useState<string | null>(null)

  // Bundle BU — advanced filter builder (deals lift). Mirrors Bundle AM
  // on contacts. SavedView.filtersJson carries the spec under the
  // `advanced` key for round-tripping; the API receives it as a
  // JSON-encoded `?filter=` query param.
  const [filterSpec, setFilterSpec] = useState<FilterSpec | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  // Bundle AE — right-click context menu.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; dealId: string } | null>(null)

  // Bundle AF — j/k row navigation in list view.
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLAnchorElement>>(new Map())

  // Bundle AL — drag-drop reorder on the LIST view (kanban already
  // uses dnd to move between stages; we don't double-bind).
  const [listDragId, setListDragId] = useState<string | null>(null)
  const [listDragOverId, setListDragOverId] = useState<string | null>(null)
  const [listOrderOverride, setListOrderOverride] = useState<string[] | null>(null)

  // Bundle AC — column visibility prefs (list view only).
  const dealColumns = useColumnPrefs('pai-deals-columns-v1', DEAL_COLUMN_DEFAULTS)
  const visibleDealColumns = useMemo(
    () => DEAL_COLUMN_DEFS.filter((c) => c.required || dealColumns.visible.has(c.id)),
    [dealColumns.visible],
  )
  const dealsGridTemplate = useMemo(
    () => visibleDealColumns.map((c) => DEAL_COLUMN_WIDTHS[c.id]).join(' ') + ' 32px',
    [visibleDealColumns],
  )

  const resetAddForm = () => {
    setAddTitle(''); setAddValue(''); setAddProbability('50'); setAddStatus('open')
    setAddContactId(''); setAddExpectedClose(''); setAddNotes(''); setAddError(null)
    // keep pipeline / stage selection sticky
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setAddError(null)
  }

  /* ---- Load pipelines & contacts via SWR ---- */

  const pipelinesQuery = useApi<{ data: Pipeline[] }>('/pipelines')
  const pipelines = pipelinesQuery.data?.data ?? []

  // Initialise add-form pipeline/stage to the first pipeline once it's loaded.
  useEffect(() => {
    if (pipelines.length === 0 || addPipelineId) return
    setAddPipelineId(pipelines[0].id)
    if (pipelines[0].stages.length > 0) setAddStageId(pipelines[0].stages[0].id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelines.length])

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

  const contactsQuery = useApi<{ data: ContactOption[] }>('/contacts?limit=500')
  const contacts = contactsQuery.data?.data ?? []

  /* ---- Load deals ---- */

  const dealsQueryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: view === 'board' ? '200' : '25' })
    if (selectedPipeline) params.set('pipelineId', selectedPipeline)
    if (statusFilter) params.set('status', statusFilter)
    // Bundle BU — JSON-encoded advanced filter spec. Server compiles
    // against DEAL_FILTER_SCHEMA + AND-wraps under tenancy guard.
    if (filterSpec && filterSpec.rules.length > 0) {
      params.set('filter', JSON.stringify(filterSpec))
    }
    return params.toString()
  }, [page, selectedPipeline, statusFilter, view, filterSpec])

  const dealsQuery = useApi<DealsResponse>(`/deals?${dealsQueryString}`)
  const dealsData = dealsQuery.data
  const deals = dealsData?.data ?? []
  const loading = dealsQuery.loading
  const total = dealsData?.pagination?.total ?? deals.length
  const totalPages = dealsData?.pagination?.totalPages ?? 1
  const fetchDeals = dealsQuery.refetch
  const dealsMutate = dealsQuery.mutate

  useEntitySubscription('deal', fetchDeals)

  /* ---- Current pipeline's stages (for board) ---- */
  const currentPipelineStages = useMemo(() => {
    if (selectedPipeline) {
      return pipelines.find(p => p.id === selectedPipeline)?.stages ?? []
    }
    // default to first pipeline
    return pipelines[0]?.stages ?? []
  }, [selectedPipeline, pipelines])

  /* ---- j/k row navigation (Bundle AF) ---- */
  // Defined here so visibleDeals (referenced inside) is in scope below.
  // The hook handlers themselves are registered after visibleDeals.

  /* ---- Client-side search ---- */
  const visibleDeals = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    let base = deals
    if (q) {
      base = base.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.contact?.name ?? '').toLowerCase().includes(q) ||
        (d.owner?.name ?? '').toLowerCase().includes(q) ||
        (d.stage?.name ?? '').toLowerCase().includes(q),
      )
    }
    // Bundle AL: optimistic reorder override (list view only).
    if (listOrderOverride) {
      const indexed = new Map(listOrderOverride.map((id, i) => [id, i]))
      base = [...base].sort((a, b) => {
        const ai = indexed.has(a.id) ? indexed.get(a.id)! : Number.MAX_SAFE_INTEGER
        const bi = indexed.has(b.id) ? indexed.get(b.id)! : Number.MAX_SAFE_INTEGER
        return ai - bi
      })
    }
    return base
  }, [deals, debouncedSearch, listOrderOverride])

  /* ---- Drag-drop reorder (Bundle AL, list view only) ---- */
  const handleListReorderDrop = useCallback(async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const currentOrder = visibleDeals.map((d) => d.id)
    const fromIdx = currentOrder.indexOf(sourceId)
    const toIdx = currentOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...currentOrder]
    reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, sourceId)
    setListOrderOverride(reordered)
    try {
      const res = await fetch('/api/deals/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error ?? `Failed (${res.status})`)
      }
      addToast(t('toasts.reordered'), 'success')
      fetchDeals()
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('toasts.reorderFailed'), 'error')
      setListOrderOverride(null)
    }
  }, [visibleDeals, addToast, fetchDeals, t])

  /* ---- j/k row navigation (Bundle AF) — list view only ---- */
  const moveFocus = useCallback((delta: number) => {
    if (visibleDeals.length === 0) return
    const idx = focusedDealId
      ? visibleDeals.findIndex((d) => d.id === focusedDealId)
      : -1
    const nextIdx = Math.max(0, Math.min(visibleDeals.length - 1, (idx === -1 ? 0 : idx + delta)))
    const nextId = visibleDeals[nextIdx].id
    setFocusedDealId(nextId)
    const el = rowRefs.current.get(nextId)
    el?.scrollIntoView({ block: 'nearest' })
  }, [visibleDeals, focusedDealId])

  useGlobalShortcuts(
    {
      j: () => moveFocus(1),
      k: () => moveFocus(-1),
      Enter: () => {
        if (focusedDealId) router.push(`/deals/${focusedDealId}`)
      },
    },
    view === 'list',
  )

  // Reset focus when the underlying list changes (filter / page swap).
  useEffect(() => {
    if (focusedDealId && !visibleDeals.some((d) => d.id === focusedDealId)) {
      setFocusedDealId(null)
    }
  }, [visibleDeals, focusedDealId])

  /* Bundle BV state declarations live above the dealsByStage memo
     so refs/state are valid during render; the moveKanbanFocus
     callback is declared further down (right after dealsByStage)
     so it can read the per-stage deal arrays without a TDZ. */
  const [kanbanFocusedDealId, setKanbanFocusedDealId] = useState<string | null>(null)
  const kanbanCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

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
      addToast(t('toasts.created'), 'success')
      fetchDeals()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSaving(false)
    }
  }

  /* ---- Move deal between stages (drag-and-drop) ---- */
  const moveDeal = useCallback(async (dealId: string, stageId: string) => {
    if (!dealsData) return
    const snapshot = dealsData
    const newStage = currentPipelineStages.find(s => s.id === stageId)
    if (!newStage) return
    const next: DealsResponse = {
      ...dealsData,
      data: dealsData.data.map(d =>
        d.id === dealId
          ? { ...d, stage: { id: newStage.id, name: newStage.name, color: newStage.color } }
          : d,
      ),
    }
    void dealsMutate(next, { revalidate: false })
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      })
      if (!res.ok) throw new Error('Failed to move deal')
      addToast(t('toasts.moved'), 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('toasts.moveFailed'), 'error')
      void dealsMutate(snapshot, { revalidate: true })
    }
  }, [dealsData, dealsMutate, currentPipelineStages, addToast, t])

  /* ---- Delete (used by context menu) ---- */
  const deleteDeal = useCallback(async (dealId: string) => {
    if (!dealsData) return
    const ok = await confirm({ title: t('confirms.delete'), confirmLabel: tCommon('delete'), cancelLabel: tCommon('cancel'), danger: true })
    if (!ok) return
    const snapshot = dealsData
    const next: DealsResponse = {
      ...dealsData,
      data: dealsData.data.filter((d) => d.id !== dealId),
    }
    void dealsMutate(next, { revalidate: false })
    try {
      const res = await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`Failed (${res.status})`)
      addToast(t('toasts.deleted'), 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('toasts.deleteFailed'), 'error')
      void dealsMutate(snapshot, { revalidate: true })
    }
  }, [dealsData, dealsMutate, addToast, t])

  /* ---- Change status (for quick won/lost) ---- */
  const setDealStatus = async (dealId: string, status: string) => {
    if (!dealsData) return
    const snapshot = dealsData
    const next: DealsResponse = {
      ...dealsData,
      data: dealsData.data.map(d => (d.id === dealId ? { ...d, status } : d)),
    }
    void dealsMutate(next, { revalidate: false })
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      addToast(t('toasts.marked', { status }), 'success')
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('toasts.updateFailed'), 'error')
      void dealsMutate(snapshot, { revalidate: true })
    }
  }

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

  /* ---- Bundle BV — 2D kanban navigation (board view only) ----
     j / k       → next / previous deal in the same stage column
     h / l       → previous / next stage column (clamps row to
                   target stage's bounds; skips empty stages)
     Enter       → open the focused deal full page */
  const moveKanbanFocus = useCallback((dx: number, dy: number) => {
    const stages = currentPipelineStages
    if (stages.length === 0) return

    let curStageIdx = -1
    let curRow = -1
    if (kanbanFocusedDealId) {
      for (let s = 0; s < stages.length; s++) {
        const sd = dealsByStage.get(stages[s].id) ?? []
        const r = sd.findIndex(d => d.id === kanbanFocusedDealId)
        if (r >= 0) { curStageIdx = s; curRow = r; break }
      }
    }
    if (curStageIdx === -1) {
      for (let s = 0; s < stages.length; s++) {
        const sd = dealsByStage.get(stages[s].id) ?? []
        if (sd.length > 0) { curStageIdx = s; curRow = 0; break }
      }
      if (curStageIdx === -1) return
    } else {
      let newStageIdx = curStageIdx + dx
      let newRow = curRow + dy
      // Skip empty stages on horizontal move so h/l never lands dead.
      while (dx !== 0 && newStageIdx >= 0 && newStageIdx < stages.length) {
        const sd = dealsByStage.get(stages[newStageIdx].id) ?? []
        if (sd.length > 0) break
        newStageIdx += dx > 0 ? 1 : -1
      }
      if (newStageIdx < 0 || newStageIdx >= stages.length) return
      const targetDeals = dealsByStage.get(stages[newStageIdx].id) ?? []
      if (targetDeals.length === 0) return
      newRow = Math.max(0, Math.min(targetDeals.length - 1, newRow))
      curStageIdx = newStageIdx
      curRow = newRow
    }

    const stageDeals = dealsByStage.get(stages[curStageIdx].id) ?? []
    const nextId = stageDeals[curRow]?.id
    if (!nextId) return
    setKanbanFocusedDealId(nextId)
    const el = kanbanCardRefs.current.get(nextId)
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [currentPipelineStages, dealsByStage, kanbanFocusedDealId])

  useGlobalShortcuts(
    {
      j: () => moveKanbanFocus(0, 1),
      k: () => moveKanbanFocus(0, -1),
      h: () => moveKanbanFocus(-1, 0),
      l: () => moveKanbanFocus(1, 0),
      Enter: () => {
        if (kanbanFocusedDealId) router.push(`/deals/${kanbanFocusedDealId}`)
      },
    },
    view === 'board',
  )

  // Reset kanban focus when the underlying data drops the focused id.
  useEffect(() => {
    if (kanbanFocusedDealId && !visibleDeals.some(d => d.id === kanbanFocusedDealId)) {
      setKanbanFocusedDealId(null)
    }
  }, [visibleDeals, kanbanFocusedDealId])

  /* ------------------------------------------------------------------
     Render
     ------------------------------------------------------------------ */

  const noPipelines = !loading && pipelines.length === 0

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} onAdd={() => setShowAdd(true)} addLabel={t('addLabel')} />
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
              placeholder={t('filters.search')}
              aria-label={t('filters.search')}
              style={{
                flex: 1, background: 'none', border: 'none',
                fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setFilters({ q: '' })} aria-label={t('filters.clearSearch')}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--txt3)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          <FilterSelect
            icon={Filter}
            value={selectedPipeline}
            onChange={v => { setFilters({ pipelineId: v }); setPage(1) }}
            ariaLabel={t('filters.allPipelines')}
            options={[
              { value: '', label: t('filters.allPipelines') },
              ...pipelines.map(p => ({ value: p.id, label: p.name })),
            ]}
          />
          <FilterSelect
            icon={Filter}
            value={statusFilter}
            onChange={v => { setFilters({ status: v }); setPage(1) }}
            ariaLabel={t('filters.allStatuses')}
            options={[
              { value: '', label: t('filters.allStatuses') },
              { value: 'open', label: t('statuses.open') },
              { value: 'won', label: t('statuses.won') },
              { value: 'lost', label: t('statuses.lost') },
            ]}
          />

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2, padding: 3, borderRadius: 8,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            marginLeft: 'auto',
          }}>
            {[
              { key: 'board', icon: LayoutGrid, label: t('view.board') },
              { key: 'list',  icon: ListIcon,   label: t('view.list')  },
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
              {t('empty.title')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
              {t('empty.hint')}
            </div>
          </div>
        )}

        {/* Bundle BU — advanced filter builder (deals lift). */}
        {!noPipelines && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label={t('filters.openAdvanced')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                background: filterSpec ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'var(--bg2)',
                color: filterSpec ? 'var(--accent)' : 'var(--txt2)',
                border: filterSpec ? '1px solid var(--accent)' : '1px solid var(--border)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Filter size={12} />
              {filterSpec
                ? t('advanced.withCount', { n: filterSpec.rules.length })
                : t('advanced.label')}
            </button>
            {filterSpec && (
              <button
                type="button"
                onClick={() => setFilterSpec(null)}
                aria-label={t('filters.clearAdvanced')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
                  background: 'var(--bg2)', color: 'var(--txt2)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <X size={12} />
                {t('advanced.clear')}
              </button>
            )}
          </div>
        )}

        {/* Saved views (Bundle AA) — persists q/status/pipelineId/view + advanced. */}
        {!noPipelines && (
          <SavedViewsBar
            entity="deals"
            currentFilters={{ q: search, status: statusFilter, pipelineId: selectedPipeline, view, advanced: filterSpec ?? undefined }}
            onApply={applySavedView}
          />
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
                    ) : stageDeals.map(deal => {
                      const isKanbanFocused = kanbanFocusedDealId === deal.id
                      return (
                      <div
                        key={deal.id}
                        ref={(el) => {
                          if (el) kanbanCardRefs.current.set(deal.id, el)
                          else kanbanCardRefs.current.delete(deal.id)
                        }}
                        draggable
                        onDragStart={e => {
                          setDraggingId(deal.id)
                          e.dataTransfer.setData('text/deal-id', deal.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => { setDraggingId(null); setDropTargetStage(null) }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setCtxMenu({ x: e.clientX, y: e.clientY, dealId: deal.id })
                        }}
                        onMouseEnter={() => setKanbanFocusedDealId(deal.id)}
                        style={{
                          background: 'var(--bg2)',
                          border: isKanbanFocused ? '2px solid var(--accent)' : '1px solid var(--border)',
                          borderRadius: 10, padding: '10px 12px',
                          cursor: 'grab',
                          opacity: draggingId === deal.id ? 0.4 : 1,
                          boxShadow: isKanbanFocused
                            ? '0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent)'
                            : undefined,
                          transition: 'opacity 120ms ease, transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <GripVertical size={12} style={{ color: 'var(--txt3)', marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <Link href={`/deals/${deal.id}`} style={{
                                flex: 1, minWidth: 0,
                                fontSize: 12.5, fontWeight: 600, color: 'var(--txt)',
                                textDecoration: 'none', display: 'block', lineHeight: 1.35,
                              }}>{deal.title}</Link>
                              <button
                                type="button"
                                aria-label={`Quick view ${deal.title}`}
                                onClick={(e) => { e.stopPropagation(); setQuickViewId(deal.id) }}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{
                                  width: 22, height: 22, padding: 0, borderRadius: 5,
                                  background: 'transparent', border: '1px solid transparent',
                                  color: 'var(--txt3)', cursor: 'pointer',
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'var(--bg2)'
                                  e.currentTarget.style.borderColor = 'var(--border)'
                                  e.currentTarget.style.color = 'var(--txt)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.borderColor = 'transparent'
                                  e.currentTarget.style.color = 'var(--txt3)'
                                }}
                              >
                                <Eye size={12} />
                              </button>
                            </div>
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
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ========== LIST VIEW ========== */}
        {view === 'list' && !noPipelines && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <ColumnPicker
                columns={DEAL_COLUMN_DEFS}
                visible={dealColumns.visible}
                onToggle={dealColumns.toggle}
                onReset={dealColumns.reset}
                isOverridden={dealColumns.isOverridden}
              />
            </div>
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: dealsGridTemplate,
                gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)',
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: 'var(--txt3)',
              }}>
                {visibleDealColumns.map((c) => (
                  <span key={c.id}>{c.id === 'probability' ? 'Prob.' : c.label}</span>
                ))}
                <span aria-hidden></span>
              </div>
              {dealsQuery.error ? (
                <div style={{ padding: 16 }}><ListError onRetry={fetchDeals} message={dealsQuery.error} /></div>
              ) : loading ? (
                <div style={{ padding: 16 }}><ListLoading /></div>
              ) : visibleDeals.length === 0 ? (
                <div style={{ padding: 16 }}><ListEmpty /></div>
              ) : visibleDeals.map((deal, idx) => {
                const isFocused = focusedDealId === deal.id
                const isDragOver = listDragOverId === deal.id
                return (
                <Link key={deal.id} href={`/deals/${deal.id}`}
                  ref={(el) => {
                    if (el) rowRefs.current.set(deal.id, el)
                    else rowRefs.current.delete(deal.id)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setCtxMenu({ x: e.clientX, y: e.clientY, dealId: deal.id })
                  }}
                  onMouseEnter={() => setFocusedDealId(deal.id)}
                  draggable
                  onDragStart={(e) => {
                    setListDragId(deal.id)
                    e.dataTransfer.setData('text/deal-id', deal.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    if (!listDragId || listDragId === deal.id) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (listDragOverId !== deal.id) setListDragOverId(deal.id)
                  }}
                  onDragLeave={() => { if (listDragOverId === deal.id) setListDragOverId(null) }}
                  onDrop={(e) => {
                    e.preventDefault()
                    const sourceId = e.dataTransfer.getData('text/deal-id') || listDragId
                    setListDragId(null)
                    setListDragOverId(null)
                    if (sourceId) handleListReorderDrop(sourceId, deal.id)
                  }}
                  onDragEnd={() => { setListDragId(null); setListDragOverId(null) }}
                  style={{
                  display: 'grid',
                  gridTemplateColumns: dealsGridTemplate,
                  gap: 12, padding: '10px 16px',
                  borderBottom: idx < visibleDeals.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: 12, alignItems: 'center',
                  background: isDragOver
                    ? 'color-mix(in srgb, var(--accent) 14%, var(--panel))'
                    : isFocused
                    ? 'color-mix(in srgb, var(--accent) 8%, var(--panel))'
                    : (idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent'),
                  textDecoration: 'none', color: 'inherit',
                  outline: isDragOver
                    ? '2px solid var(--accent)'
                    : (isFocused ? '2px solid var(--accent)' : 'none'),
                  outlineOffset: (isFocused || isDragOver) ? -2 : 0,
                  opacity: listDragId === deal.id ? 0.55 : 1,
                  cursor: listDragId === deal.id ? 'grabbing' : 'grab',
                }}>
                  {visibleDealColumns.map((c) => {
                    if (c.id === 'deal') return (
                      <div key="deal">
                        <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{deal.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{deal.owner?.name ?? 'Unassigned'}</div>
                      </div>
                    )
                    if (c.id === 'stage') return (
                      <span key="stage" style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: deal.stage.color + '22', color: deal.stage.color,
                        display: 'inline-block', maxWidth: 'fit-content',
                      }}>{deal.stage.name}</span>
                    )
                    if (c.id === 'value') return (
                      <span key="value" className="mono" style={{ fontWeight: 600 }}>{fmtMoney(deal.valueCents)}</span>
                    )
                    if (c.id === 'probability') return (
                      <span key="probability" className="mono">{deal.probability}%</span>
                    )
                    if (c.id === 'contact') return (
                      <span key="contact" style={{ fontSize: 11, color: 'var(--txt2)' }}>{deal.contact?.name ?? '-'}</span>
                    )
                    if (c.id === 'status') return (
                      <span key="status" style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                        textTransform: 'uppercase',
                        background: STATUS_COLORS[deal.status]?.bg ?? 'var(--bg2)',
                        color: STATUS_COLORS[deal.status]?.txt ?? 'var(--txt2)',
                        display: 'inline-block', maxWidth: 'fit-content',
                      }}>{deal.status}</span>
                    )
                    return <span key={c.id} />
                  })}
                  <button
                    type="button"
                    aria-label={`Quick view ${deal.title}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickViewId(deal.id) }}
                    style={{
                      width: 28, height: 28, padding: 0, borderRadius: 6,
                      background: 'transparent', border: '1px solid transparent',
                      color: 'var(--txt3)', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg2)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.color = 'var(--txt)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                      e.currentTarget.style.color = 'var(--txt3)'
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </Link>
                )
              })}
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
                  aria-label="Title"
                  style={fieldInputStyle}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Pipeline *">
                  <select value={addPipelineId} onChange={e => setAddPipelineId(e.target.value)} aria-label="Pipeline" style={fieldInputStyle}>
                    {pipelines.length === 0 && <option value="">{t('pipelines.empty')}</option>}
                    {pipelines.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Stage *">
                  <select value={addStageId} onChange={e => setAddStageId(e.target.value)} aria-label="Stage" style={fieldInputStyle}>
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
                    aria-label="Value ($)"
                    style={fieldInputStyle}
                  />
                </Field>
                <Field label="Probability (%)">
                  <input
                    type="number" min={0} max={100}
                    value={addProbability} onChange={e => setAddProbability(e.target.value)}
                    aria-label="Probability (%)"
                    style={fieldInputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Status">
                  <select value={addStatus} onChange={e => setAddStatus(e.target.value)} aria-label="Status" style={fieldInputStyle}>
                    <option value="open">Open</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </Field>
                <Field label="Expected Close">
                  <input
                    type="date"
                    value={addExpectedClose} onChange={e => setAddExpectedClose(e.target.value)}
                    aria-label="Expected Close"
                    style={fieldInputStyle}
                  />
                </Field>
              </div>

              <Field label="Contact">
                <select value={addContactId} onChange={e => setAddContactId(e.target.value)} aria-label="Contact" style={fieldInputStyle}>
                  <option value="">— None —</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : ''}</option>
                  ))}
                </select>
              </Field>

              <Field label="Notes">
                <textarea
                  value={addNotes} onChange={e => setAddNotes(e.target.value)}
                  rows={3} placeholder={t('form.notesPlaceholder')}
                  aria-label="Notes"
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
              >{t('form.cancel')}</button>
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

      <DealQuickView dealId={quickViewId} onClose={() => setQuickViewId(null)} />

      <AdvancedFilterBuilder
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        schema={DEAL_FILTER_SCHEMA}
        initial={filterSpec}
        onApply={(spec) => setFilterSpec(spec)}
      />

      {ctxMenu && (() => {
        const d = dealsData?.data.find((x) => x.id === ctxMenu.dealId)
        if (!d) return null
        const items: ContextMenuItem[] = [
          { kind: 'action', label: 'Open', icon: ExternalLink, shortcut: 'Enter',
            onClick: () => router.push(`/deals/${d.id}`) },
          { kind: 'action', label: 'Quick view', icon: Eye,
            onClick: () => setQuickViewId(d.id) },
          { kind: 'separator' },
          { kind: 'action', label: 'Mark won', icon: CheckCircle,
            disabled: d.status !== 'open',
            onClick: () => setDealStatus(d.id, 'won') },
          { kind: 'action', label: 'Mark lost', icon: XCircle,
            disabled: d.status !== 'open',
            onClick: () => setDealStatus(d.id, 'lost') },
          { kind: 'separator' },
          { kind: 'action', label: 'Copy contact email',
            icon: Copy,
            disabled: !d.contact?.name,
            onClick: () => {
              if (!d.contact) { addToast(t('toasts.noContact'), 'error'); return }
              navigator.clipboard?.writeText(d.contact.name).then(
                () => addToast(t('toasts.contactCopied'), 'success'),
                () => addToast(t('toasts.copyFailed'), 'error'),
              )
            } },
          { kind: 'separator' },
          { kind: 'action', label: 'Delete', icon: Trash2, destructive: true,
            onClick: () => deleteDeal(d.id) },
        ]
        return (
          <ContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            items={items}
            onClose={() => setCtxMenu(null)}
          />
        )
      })()}
    </>
  )
}

/* ------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------ */

function FilterSelect({
  icon: Icon, value, onChange, options, ariaLabel,
}: {
  icon: typeof Filter
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  ariaLabel?: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
      borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)',
      fontSize: 12,
    }}>
      <Icon size={13} style={{ color: 'var(--txt3)' }} />
      <select value={value} onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
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
