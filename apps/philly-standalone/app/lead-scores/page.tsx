'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { useApi } from '@/hooks/philly/useApi'
import { useRouter } from 'next/navigation'
import { Filter } from 'lucide-react'
import { useColumnPrefs } from '@/hooks/philly/useColumnPrefs'
import { ColumnPicker, type ColumnDef } from '@/components/philly/ui/ColumnPicker'
import { ListLoading, ListEmpty, ListError } from '@/components/philly/ui/ListStates'

const LS_COLUMNS: ColumnDef[] = [
  { id: 'contact', label: 'Contact', required: true },
  { id: 'score', label: 'Score' },
  { id: 'grade', label: 'Grade' },
  { id: 'progress', label: 'Progress' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'demo', label: 'Demo Score' },
  { id: 'lastActivity', label: 'Last Activity' },
  { id: 'actions', label: 'Actions', required: true },
]
const LS_DEFAULTS = ['contact', 'score', 'grade', 'progress', 'behavior', 'demo', 'lastActivity', 'actions']
const LS_WIDTHS: Record<string, string> = {
  contact: '1fr', score: '100px', grade: '70px', progress: '160px',
  behavior: '100px', demo: '100px', lastActivity: '120px', actions: '80px',
}

interface LeadScore {
  id: string
  contactId: string
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  behaviorScore: number
  demographicScore: number
  lastActivity: string | null
  scoreHistory: unknown
  createdAt: string
  contact?: { id: string; name: string; email?: string } | null
}

const GRADE_COLORS: Record<string, { bg: string; txt: string }> = {
  A: { bg: 'var(--g-bg)', txt: 'var(--g-txt)' },
  B: { bg: 'var(--b-bg)', txt: 'var(--b-txt)' },
  C: { bg: 'var(--y-bg)', txt: 'var(--y-txt)' },
  D: { bg: 'var(--o-bg)', txt: 'var(--o-txt)' },
  F: { bg: 'var(--r-bg)', txt: 'var(--r-txt)' },
}

function gradeBarColor(grade: string): string {
  switch (grade) {
    case 'A': return 'var(--g)'
    case 'B': return 'var(--b)'
    case 'C': return 'var(--y)'
    case 'D': return 'var(--o)'
    case 'F': return 'var(--r)'
    default: return 'var(--accent)'
  }
}

