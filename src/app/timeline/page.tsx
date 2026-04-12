'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useIndustry } from '@/hooks/useIndustry'
import { useApi } from '@/hooks/useApi'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */

interface TimelineTask {
  id: string
  title: string
  status: string
  category: string
  startDate: string
  endDate: string
  progress: number // 0–100
  milestones: number
  completedMilestones: number
}

interface ApiProject {
  id: string
  title: string
  status: string
  category: string
  startDate: string
  endDate?: string
  milestones?: Array<{ id: string; status: string }>
  _count?: { milestones: number }
}

function mapApiProject(p: ApiProject): TimelineTask {
  const totalMs = p._count?.milestones ?? p.milestones?.length ?? 0
  const doneMs = p.milestones?.filter(m => m.status === 'completed').length ?? 0
  const progress = totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    category: p.category,
    startDate: p.startDate,
    endDate: p.endDate || addMonths(p.startDate, 3),
    progress,
    milestones: totalMs,
    completedMilestones: doneMs,
  }
}

/* ── Demo Data ─────────────────────────────────────────── */

const CSR_TASKS: TimelineTask[] = [
  { id: '1', title: 'Urban Reforestation Amsterdam', status: 'active', category: 'Environment', startDate: '2025-09-01', endDate: '2026-06-30', progress: 75, milestones: 8, completedMilestones: 6 },
  { id: '2', title: 'Clean Water Access Kenya', status: 'active', category: 'Water & Sanitation', startDate: '2025-11-15', endDate: '2026-09-30', progress: 42, milestones: 12, completedMilestones: 5 },
  { id: '3', title: 'Tech Education for Youth', status: 'active', category: 'Education', startDate: '2025-06-01', endDate: '2026-03-15', progress: 90, milestones: 10, completedMilestones: 9 },
  { id: '4', title: 'Renewable Energy Transition', status: 'planned', category: 'Energy', startDate: '2026-04-01', endDate: '2027-03-31', progress: 13, milestones: 15, completedMilestones: 2 },
  { id: '5', title: 'Food Bank Partnership', status: 'completed', category: 'Hunger', startDate: '2025-03-01', endDate: '2025-12-31', progress: 100, milestones: 6, completedMilestones: 6 },
  { id: '6', title: 'Ocean Plastic Cleanup', status: 'active', category: 'Environment', startDate: '2026-01-15', endDate: '2026-12-15', progress: 30, milestones: 10, completedMilestones: 3 },
]

const RE_TASKS: TimelineTask[] = [
  { id: '1', title: 'Penthouse Suite — Zuidas', status: 'active', category: 'Residential', startDate: '2026-01-15', endDate: '2026-06-30', progress: 50, milestones: 4, completedMilestones: 2 },
  { id: '2', title: 'Family Home — Amstelveen', status: 'active', category: 'Residential', startDate: '2025-11-01', endDate: '2026-04-30', progress: 67, milestones: 6, completedMilestones: 4 },
  { id: '3', title: 'Studio — De Pijp', status: 'pending', category: 'Rental', startDate: '2026-03-01', endDate: '2026-07-31', progress: 33, milestones: 3, completedMilestones: 1 },
  { id: '4', title: 'Commercial Office — Centrum', status: 'active', category: 'Commercial', startDate: '2025-09-01', endDate: '2026-08-31', progress: 38, milestones: 8, completedMilestones: 3 },
  { id: '5', title: 'Townhouse — Jordaan', status: 'sold', category: 'Residential', startDate: '2025-06-01', endDate: '2025-12-15', progress: 100, milestones: 5, completedMilestones: 5 },
  { id: '6', title: 'Warehouse Loft — NDSM', status: 'active', category: 'Mixed-Use', startDate: '2026-02-01', endDate: '2026-09-15', progress: 25, milestones: 4, completedMilestones: 1 },
]

