'use client'

import { use, useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useTranslations } from 'next-intl'
import { useApi } from '@/hooks/philly/useApi'
import { useToast } from '@/hooks/philly/useToast'
import { useFormat } from '@/hooks/philly/useFormat'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'
import {
  ArrowLeft, Tag, Calendar, Save, X, Pencil, Target,
  FolderKanban, Users, DollarSign, TrendingUp, CheckCircle2, Circle,
  Plus, Trash2, Clock, AlertCircle, Sparkles, Briefcase,
} from 'lucide-react'

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Milestone {
  id: string
  projectId: string
  title: string
  dueDate: string
  completedAt: string | null
  status: 'pending' | 'completed' | 'overdue'
}

interface ImpactMetric {
  id: string
  projectId: string
  metricType: string
  value: number
  unit: string
  date: string
  notes: string
}

interface ContactLink {
  id: string
  role: string
  contact: {
    id: string
    name: string
    email: string
    type: string
    avatarUrl: string | null
  }
}

interface Project {
  id: string
  title: string
  description: string
  status: 'planned' | 'active' | 'completed' | 'paused'
  category: string
  startDate: string
  endDate: string | null
  budgetCents: number
  spentCents: number
  sdgGoals: number[] | string
  createdAt: string
  updatedAt: string
  milestones: Milestone[]
  impactMetrics: ImpactMetric[]
  contactProjects: ContactLink[]
}

/* ------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------ */

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
}

const SDG_LABELS: Record<number, string> = {
  1: 'No Poverty', 2: 'Zero Hunger', 3: 'Good Health', 4: 'Quality Education',
  5: 'Gender Equality', 6: 'Clean Water', 7: 'Affordable Energy', 8: 'Decent Work',
  9: 'Industry & Innovation', 10: 'Reduced Inequalities', 11: 'Sustainable Cities',
  12: 'Responsible Consumption', 13: 'Climate Action', 14: 'Life Below Water',
  15: 'Life on Land', 16: 'Peace & Justice', 17: 'Partnerships',
}

const statusColors: Record<string, { bg: string; txt: string; border: string; dot: string }> = {
  active:    { bg: 'var(--g-bg)',      txt: 'var(--g-txt)',      border: 'var(--g-border)',      dot: 'var(--g)' },
  planned:   { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)', dot: 'var(--accent)' },
  completed: { bg: 'var(--p-bg)',      txt: 'var(--p-txt)',      border: 'var(--p-border)',      dot: 'var(--p)' },
  paused:    { bg: 'var(--o-bg)',      txt: 'var(--o-txt)',      border: 'var(--o-border)',      dot: 'var(--o)' },
}

/** Impact type catalog. Labels are translated at render time via tp('impact.types.<key>'). */
const IMPACT_TYPES = [
  { key: 'co2_kg',         unit: 'kg',     icon: Sparkles },
  { key: 'people_helped',  unit: 'people', icon: Users },
  { key: 'trees_planted',  unit: 'trees',  icon: Sparkles },
  { key: 'money_donated',  unit: 'EUR',    icon: DollarSign },
  { key: 'water_liters',   unit: 'L',      icon: Sparkles },
  { key: 'energy_kwh',     unit: 'kWh',    icon: Sparkles },
  { key: 'custom',         unit: '',       icon: Target },
]

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function parseSdgs(raw: number[] | string): number[] {
  if (Array.isArray(raw)) return raw
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] }
  catch { return [] }
}

function getImpactLabel(type: string, tp: (k: string) => string): string {
  const known = IMPACT_TYPES.find(t => t.key === type)
  if (known) {
    try { return tp(`impact.types.${known.key}`) } catch { /* fallthrough */ }
  }
  return type.replace(/_/g, ' ')
}

// LOC-03 — takes the locale-bound formatter. money_donated values are
// major euros; everything else is a plain (already-major) number.
function formatImpactValue(
  type: string,
  value: number,
  unit: string,
  fmt: { currency: (n: number) => string; number: (n: number) => string },
): string {
  if (type === 'money_donated') {
    return fmt.currency(value)
  }
  if (type === 'water_liters' && value >= 1000) return `${(value / 1000).toFixed(1)} kL`
  if (type === 'energy_kwh' && value >= 1000) return `${(value / 1000).toFixed(1)} MWh`
  const num = fmt.number(value)
  return unit ? `${num} ${unit}` : num
}

