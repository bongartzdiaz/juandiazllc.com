'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Pagination } from '@/components/philly/ui/Pagination'
import { KpiCard } from '@/components/philly/ui/KpiCard'
import { Filter } from 'lucide-react'

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
  const [scores, setScores] = useState<LeadScore[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [gradeFilter, setGradeFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const t = useTranslations('leadScores')

  const fetchScores = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (gradeFilter) params.set('grade', gradeFilter)
      const res = await fetch(`/api/lead-scores?${params}`)
      const json = await res.json()
      setScores(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
      setTotalPages(json.pagination?.totalPages ?? 0)
    } catch { setScores([]) }
    finally { setLoading(false) }
  }, [page, gradeFilter])

  useEffect(() => { fetchScores() }, [fetchScores])

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
          <KpiCard icon="target" label="Total Leads Scored" value={String(totalScored)} />
          <KpiCard icon="trending-up" label="Avg Score" value={String(avgScore)} />
          <KpiCard icon="award" label="Grade A Count" value={String(gradeACount)} />
          <KpiCard icon="bar-chart" label="Grade B Count" value={String(gradeBCount)} />
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', fontSize: 12 }}>
            <Filter size={13} style={{ color: 'var(--txt3)' }} />
            <select value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setPage(1) }} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
              <option value="">All Grades</option>
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="C">Grade C</option>
              <option value="D">Grade D</option>
              <option value="F">Grade F</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 70px 160px 100px 100px 120px 80px', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            <span>Contact</span>
            <span>Score</span>
            <span>Grade</span>
            <span>Progress</span>
            <span>Behavior</span>
            <span>Demo Score</span>
            <span>Last Activity</span>
            <span>Actions</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Loading...</div>
          ) : scores.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No lead scores found.</div>
          ) : scores.map((record, idx) => (
            <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 70px 160px 100px 100px 120px 80px', gap: 12, padding: '10px 16px', borderBottom: idx < scores.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, alignItems: 'center', background: idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--txt)' }}>{record.contact?.name ?? `Contact ${record.contactId.slice(0, 8)}`}</div>
                <div style={{ fontSize: 10, color: 'var(--txt3)' }}>{record.contact?.email ?? new Date(record.createdAt).toLocaleDateString()}</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, fontFamily: "var(--font-red-hat-mono), monospace", color: 'var(--txt)' }}>{record.score}</span>
              <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: GRADE_COLORS[record.grade]?.bg ?? 'var(--bg2)', color: GRADE_COLORS[record.grade]?.txt ?? 'var(--txt2)', display: 'inline-block', maxWidth: 'fit-content', textAlign: 'center' }}>{record.grade}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${record.score}%`, borderRadius: 3, background: gradeBarColor(record.grade), transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-red-hat-mono), monospace", minWidth: 30, textAlign: 'right', color: 'var(--txt2)' }}>{record.score}%</span>
              </div>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 500 }}>{record.behaviorScore}</span>
              <span style={{ fontFamily: "var(--font-red-hat-mono), monospace", fontWeight: 500 }}>{record.demographicScore}</span>
              <span style={{ fontSize: 11, color: 'var(--txt2)' }}>{record.lastActivity ? new Date(record.lastActivity).toLocaleDateString() : '-'}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => window.open(`/contacts/${record.contactId}`, '_self')}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'var(--panel)', fontSize: 10, fontWeight: 600,
                    color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >View</button>
              </div>
            </div>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
    </>
  )
}