const HOS_TASKS: TimelineTask[] = [
  { id: '1', title: 'Lobby Renovation', status: 'active', category: 'Renovation', startDate: '2026-01-10', endDate: '2026-05-30', progress: 60, milestones: 6, completedMilestones: 4 },
  { id: '2', title: 'Restaurant Rebranding', status: 'active', category: 'F&B', startDate: '2026-02-01', endDate: '2026-06-15', progress: 40, milestones: 5, completedMilestones: 2 },
  { id: '3', title: 'Pool & Spa Expansion', status: 'planned', category: 'Expansion', startDate: '2026-05-01', endDate: '2026-11-30', progress: 10, milestones: 8, completedMilestones: 1 },
  { id: '4', title: 'PMS System Migration', status: 'active', category: 'Operations', startDate: '2025-11-15', endDate: '2026-03-31', progress: 80, milestones: 4, completedMilestones: 3 },
  { id: '5', title: 'Wedding Venue Setup', status: 'completed', category: 'Event Space', startDate: '2025-08-01', endDate: '2025-12-20', progress: 100, milestones: 5, completedMilestones: 5 },
  { id: '6', title: 'Staff Training Program', status: 'active', category: 'Staffing', startDate: '2026-01-05', endDate: '2026-07-30', progress: 35, milestones: 7, completedMilestones: 2 },
]

