'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useIndustry } from '@/hooks/philly/useIndustry'
import { useApi } from '@/hooks/philly/useApi'
import {
  ZoomIn, ZoomOut, Calendar, X, CheckCircle2, Circle,
  Clock, Tag, TrendingUp, BarChart3, Target, Layers,
} from 'lucide-react'

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
  milestones?: Array<{ id: string; status: string; title?: string }>
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

function formatDateRange(start: string, end: string): string {
  return `${formatDate(parseDate(start))} - ${formatDate(parseDate(end))}`
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

  const [zoom, setZoom] = useState(0) // Default to Weeks view for best readability
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TimelineTask | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const dayWidth = ZOOM_LEVELS[zoom].dayWidth

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter(t => t.status === statusFilter)

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredTasks.length
    const active = filteredTasks.filter(t => t.status === 'active').length
    const completed = filteredTasks.filter(t => ['completed', 'sold'].includes(t.status)).length
    const avgProgress = total > 0 ? Math.round(filteredTasks.reduce((s, t) => s + t.progress, 0) / total) : 0
    const onTrack = total > 0 ? Math.round((filteredTasks.filter(t => t.progress >= 50 || t.status === 'completed' || t.status === 'sold').length / total) * 100) : 0
    const totalMilestones = filteredTasks.reduce((s, t) => s + t.milestones, 0)
    const doneMilestones = filteredTasks.reduce((s, t) => s + t.completedMilestones, 0)
    return { total, active, completed, avgProgress, onTrack, totalMilestones, doneMilestones }
  }, [filteredTasks])

  // Compute timeline bounds
  const { timelineStart, totalDays, months } = useMemo(() => {
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
    const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    const end = new Date(latest.getFullYear(), latest.getMonth() + 2, 0)
    const total = diffDays(start, end)

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

  const ROW_HEIGHT = 64
  const HEADER_HEIGHT = 52
  const TASK_PANEL_WIDTH = 320

  return (
    <>
      <Topbar
        title="Timeline"
        sub={isHOS ? 'Project timeline overview' : isRE ? 'Deal timeline overview' : 'Project timeline overview'}
      />

      <div style={{ padding: '18px 24px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Summary Stats Strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10,
        }}>
          {[
            { label: 'Total', value: stats.total, icon: Layers, color: 'var(--txt2)' },
            { label: 'Active', value: stats.active, icon: TrendingUp, color: 'var(--g)' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'var(--accent)' },
            { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: BarChart3, color: 'var(--b, var(--accent))' },
            { label: 'On Track', value: `${stats.onTrack}%`, icon: Target, color: stats.onTrack >= 60 ? 'var(--g)' : 'var(--o)' },
            { label: 'Milestones', value: `${stats.doneMilestones}/${stats.totalMilestones}`, icon: CheckCircle2, color: 'var(--p, var(--accent))' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <s.icon size={15} style={{ color: s.color }} />
              </div>
              <div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', lineHeight: 1.1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: 'var(--txt3)', fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
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
              padding: '0 16px', borderBottom: '1px solid var(--border)',
              fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
              color: 'var(--txt3)', letterSpacing: '0.05em',
            }}>
              {isRE ? 'Properties' : 'Projects'} ({filteredTasks.length})
            </div>

            {/* Task rows */}
            {filteredTasks.map((task, idx) => {
              const sc = statusColors[task.status] || statusColors.planned
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  onMouseEnter={() => setHoveredRow(task.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0 16px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: hoveredRow === task.id
                      ? 'var(--bg2)'
                      : idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                    transition: 'background 100ms',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: 2,
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{task.category}</span>
                      <span style={{ fontSize: 10, color: 'var(--txt3)', opacity: 0.5 }}>|</span>
                      <span style={{ fontSize: 10, color: 'var(--txt3)' }}>
                        {formatDateRange(task.startDate, task.endDate)}
                      </span>
                    </div>
                    {/* Progress mini-bar */}
                    <div style={{
                      width: '100%', height: 3, borderRadius: 2,
                      background: 'var(--border)',
                    }}>
                      <div style={{
                        width: `${task.progress}%`, height: '100%', borderRadius: 2,
                        background: sc.bar,
                        transition: 'width 300ms ease',
                      }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 5,
                      background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                      textTransform: 'capitalize',
                    }}>{task.status}</span>
                    <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)' }}>
                      {task.progress}%
                    </span>
                  </div>
                </div>
              )
            })}

            {filteredTasks.length === 0 && (
              <div style={{
                padding: '40px 16px', textAlign: 'center',
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
                  padding: '0 10px',
                  borderRight: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--txt2)' }}>
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
                  position: 'absolute', top: 0,
                  left: m.offset * dayWidth,
                  width: 1, background: 'var(--border)',
                  zIndex: 0,
                  height: filteredTasks.length * ROW_HEIGHT,
                }} />
              ))}

              {/* Today line */}
              {showToday && (
                <div style={{
                  position: 'absolute', top: -HEADER_HEIGHT,
                  left: todayOffset * dayWidth,
                  width: 2, background: 'var(--r)',
                  zIndex: 3,
                  height: HEADER_HEIGHT + filteredTasks.length * ROW_HEIGHT,
                }}>
                  <div style={{
                    position: 'absolute', top: 4, left: -16,
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    background: 'var(--r)', padding: '2px 6px',
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
                const barWidth = Math.max(duration * dayWidth, 30)

                return (
                  <div
                    key={task.id}
                    onMouseEnter={() => setHoveredRow(task.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      height: ROW_HEIGHT,
                      position: 'relative',
                      borderBottom: '1px solid var(--border)',
                      background: hoveredRow === task.id
                        ? 'var(--bg2)'
                        : idx % 2 === 1 ? 'color-mix(in srgb, var(--bg2) 30%, transparent)' : 'transparent',
                      transition: 'background 100ms',
                    }}
                  >
                    {/* Bar */}
                    <div
                      onClick={() => setSelectedTask(task)}
                      title={`${task.title}\n${formatDate(taskStart)} - ${formatDate(taskEnd)}\nProgress: ${task.progress}%\nMilestones: ${task.completedMilestones}/${task.milestones}`}
                      style={{
                        position: 'absolute',
                        top: 12, height: ROW_HEIGHT - 24,
                        left: barLeft, width: barWidth,
                        borderRadius: 8,
                        background: sc.bg,
                        border: `1.5px solid ${sc.border}`,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center',
                        transition: 'box-shadow 150ms, transform 100ms',
                        zIndex: 1,
                        boxShadow: hoveredRow === task.id ? 'var(--shadow-md)' : 'none',
                      }}
                    >
                      {/* Progress fill */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, bottom: 0,
                        width: `${task.progress}%`,
                        background: sc.bar,
                        opacity: 0.35,
                        borderRadius: '7px 0 0 7px',
                      }} />

                      {/* Bar content */}
                      <div style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '0 10px', width: '100%',
                        overflow: 'hidden',
                      }}>
                        {barWidth > 120 && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: sc.txt,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {task.title}
                          </span>
                        )}
                        <span className="mono" style={{
                          fontSize: 10, fontWeight: 700,
                          marginLeft: 'auto', flexShrink: 0,
                          background: sc.bar,
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: 4,
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
                        <div
                          key={mi}
                          title={`Milestone ${mi + 1}/${task.milestones} — ${isDone ? 'Completed' : 'Pending'}`}
                          style={{
                            position: 'absolute',
                            top: ROW_HEIGHT / 2 - 5,
                            left: msOffset * dayWidth - 5,
                            width: 10, height: 10,
                            borderRadius: '50%',
                            background: isDone ? sc.bar : 'var(--bg2)',
                            border: `2px solid ${isDone ? sc.bar : 'var(--txt3)'}`,
                            zIndex: 2,
                            cursor: 'pointer',
                            transition: 'transform 100ms',
                          }}
                        />
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
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 4px', flexWrap: 'wrap',
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
                width: l.label === 'Today' ? 2 : 14, height: l.label === 'Today' ? 14 : 8,
                borderRadius: l.label === 'Today' ? 1 : 4,
                background: l.color,
              }} />
              <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{l.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--g)', border: '2px solid var(--g)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Milestone (done)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--bg2)', border: '2px solid var(--txt3)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Milestone (pending)</span>
          </div>
        </div>
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </>
  )
}