export default function LeadScoresPage() {
  const [page, setPage] = useState(1)
  const [gradeFilter, setGradeFilter] = useState('')
  const t = useTranslations('leadScores')
  const router = useRouter()

  const params = new URLSearchParams({ page: String(page), limit: '25' })
  if (gradeFilter) params.set('grade', gradeFilter)
  interface ScoresResponse { data: LeadScore[]; pagination: { total: number; totalPages: number } }
  const scoresQuery = useApi<ScoresResponse>(`/lead-scores?${params}`)
  const scores = scoresQuery.data?.data ?? []
  const total = scoresQuery.data?.pagination.total ?? 0
  const totalPages = scoresQuery.data?.pagination.totalPages ?? 0
  const loading = scoresQuery.loading

  // Bundle AJ — column visibility prefs.
  const lsColumns = useColumnPrefs('pai-lead-scores-columns-v1', LS_DEFAULTS)
  const localizedColumns = useMemo<ColumnDef[]>(() => [
    { id: 'contact', label: t('columns.contact'), required: true },
    { id: 'score', label: t('columns.score') },
    { id: 'grade', label: t('columns.grade') },
    { id: 'progress', label: t('columns.progress') },
    { id: 'behavior', label: t('columns.behavior') },
    { id: 'demo', label: t('columns.demo') },
    { id: 'lastActivity', label: t('columns.lastActivity') },
    { id: 'actions', label: t('columns.actions'), required: true },
  ], [t])
  const visibleLsColumns = useMemo(
    () => localizedColumns.filter((c) => c.required || lsColumns.visible.has(c.id)),
    [lsColumns.visible, localizedColumns],
  )
  const lsGridTemplate = useMemo(
    () => visibleLsColumns.map((c) => LS_WIDTHS[c.id]).join(' '),
    [visibleLsColumns],
  )

  const totalScored = total
  const avgScore = scores.length ? Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length) : 0
  const gradeACount = scores.filter(r => r.grade === 'A').length
  const gradeBCount = scores.filter(r => r.grade === 'B').length

  return (
    <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard icon="target" label={t('kpis.total')} value={String(totalScored)} />
          <KpiCard icon="trending-up" label={t('kpis.avg')} value={String(avgScore)} />
          <KpiCard icon="award" label={t('kpis.gradeA')} value={String(gradeACount)} />
          <KpiCard icon="bar-chart" label={t('kpis.gradeB')} value={String(gradeBCount)} />
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select aria-label={t('filters.all')} value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">{t('filters.all')}</option>
              <option value="A">{t('filters.gradeA')}</option>
              <option value="B">{t('filters.gradeB')}</option>
              <option value="C">{t('filters.gradeC')}</option>
              <option value="D">{t('filters.gradeD')}</option>
              <option value="F">{t('filters.gradeF')}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <ColumnPicker
            columns={localizedColumns}
            visible={lsColumns.visible}
            onToggle={lsColumns.toggle}
            onReset={lsColumns.reset}
            isOverridden={lsColumns.isOverridden}
          />
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: lsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {visibleLsColumns.map((c) => <span key={c.id}>{c.label}</span>)}
          </div>
          {scoresQuery.error ? (
            <ListError onRetry={scoresQuery.refetch} message={scoresQuery.error} />
          ) : loading ? (
            <ListLoading />
          ) : scores.length === 0 ? (
            <ListEmpty />
          ) : scores.map((record, idx) => (
            <div key={record.id} style={{ display: 'grid', gridTemplateColumns: lsGridTemplate, gap: 12, padding: '10px 16px', borderBottom: idx < scores.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              {visibleLsColumns.map((c) => {
                if (c.id === 'contact') return (
                  <div key="contact">
                    <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{record.contact?.name ?? t('list.contactFallback', { id: record.contactId.slice(0, 8) })}</div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{record.contact?.email ?? new Date(record.createdAt).toLocaleDateString()}</div>
                  </div>
                )
                if (c.id === 'score') return <span key="score" style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-red-hat-mono), monospace', color: 'var(--txt)' }}>{record.score}</span>
                if (c.id === 'grade') return <span key="grade" style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: GRADE_COLORS[record.grade]?.bg ?? 'var(--bg2)', color: GRADE_COLORS[record.grade]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content', textAlign: 'center' }}>{record.grade}</span>
                if (c.id === 'progress') return (
                  <div key="progress" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${record.score}%`, borderRadius: 3, background: gradeBarColor(record.grade), transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-red-hat-mono), monospace', minWidth: 30, textAlign: 'right', color: 'var(--txt2)' }}>{record.score}%</span>
                  </div>
                )
                if (c.id === 'behavior') return <span key="behavior" style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontWeight: 500 }}>{record.behaviorScore}</span>
                if (c.id === 'demo') return <span key="demo" style={{ fontFamily: 'var(--font-red-hat-mono), monospace', fontWeight: 500 }}>{record.demographicScore}</span>
                if (c.id === 'lastActivity') return <span key="lastActivity" style={{ fontSize: 11, color: 'var(--txt2)' }}>{record.lastActivity ? new Date(record.lastActivity).toLocaleDateString() : '-'}</span>
                if (c.id === 'actions') return (
                  <div key="actions" style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => router.push(`/contacts/${record.contactId}`)}
                      style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 10, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}
                    >{t('list.view')}</button>
                  </div>
                )
                return <span key={c.id} />
              })}
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