/* ── Helpers ───────────────────────────────────────────── */

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const statusColors: Record<string, { bg: string; bar: string; txt: string; border: string }> = {
  active:      { bg: 'var(--g-bg)', bar: 'var(--g)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  completed:   { bg: 'var(--accent-bg)', bar: 'var(--accent)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  planned:     { bg: 'var(--y-bg)', bar: 'var(--y)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  paused:      { bg: 'var(--o-bg)', bar: 'var(--o)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  pending:     { bg: 'var(--y-bg)', bar: 'var(--y)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  sold:        { bg: 'var(--g-bg)', bar: 'var(--g)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  maintenance: { bg: 'var(--o-bg)', bar: 'var(--o)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
}

const ZOOM_LEVELS = [
  { label: 'Weeks', dayWidth: 6 },
  { label: 'Months', dayWidth: 3 },
  { label: 'Quarters', dayWidth: 1.2 },
] as const

/* ── Component ─────────────────────────────────────────── */

export default function TimelinePage() {
  const { industry } = useIndustry()
  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'

  const apiQuery = useApi<{ data: ApiProject[] }>('/projects', {
    enabled: !isRE && !isHOS,
  })
  const liveTasks = useMemo<TimelineTask[]>(() => {
    if (isRE || isHOS) return []
    const rows = apiQuery.data?.data ?? []
    return rows.map(mapApiProject)
  }, [apiQuery.data, isRE, isHOS])

  const tasks: TimelineTask[] = isHOS
    ? HOS_TASKS
    : isRE
    ? RE_TASKS
    : liveTasks.length > 0
    ? liveTasks
    : CSR_TASKS

  const [zoom, setZoom] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayWidth = ZOOM_LEVELS[zoom].dayWidth

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter)

  // Compute timeline bounds — earliest start to latest end + padding
  const { timelineStart, timelineEnd, totalDays, months } = useMemo(() => {
    if (filteredTasks.length === 0) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 0)
      return { timelineStart: start, timelineEnd: end, totalDays: diffDays(start, end), months: [] as { date: Date; offset: number; width: number }[] }
    }
    const starts = filteredTasks.map(t => parseDate(t.startDate))
    const ends = filteredTasks.map(t => parseDate(t.endDate))
    const earliest = new Date(Math.min(...starts.map(d => d.getTime())))
    const latest = new Date(Math.max(...ends.map(d => d.getTime())))
    // Pad 2 weeks on each side
    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    const end = new Date(latest.getFullYear(), latest.getMonth() + 2, 0)
    const total = diffDays(start, end)

    // Build month columns
    const monthList: { date: Date; offset: number; width: number }[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const monthStart = new Date(cursor)
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const clampedEnd = monthEnd > end ? end : monthEnd
      const offset = diffDays(start, monthStart)
      const width = diffDays(monthStart, clampedEnd) + 1
      monthList.push({ date: new Date(monthStart), offset, width })
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(1)
    }

    return { timelineStart: start, timelineEnd: end, totalDays: total, months: monthList }
  }, [filteredTasks])

  const totalWidth = totalDays * dayWidth

  // Today marker
  const today = new Date()
  const todayOffset = diffDays(timelineStart, today)
  const showToday = todayOffset >= 0 && todayOffset <= totalDays

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && showToday) {
      const scrollTo = todayOffset * dayWidth - scrollRef.current.clientWidth / 3
      scrollRef.current.scrollLeft = Math.max(0, scrollTo)
    }
  }, [showToday, todayOffset, dayWidth])

  const statusOptions = isHOS
    ? ['all', 'active', 'planned', 'completed', 'maintenance']
    : isRE
    ? ['all', 'active', 'pending', 'sold']
    : ['all', 'active', 'planned', 'completed', 'paused']

  const ROW_HEIGHT = 48
  const HEADER_HEIGHT = 52
  const TASK_PANEL_WIDTH = 280

  return (
    <>
      <Topbar
        title="Timeline"
        sub={isHOS ? 'Project timeline overview' : isRE ? 'Deal timeline overview' : 'Project timeline overview'}
      />

      <div style={{ padding: '18px 24px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          {/* Status filters */}
          {statusOptions.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: statusFilter === s ? 'var(--txt)' : 'var(--bg2)',
              color: statusFilter === s ? 'var(--panel)' : 'var(--txt2)',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              fontFamily: 'inherit',
            }}>{s}</button>
          ))}

          <div style={{ flex: 1 }} />

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setZoom(z => Math.min(z + 1, ZOOM_LEVELS.length - 1))}
              disabled={zoom >= ZOOM_LEVELS.length - 1}
              style={{
                width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                cursor: zoom >= ZOOM_LEVELS.length - 1 ? 'default' : 'pointer',
                opacity: zoom >= ZOOM_LEVELS.length - 1 ? 0.4 : 1,
                color: 'var(--txt2)',
              }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt3)', minWidth: 60, textAlign: 'center' }}>
              {ZOOM_LEVELS[zoom].label}
            </span>
            <button
              onClick={() => setZoom(z => Math.max(z - 1, 0))}
              disabled={zoom <= 0}
              style={{
                width: 28, height: 28, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                cursor: zoom <= 0 ? 'default' : 'pointer',
                opacity: zoom <= 0 ? 0.4 : 1,
                color: 'var(--txt2)',
              }}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Today button */}
          <button
            onClick={() => {
              if (scrollRef.current && showToday) {
                const scrollTo = todayOffset * dayWidth - scrollRef.current.clientWidth / 3
                scrollRef.current.scrollTo({ left: Math.max(0, scrollTo), behavior: 'smooth' })
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7,
              fontSize: 11.5, fontWeight: 600,
              background: 'var(--accent-bg)', color: 'var(--accent-txt)',
              border: '1px solid var(--accent-border)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Calendar size={12} />
            Today
          </button>
        </div>

        {/* Gantt Chart */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          display: 'flex',
        }}>
          {/* Left: Task list panel */}
          <div style={{
            width: TASK_PANEL_WIDTH, flexShrink: 0,
            borderRight: '1px solid var(--border)',
          }}>
            {/* Header */}
            <div style={{
              height: HEADER_HEIGHT, display: 'flex', alignItems: 'center',
              padding: '0 14px', borderBottom: '1px solid var(--border)',
              fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
              color: 'var(--txt3)', letterSpacing: '0.05em',
            }}>
              {isRE ? 'Properties' : isHOS ? 'Projects' : 'Projects'} ({filteredTasks.length})
            </div>

            {/* Task rows */}
            {filteredTasks.map(task => {
              const sc = statusColors[task.status] || statusColors.planned
              return (
                <div key={task.id} className="card-hover" style={{
                  height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0 14px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{task.category}</div>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                    background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                    textTransform: 'capitalize', flexShrink: 0,
                  }}>{task.status}</span>
                </div>
              )
            })}

            {filteredTasks.length === 0 && (
              <div style={{
                padding: '32px 14px', textAlign: 'center',
                color: 'var(--txt3)', fontSize: 12,
              }}>
                No tasks match the filter
              </div>
            )}
          </div>

          {/* Right: Timeline panel */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowX: 'auto', overflowY: 'hidden',
              position: 'relative',
            }}
          >
            {/* Month headers */}
            <div style={{
              height: HEADER_HEIGHT, display: 'flex',
              borderBottom: '1px solid var(--border)',
              position: 'sticky', top: 0, zIndex: 2,
              background: 'var(--panel)',
              width: totalWidth,
            }}>
              {months.map((m, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: m.offset * dayWidth,
                  width: m.width * dayWidth,
                  height: '100%',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  padding: '0 8px',
                  borderRight: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)' }}>
                    {formatMonth(m.date)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)' }}>
                    {m.width} days
                  </div>
                </div>
              ))}
            </div>

            {/* Task bars */}
            <div style={{ position: 'relative', width: totalWidth }}>
              {/* Grid lines for months */}
              {months.map((m, i) => (
                <div key={`grid-${i}`} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: m.offset * dayWidth,
                  width: 1, background: 'var(--border)',
                  zIndex: 0,
                  height: filteredTasks.length * ROW_HEIGHT,
                }} />
              ))}

              {/* Today line */}
              {showToday && (
                <div style={{
                  position: 'absolute', top: -HEADER_HEIGHT, bottom: 0,
                  left: todayOffset * dayWidth,
                  width: 2, background: 'var(--r)',
                  zIndex: 3,
                  height: HEADER_HEIGHT + filteredTasks.length * ROW_HEIGHT,
                }}>
                  <div style={{
                    position: 'absolute', top: 4, left: -16,
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: 'var(--r)', padding: '1px 5px',
                    borderRadius: 4, whiteSpace: 'nowrap',
                  }}>
                    Today
                  </div>
                </div>
              )}

              {/* Task bar rows */}
              {filteredTasks.map((task, idx) => {
                const sc = statusColors[task.status] || statusColors.planned
                const taskStart = parseDate(task.startDate)
                const taskEnd = parseDate(task.endDate)
                const startOffset = diffDays(timelineStart, taskStart)
                const duration = diffDays(taskStart, taskEnd)
                const barLeft = startOffset * dayWidth
                const barWidth = Math.max(duration * dayWidth, 20)

                return (
                  <div key={task.id} style={{
                    height: ROW_HEIGHT,
                    position: 'relative',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {/* Bar */}
                    <div
                      title={`${task.title}\n${formatDate(taskStart)} - ${formatDate(taskEnd)}\nProgress: ${task.progress}%\nMilestones: ${task.completedMilestones}/${task.milestones}`}
                      style={{
                        position: 'absolute',
                        top: 10, height: ROW_HEIGHT - 20,
                        left: barLeft, width: barWidth,
                        borderRadius: 6,
                        background: sc.bg,
                        border: `1px solid ${sc.border}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        transition: 'box-shadow 150ms',
                        zIndex: 1,
                      }}
                      className="card-hover"
                    >
                      {/* Progress fill */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${task.progress}%`,
                        background: sc.bar,
                        opacity: 0.25,
                        borderRadius: '5px 0 0 5px',
                      }} />

                      {/* Bar content */}
                      <div style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '0 8px', width: '100%',
                        overflow: 'hidden',
                      }}>
                        {barWidth > 80 && (
                          <span style={{
                            fontSize: 10.5, fontWeight: 600, color: sc.txt,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </span>
                        )}
                        <span className="mono" style={{
                          fontSize: 9.5, fontWeight: 700, color: sc.txt,
                          marginLeft: 'auto', flexShrink: 0, opacity: 0.8,
                        }}>
                          {task.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Milestone dots */}
                    {task.milestones > 0 && Array.from({ length: Math.min(task.milestones, 8) }, (_, mi) => {
                      const msOffset = startOffset + Math.round((duration / (task.milestones + 1)) * (mi + 1))
                      const isDone = mi < task.completedMilestones
                      return (
                        <div key={mi} style={{
                          position: 'absolute',
                          top: ROW_HEIGHT / 2 - 4,
                          left: msOffset * dayWidth - 4,
                          width: 8, height: 8,
                          borderRadius: '50%',
                          background: isDone ? sc.bar : 'var(--bg2)',
                          border: `2px solid ${isDone ? sc.bar : 'var(--border)'}`,
                          zIndex: 2,
                        }} />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 4px',
        }}>
          <span style={{ fontSize: 10.5, color: 'var(--txt3)', fontWeight: 600 }}>Legend:</span>
          {[
            { label: 'Active', color: 'var(--g)' },
            { label: 'Planned', color: 'var(--y)' },
            { label: 'Completed', color: 'var(--accent)' },
            { label: 'Today', color: 'var(--r)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: l.label === 'Today' ? 2 : 12, height: l.label === 'Today' ? 12 : 6,
                borderRadius: l.label === 'Today' ? 1 : 3,
                background: l.color,
              }} />
              <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--g)', border: '2px solid var(--g)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Milestone (done)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--bg2)', border: '2px solid var(--border)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Milestone (pending)</span>
          </div>
        </div>
      </div>
    </>
  )
}