/* ── Task Detail Drawer ───────────────────────────────── */

function TaskDetailDrawer({ task, onClose }: { task: TimelineTask; onClose: () => void }) {
  const sc = statusColors[task.status] || statusColors.planned
  const taskStart = parseDate(task.startDate)
  const taskEnd = parseDate(task.endDate)
  const totalDuration = diffDays(taskStart, taskEnd)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.3)',
          animation: 'fadeIn 200ms ease both',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 400, maxWidth: '90vw', zIndex: 50,
        background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg, -8px 0 24px rgba(0,0,0,0.15))',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
              {task.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5,
                background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                textTransform: 'capitalize',
              }}>{task.status}</span>
              <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{task.category}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--txt3)', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Progress Section */}
          <DrawerSection icon={BarChart3} label="Progress">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                flex: 1, height: 8, borderRadius: 4,
                background: 'var(--border)',
              }}>
                <div style={{
                  width: `${task.progress}%`, height: '100%', borderRadius: 4,
                  background: sc.bar,
                  transition: 'width 400ms ease',
                }} />
              </div>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: sc.txt }}>
                {task.progress}%
              </span>
            </div>
          </DrawerSection>

          {/* Timeline Section */}
          <DrawerSection icon={Clock} label="Timeline">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DetailField label="Start Date" value={formatDate(taskStart)} />
              <DetailField label="End Date" value={formatDate(taskEnd)} />
              <DetailField label="Duration" value={`${totalDuration} days`} />
              <DetailField label="Days Left" value={
                diffDays(new Date(), taskEnd) > 0
                  ? `${diffDays(new Date(), taskEnd)} days`
                  : task.status === 'completed' || task.status === 'sold' ? 'Done' : 'Overdue'
              } />
            </div>
          </DrawerSection>

          {/* Milestones Section */}
          <DrawerSection icon={Target} label={`Milestones (${task.completedMilestones}/${task.milestones})`}>
            {task.milestones === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                No milestones defined
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Array.from({ length: task.milestones }, (_, i) => {
                  const isDone = i < task.completedMilestones
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 6,
                      background: isDone ? 'color-mix(in srgb, var(--g) 8%, transparent)' : 'var(--bg2)',
                      border: `1px solid ${isDone ? 'var(--g-border)' : 'var(--border)'}`,
                    }}>
                      {isDone
                        ? <CheckCircle2 size={14} style={{ color: 'var(--g)', flexShrink: 0 }} />
                        : <Circle size={14} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
                      }
                      <span style={{
                        fontSize: 12, fontWeight: isDone ? 500 : 400,
                        color: isDone ? 'var(--txt2)' : 'var(--txt3)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        opacity: isDone ? 0.7 : 1,
                      }}>
                        Milestone {i + 1}
                      </span>
                      {isDone && (
                        <span style={{
                          marginLeft: 'auto', fontSize: 9, fontWeight: 600,
                          color: 'var(--g-txt)', background: 'var(--g-bg)',
                          padding: '1px 5px', borderRadius: 4,
                        }}>Done</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </DrawerSection>

          {/* Category Section */}
          <DrawerSection icon={Tag} label="Details">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <DetailField label="Category" value={task.category} />
              <DetailField label="ID" value={task.id} />
            </div>
          </DrawerSection>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

function DrawerSection({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--txt3)', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon size={12} />
        {label}
      </div>
      {children}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 6,
      background: 'var(--bg2)', border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 9.5, color: 'var(--txt3)', fontWeight: 500, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--txt)' }}>{value}</div>
    </div>
  )
}