function daysBetween(start: string, end: string | null): number {
  const a = new Date(start).getTime()
  const b = (end ? new Date(end) : new Date()).getTime()
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)))
}

/* ------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------ */

type Tab = 'overview' | 'milestones' | 'impact' | 'contacts' | 'deals'

const TABS: { key: Tab; icon: typeof Target }[] = [
  { key: 'overview',   icon: FolderKanban },
  { key: 'milestones', icon: CheckCircle2 },
  { key: 'impact',     icon: TrendingUp },
  { key: 'contacts',   icon: Users },
  { key: 'deals',      icon: Briefcase },
]

interface ProjectDeal {
  id: string
  title: string
  valueCents: number
  probability: number
  status: string
  expectedClose: string | null
  stage: { id: string; name: string; color: string }
  pipeline: { id: string; name: string } | null
  contact: { id: string; name: string } | null
}

/* ------------------------------------------------------------------
   Page
   ------------------------------------------------------------------ */

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('projects')
  const tp = useTranslations('projectDetail')
  const tCommon = useTranslations('common')
  const { addToast } = useToast()
  // LOC-03 — locale-bound money/date. `formatDate` keeps its name so the
  // existing call-sites are unchanged. fmtMoney handles cents (deal values);
  // budget/spent are already major euros (see stats memo).
  const fmt = useFormat()
  const formatDate = (iso: string) => fmt.date(iso)
  const fmtMoney = (cents: number) => fmt.currency(cents, { cents: true })

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)

  const projectQuery = useApi<{ data: Project }>(`/projects/${id}`)
  const project = projectQuery.data?.data ?? null
  const dealsQuery = useApi<{ data: ProjectDeal[] }>(`/deals?projectId=${id}&limit=100`)
  const deals = dealsQuery.data?.data ?? []

  // Live-refresh on any project mutation for this org
  useEntitySubscription('project', projectQuery.refetch)
  useEntitySubscription('deal', dealsQuery.refetch)

  /* ---- Inline edit state ---- */
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editStatus, setEditStatus] = useState<Project['status']>('planned')
  const [editBudget, setEditBudget] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  useEffect(() => {
    if (project) {
      setEditTitle(project.title)
      setEditDescription(project.description)
      setEditCategory(project.category)
      setEditStatus(project.status)
      setEditBudget(((project.budgetCents ?? 0) / 100).toString())
      setEditStart(project.startDate?.slice(0, 10) ?? '')
      setEditEnd(project.endDate ? project.endDate.slice(0, 10) : '')
    }
  }, [project])

  const handleSave = useCallback(async () => {
    try {
      const budgetNum = Number(editBudget)
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          category: editCategory,
          status: editStatus,
          budgetCents: Number.isFinite(budgetNum) ? Math.round(budgetNum * 100) : 0,
          startDate: editStart ? new Date(editStart).toISOString() : undefined,
          endDate: editEnd ? new Date(editEnd).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || tp('toasts.failedUpdateProject'))
      }
      addToast(tp('toasts.updated'), 'success')
      setEditing(false)
      projectQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : tp('toasts.somethingWrong'), 'error')
    }
  }, [id, editTitle, editDescription, editCategory, editStatus, editBudget, editStart, editEnd, addToast, projectQuery, tp])

  /* ---- Milestones ---- */
  const [newMsTitle, setNewMsTitle] = useState('')
  const [newMsDate, setNewMsDate] = useState('')
  const [addingMs, setAddingMs] = useState(false)

  const handleAddMilestone = useCallback(async () => {
    if (!newMsTitle.trim() || !newMsDate) return
    setAddingMs(true)
    try {
      const res = await fetch(`/api/projects/${id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newMsTitle.trim(),
          dueDate: new Date(newMsDate).toISOString(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || tp('toasts.failedAddMilestone'))
      }
      addToast(tp('toasts.milestoneAdded'), 'success')
      setNewMsTitle('')
      setNewMsDate('')
      projectQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : tp('toasts.somethingWrong'), 'error')
    } finally {
      setAddingMs(false)
    }
  }, [id, newMsTitle, newMsDate, addToast, projectQuery, tp])

  const handleToggleMilestone = useCallback(async (ms: Milestone) => {
    const next = ms.status === 'completed' ? 'pending' : 'completed'
    try {
      const res = await fetch(`/api/projects/${id}/milestones/${ms.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error(tp('toasts.failedUpdateMilestone'))
      projectQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : tp('toasts.somethingWrong'), 'error')
    }
  }, [id, addToast, projectQuery, tp])

  const handleDeleteMilestone = useCallback(async (msId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/milestones/${msId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(tp('toasts.failedDeleteMilestone'))
      addToast(tp('toasts.milestoneRemoved'), 'success')
      projectQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : tp('toasts.somethingWrong'), 'error')
    }
  }, [id, addToast, projectQuery, tp])

  /* ---- Impact metrics ---- */
  const [newMetricType, setNewMetricType] = useState('co2_kg')
  const [newMetricValue, setNewMetricValue] = useState('')
  const [newMetricNotes, setNewMetricNotes] = useState('')
  const [addingMetric, setAddingMetric] = useState(false)

  const handleAddMetric = useCallback(async () => {
    const v = Number(newMetricValue)
    if (!Number.isFinite(v) || v <= 0) {
      addToast(tp('toasts.positiveValueRequired'), 'error')
      return
    }
    setAddingMetric(true)
    try {
      const unit = IMPACT_TYPES.find(t => t.key === newMetricType)?.unit ?? ''
      const res = await fetch(`/api/projects/${id}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metricType: newMetricType,
          value: v,
          unit,
          notes: newMetricNotes.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }))
        throw new Error(err.error || tp('toasts.failedAddMetric'))
      }
      addToast(tp('toasts.impactRecorded'), 'success')
      setNewMetricValue('')
      setNewMetricNotes('')
      projectQuery.refetch()
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : tp('toasts.somethingWrong'), 'error')
    } finally {
      setAddingMetric(false)
    }
  }, [id, newMetricType, newMetricValue, newMetricNotes, addToast, projectQuery, tp])

  /* ---- Derived stats ---- */
  const stats = useMemo(() => {
    if (!project) return null
    const totalMs = project.milestones.length
    const doneMs = project.milestones.filter(m => m.status === 'completed').length
    const progress = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0
    const budget = project.budgetCents / 100
    const spent = project.spentCents / 100
    const burn = budget > 0 ? Math.round((spent / budget) * 100) : 0
    const days = daysBetween(project.startDate, project.endDate)
    const sdgs = parseSdgs(project.sdgGoals)
    return { totalMs, doneMs, progress, budget, spent, burn, days, sdgs }
  }, [project])

  /* ---- Loading / Error ---- */
  if (projectQuery.loading) {
    return (
      <>
        <Topbar title={tp('titleFallback')} sub={tCommon('loading')} />
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--txt3)', fontSize: 14 }}>
          {tCommon('loading')}
        </div>
      </>
    )
  }

  if (!project || !stats) {
    return (
      <>
        <Topbar title={tp('titleFallback')} sub={tp('notFound')} />
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--txt3)', marginBottom: 16 }}>{tp('notFound')}</div>
          <Link href="/projects" style={{
            fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
          }}>
            {tp('backToProjects')}
          </Link>
        </div>
      </>
    )
  }

  const sc = statusColors[project.status] || statusColors.planned

  return (
    <>
      <Topbar title={project.title} sub={`${project.category} · ${project.status}`} />

      <div style={{ padding: '18px 24px 40px' }}>

        {/* ---- Back link ---- */}
        <Link href="/projects" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600, color: 'var(--txt2)',
          textDecoration: 'none', marginBottom: 16,
        }}>
          <ArrowLeft size={14} />
          {tp('backToProjects')}
        </Link>

        {/* ---- Header card ---- */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 16,
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', alignItems: 'flex-start', gap: 16,
        }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `color-mix(in srgb, ${sc.dot} 14%, transparent)`,
            border: `1px solid ${sc.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <FolderKanban size={24} color={sc.dot} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  placeholder={t('fields.title')}
                  aria-label={t('fields.title')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 16, fontWeight: 700,
                  }}
                />
                <textarea
                  value={editDescription} onChange={e => setEditDescription(e.target.value)}
                  placeholder={t('fields.description')}
                  aria-label={t('fields.description')}
                  rows={2}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, lineHeight: 1.5,
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input
                    value={editCategory} onChange={e => setEditCategory(e.target.value)}
                    placeholder={t('fields.category')}
                    aria-label={t('fields.category')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12,
                    }}
                  />
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as Project['status'])}
                    aria-label={t('fields.status')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12, fontFamily: 'inherit',
                    }}
                  >
                    <option value="planned">{tp('statuses.planned')}</option>
                    <option value="active">{tp('statuses.active')}</option>
                    <option value="completed">{tp('statuses.completed')}</option>
                    <option value="paused">{tp('statuses.paused')}</option>
                  </select>
                  <input
                    type="number" min={0} step={100}
                    value={editBudget} onChange={e => setEditBudget(e.target.value)}
                    placeholder={tp('budgetPlaceholder')}
                    aria-label={t('fields.budget')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12,
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="date"
                    value={editStart} onChange={e => setEditStart(e.target.value)}
                    aria-label={t('fields.startDate')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12, fontFamily: 'inherit',
                    }}
                  />
                  <input
                    type="date"
                    value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    aria-label={t('fields.endDate')}
                    style={{
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                      background: 'var(--bg2)', fontSize: 12, fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, lineHeight: 1.3 }}>
                  {project.title}
                </div>
                {project.description && (
                  <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.55, marginBottom: 8, whiteSpace: 'pre-wrap' }}>
                    {project.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                    background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                    textTransform: 'capitalize',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: sc.dot }} />
                    {project.status}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                    background: 'var(--bg2)', color: 'var(--txt2)',
                    border: '1px solid var(--border)',
                  }}>{project.category}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--txt3)' }}>
                    <Calendar size={11} /> {formatDate(project.startDate)}
                    {project.endDate && ` → ${formatDate(project.endDate)}`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Edit / Save / Cancel */}
          {editing ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={handleSave} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Save size={13} /> {tCommon('save')}
              </button>
              <button onClick={() => setEditing(false)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <X size={13} /> {tCommon('cancel')}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--bg2)', color: 'var(--txt2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}>
              <Pencil size={13} /> {tCommon('edit')}
            </button>
          )}
        </div>

        {/* ---- Tabs ---- */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 16,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 4,
        }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            const count =
              tab.key === 'milestones' ? project.milestones.length :
              tab.key === 'impact' ? project.impactMetrics.length :
              tab.key === 'contacts' ? project.contactProjects.length : null
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: isActive ? 'var(--txt)' : 'transparent',
                color: isActive ? 'var(--panel)' : 'var(--txt2)',
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}>
                <Icon size={13} />
                {tp(`tabs.${tab.key}`)}
                {count !== null && count > 0 && (
                  <span className="mono" style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 10,
                    background: isActive ? 'color-mix(in srgb, var(--panel) 20%, transparent)' : 'var(--bg2)',
                    color: isActive ? 'var(--panel)' : 'var(--txt3)',
                    fontWeight: 700,
                  }}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* ============== OVERVIEW ============== */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Quick stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { label: tp('stats.progress'), value: `${stats.progress}%`, sub: tp('stats.milestonesSummary', { done: stats.doneMs, total: stats.totalMs }), icon: CheckCircle2, color: stats.progress >= 80 ? 'var(--g)' : stats.progress >= 50 ? 'var(--accent)' : 'var(--y)' },
                { label: tp('stats.budget'), value: fmt.compactCurrency(stats.budget), sub: tp('stats.burnPercent', { burn: stats.burn }), icon: DollarSign, color: 'var(--accent)' },
                { label: tp('stats.impactEntries'), value: project.impactMetrics.length, sub: tp('stats.records'), icon: TrendingUp, color: 'var(--g)' },
                { label: tp('stats.daysActive'), value: stats.days, sub: project.endDate ? tp('stats.totalDuration') : tp('stats.soFar'), icon: Clock, color: 'var(--p)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <s.icon size={16} color={s.color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="mono" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{s.value}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{s.label} · {s.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress + Burn */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tp('sections.milestoneProgress')}</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>
                    {stats.progress}%
                  </div>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--bg2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${stats.progress}%`,
                    background: stats.progress >= 80 ? 'var(--g)' : stats.progress >= 50 ? 'var(--accent)' : 'var(--y)',
                    borderRadius: 5, transition: 'width 400ms ease',
                  }} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 8 }}>
                  {tp('stats.milestonesCompleted', { done: stats.doneMs, total: stats.totalMs })}
                </div>
              </div>

              <div style={{
                background: 'var(--panel)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{tp('sections.budgetBurn')}</div>
                  <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: stats.burn > 100 ? 'var(--r)' : 'var(--txt)' }}>
                    {stats.burn}%
                  </div>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: 'var(--bg2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, stats.burn)}%`,
                    background: stats.burn > 100 ? 'var(--r)' : stats.burn > 80 ? 'var(--o)' : 'var(--g)',
                    borderRadius: 5, transition: 'width 400ms ease',
                  }} />
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 8 }}>
                  {tp('stats.budgetSpent', { spent: fmt.number(stats.spent), budget: fmt.number(stats.budget) })}
                </div>
              </div>
            </div>

            {/* Project details grid */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{tp('sections.projectDetails')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { icon: Tag,      label: t('fields.category'), value: project.category },
                  { icon: AlertCircle, label: t('fields.status'), value: project.status, cap: true },
                  { icon: Calendar, label: t('fields.startDate'), value: formatDate(project.startDate) },
                  { icon: Calendar, label: t('fields.endDate'),   value: project.endDate ? formatDate(project.endDate) : '—' },
                  { icon: DollarSign, label: t('fields.budget'), value: fmt.currency(stats.budget) },
                  { icon: Clock,    label: tCommon('created'),   value: formatDate(project.createdAt) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <row.icon size={14} color="var(--txt3)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 2 }}>{row.label}</div>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--txt)',
                        textTransform: row.cap ? 'capitalize' : undefined,
                      }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {stats.sdgs.length > 0 && (
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 8 }}>{t('fields.sdgGoals')}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {stats.sdgs.map(s => (
                      <div key={s} title={SDG_LABELS[s]} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px 4px 4px', borderRadius: 16,
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 11, background: SDG_COLORS[s],
                          fontSize: 10, fontWeight: 700, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s}</div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
                          {SDG_LABELS[s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============== MILESTONES ============== */}
        {activeTab === 'milestones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Add milestone */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{tp('sections.addMilestone')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8 }}>
                <input
                  value={newMsTitle}
                  onChange={e => setNewMsTitle(e.target.value)}
                  placeholder={tp('milestones.titlePlaceholder')}
                  aria-label={tp('milestones.titlePlaceholder')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <input
                  type="date"
                  value={newMsDate}
                  onChange={e => setNewMsDate(e.target.value)}
                  aria-label="Milestone date"
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleAddMilestone}
                  disabled={!newMsTitle.trim() || !newMsDate || addingMs}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: newMsTitle.trim() && newMsDate ? 'var(--accent)' : 'var(--bg2)',
                    color: newMsTitle.trim() && newMsDate ? '#fff' : 'var(--txt3)',
                    border: 'none', cursor: newMsTitle.trim() && newMsDate ? 'pointer' : 'default',
                    fontFamily: 'inherit', opacity: addingMs ? 0.6 : 1,
                  }}
                >
                  <Plus size={13} /> {tp('milestones.addBtn')}
                </button>
              </div>
            </div>

            {/* Milestones list */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                {tp('tabs.milestones')} ({project.milestones.length})
              </div>
              {project.milestones.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tp('milestones.emptyHint')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {project.milestones.map((m, i) => {
                    const done = m.status === 'completed'
                    const overdue = !done && new Date(m.dueDate) < new Date()
                    return (
                      <div key={m.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 0',
                        borderBottom: i < project.milestones.length - 1 ? '1px solid var(--border)' : 'none',
                      }}>
                        <button
                          onClick={() => handleToggleMilestone(m)}
                          aria-label={done ? tp('milestones.markPending') : tp('milestones.markCompleted')}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: 0, flexShrink: 0, color: done ? 'var(--g)' : 'var(--txt3)',
                            display: 'flex', alignItems: 'center',
                          }}
                        >
                          {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 500, color: 'var(--txt)',
                            textDecoration: done ? 'line-through' : 'none',
                            opacity: done ? 0.65 : 1,
                          }}>{m.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 11, color: overdue ? 'var(--r-txt)' : 'var(--txt3)',
                              fontWeight: overdue ? 600 : 400,
                            }}>
                              <Calendar size={10} /> {formatDate(m.dueDate)}
                              {overdue && ` · ${tp('milestones.overdueLabel')}`}
                            </span>
                            {m.completedAt && (
                              <span style={{ fontSize: 11, color: 'var(--g-txt)' }}>
                                {tp('milestones.completedLabel', { date: formatDate(m.completedAt) })}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteMilestone(m.id)}
                          aria-label={tp('milestones.deleteAria')}
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: 6, borderRadius: 6, color: 'var(--txt3)',
                            display: 'flex', alignItems: 'center', flexShrink: 0,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============== IMPACT ============== */}
        {activeTab === 'impact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Add metric */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 18px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{tp('sections.recordImpact')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 2fr auto', gap: 8 }}>
                <select
                  value={newMetricType}
                  onChange={e => setNewMetricType(e.target.value)}
                  aria-label="Impact type"
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  {IMPACT_TYPES.map(it => (
                    <option key={it.key} value={it.key}>{tp(`impact.types.${it.key}`)}</option>
                  ))}
                </select>
                <input
                  type="number" min={0} step="any"
                  value={newMetricValue}
                  onChange={e => setNewMetricValue(e.target.value)}
                  placeholder={tp('impact.valuePlaceholder')}
                  aria-label={tp('impact.valuePlaceholder')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <input
                  value={newMetricNotes}
                  onChange={e => setNewMetricNotes(e.target.value)}
                  placeholder={tp('impact.notesPlaceholder')}
                  aria-label={tp('impact.notesPlaceholder')}
                  style={{
                    padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'var(--bg2)', fontSize: 13, fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleAddMetric}
                  disabled={!newMetricValue || addingMetric}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: newMetricValue ? 'var(--accent)' : 'var(--bg2)',
                    color: newMetricValue ? '#fff' : 'var(--txt3)',
                    border: 'none', cursor: newMetricValue ? 'pointer' : 'default',
                    fontFamily: 'inherit', opacity: addingMetric ? 0.6 : 1,
                  }}
                >
                  <Plus size={13} /> {tp('impact.recordBtn')}
                </button>
              </div>
            </div>

            {/* Aggregates by type */}
            {project.impactMetrics.length > 0 && (() => {
              const totals = new Map<string, { value: number; unit: string }>()
              for (const m of project.impactMetrics) {
                const cur = totals.get(m.metricType) ?? { value: 0, unit: m.unit }
                totals.set(m.metricType, { value: cur.value + m.value, unit: m.unit || cur.unit })
              }
              const entries = Array.from(totals.entries())
              return (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(entries.length, 4)}, 1fr)`, gap: 10 }}>
                  {entries.slice(0, 4).map(([type, agg]) => (
                    <div key={type} style={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 12, padding: '16px 18px',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        {getImpactLabel(type, tp)}
                      </div>
                      <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
                        {formatImpactValue(type, agg.value, agg.unit, fmt)}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Metrics list */}
            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
                {tp('sections.impactRecords')} ({project.impactMetrics.length})
              </div>
              {project.impactMetrics.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tp('impact.emptyHint')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {project.impactMetrics.map((m, i) => (
                    <div key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 0',
                      borderBottom: i < project.impactMetrics.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'color-mix(in srgb, var(--g) 12%, transparent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <TrendingUp size={14} color="var(--g)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                          {getImpactLabel(m.metricType, tp)}
                        </div>
                        {m.notes && (
                          <div style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 2, lineHeight: 1.5 }}>
                            {m.notes}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
                          {formatDate(m.date)}
                        </div>
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', flexShrink: 0 }}>
                        {formatImpactValue(m.metricType, m.value, m.unit, fmt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============== CONTACTS ============== */}
        {activeTab === 'contacts' && (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {tp('sections.linkedContacts')} ({project.contactProjects.length})
            </div>
            {project.contactProjects.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                {tp('contacts.emptyHint')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {project.contactProjects.map(cp => {
                  const initials = cp.contact.name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase()).join('') || '?'
                  return (
                    <Link key={cp.id} href={`/contacts/${cp.contact.id}`} className="card-hover" style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      border: '1px solid var(--border)', background: 'var(--bg2)',
                      textDecoration: 'none',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 18,
                        background: 'var(--accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.3 }}>
                          {cp.contact.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--txt3)', marginTop: 2 }}>
                          {cp.contact.email || '—'} · {cp.role}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                        background: 'var(--panel)', color: 'var(--txt2)',
                        border: '1px solid var(--border)',
                        textTransform: 'capitalize', flexShrink: 0,
                      }}>{cp.contact.type}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ============== DEALS ============== */}
        {activeTab === 'deals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Deal KPI strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { label: tp('stats.totalPipeline'), value: fmtMoney(deals.filter(d => d.status === 'open').reduce((s, d) => s + d.valueCents, 0)), color: 'var(--accent)' },
                { label: tp('stats.weighted'), value: fmtMoney(deals.filter(d => d.status === 'open').reduce((s, d) => s + (d.valueCents * d.probability) / 100, 0)), color: 'var(--p)' },
                { label: tp('stats.won'), value: String(deals.filter(d => d.status === 'won').length), color: 'var(--g)' },
                { label: tp('stats.open'), value: String(deals.filter(d => d.status === 'open').length), color: 'var(--b-txt)' },
              ].map(k => (
                <div key={k.label} style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                    {k.label}
                  </div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>
                    {k.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{tp('sections.linkedDeals')} ({deals.length})</span>
                <Link href="/deals" style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--accent)',
                  textDecoration: 'none',
                }}>
                  {tp('deals.openBoard')}
                </Link>
              </div>
              {dealsQuery.loading ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tCommon('loading')}
                </div>
              ) : deals.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                  {tp('deals.emptyHint')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deals.map(d => {
                    const statusColor =
                      d.status === 'won' ? { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' }
                      : d.status === 'lost' ? { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' }
                      : { bg: 'var(--b-bg)', txt: 'var(--b-txt)', border: 'var(--b-border)' }
                    return (
                      <Link
                        key={d.id}
                        href={`/deals/${d.id}`}
                        className="card-hover"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '36px 1fr auto auto auto',
                          alignItems: 'center', gap: 14,
                          padding: '12px 14px', borderRadius: 10,
                          border: '1px solid var(--border)', background: 'var(--bg2)',
                          textDecoration: 'none', color: 'inherit',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: d.stage.color + '18',
                          border: `1px solid ${d.stage.color}44`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Briefcase size={14} color={d.stage.color} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', lineHeight: 1.3, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {d.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                            {d.pipeline?.name ?? '—'} · {d.stage.name}
                            {d.contact && ` · ${d.contact.name}`}
                          </div>
                        </div>
                        <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>
                          {fmtMoney(d.valueCents)}
                        </div>
                        <div className="mono" style={{
                          fontSize: 11, fontWeight: 700, minWidth: 38, textAlign: 'right',
                          color: d.probability >= 70 ? 'var(--g-txt)' : d.probability >= 40 ? 'var(--y-txt)' : 'var(--txt3)',
                        }}>
                          {d.probability}%
                        </div>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                          background: statusColor.bg, color: statusColor.txt,
                          border: `1px solid ${statusColor.border}`,
                          textTransform: 'uppercase',
                        }}>
                          {d.status}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
