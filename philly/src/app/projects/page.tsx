'use client'

import { useMemo, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { Search, Grid3X3, List, ArrowUpDown } from 'lucide-react'
import { useIndustry } from '@/hooks/useIndustry'
import { useApi } from '@/hooks/useApi'

/* Shape returned by GET /api/projects */
interface ApiProject {
  id: string
  title: string
  status: string
  category: string
  startDate: string
  budgetCents: number
  spentCents: number
  sdgGoals: number[] | string
  milestones?: Array<{ id: string; status: string }>
  _count?: { milestones: number; contactProjects: number }
}

interface UiProject {
  id: string
  title: string
  status: string
  category: string
  budget: number
  spent: number
  startDate: string
  sdgs: number[]
  milestones: number
  completedMilestones: number
  contacts: number
}

function mapApiProject(p: ApiProject): UiProject {
  const sdgs: number[] = Array.isArray(p.sdgGoals)
    ? p.sdgGoals
    : typeof p.sdgGoals === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(p.sdgGoals)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return []
        }
      })()
    : []

  const totalMs = p._count?.milestones ?? p.milestones?.length ?? 0
  const doneMs = p.milestones?.filter((m) => m.status === 'completed').length ?? 0

  return {
    id: p.id,
    title: p.title,
    status: p.status,
    category: p.category,
    budget: Math.round((p.budgetCents ?? 0) / 100),
    spent: Math.round((p.spentCents ?? 0) / 100),
    startDate: p.startDate,
    sdgs,
    milestones: totalMs,
    completedMilestones: doneMs,
    contacts: p._count?.contactProjects ?? 0,
  }
}

const DEMO_PROJECTS = [
  { id: '1', title: 'Urban Reforestation Amsterdam', status: 'active', category: 'Environment', budget: 120000, spent: 86400, startDate: '2025-09-01', sdgs: [11, 13, 15], milestones: 8, completedMilestones: 6, contacts: 5 },
  { id: '2', title: 'Clean Water Access Kenya', status: 'active', category: 'Water & Sanitation', budget: 250000, spent: 112500, startDate: '2025-11-15', sdgs: [6, 3], milestones: 12, completedMilestones: 5, contacts: 8 },
  { id: '3', title: 'Tech Education for Youth', status: 'active', category: 'Education', budget: 80000, spent: 70400, startDate: '2025-06-01', sdgs: [4, 8, 10], milestones: 10, completedMilestones: 9, contacts: 12 },
  { id: '4', title: 'Renewable Energy Transition', status: 'planned', category: 'Energy', budget: 500000, spent: 75000, startDate: '2026-04-01', sdgs: [7, 13], milestones: 15, completedMilestones: 2, contacts: 3 },
  { id: '5', title: 'Food Bank Partnership', status: 'completed', category: 'Hunger', budget: 45000, spent: 43200, startDate: '2025-03-01', sdgs: [1, 2], milestones: 6, completedMilestones: 6, contacts: 4 },
  { id: '6', title: 'Ocean Plastic Cleanup', status: 'active', category: 'Environment', budget: 180000, spent: 54000, startDate: '2026-01-15', sdgs: [14, 13], milestones: 10, completedMilestones: 3, contacts: 6 },
]

const RE_PROJECTS = [
  { id: '1', title: 'Penthouse Suite — Zuidas', status: 'active', category: 'Residential', budget: 1250000, spent: 0, startDate: '2026-01-15', sdgs: [] as number[], milestones: 4, completedMilestones: 2, contacts: 3 },
  { id: '2', title: 'Family Home — Amstelveen', status: 'active', category: 'Residential', budget: 685000, spent: 0, startDate: '2025-11-01', sdgs: [] as number[], milestones: 6, completedMilestones: 4, contacts: 5 },
  { id: '3', title: 'Studio — De Pijp', status: 'pending', category: 'Rental', budget: 22200, spent: 0, startDate: '2026-03-01', sdgs: [] as number[], milestones: 3, completedMilestones: 1, contacts: 2 },
  { id: '4', title: 'Commercial Office — Centrum', status: 'active', category: 'Commercial', budget: 4500000, spent: 0, startDate: '2025-09-01', sdgs: [] as number[], milestones: 8, completedMilestones: 3, contacts: 4 },
  { id: '5', title: 'Townhouse — Jordaan', status: 'sold', category: 'Residential', budget: 920000, spent: 920000, startDate: '2025-06-01', sdgs: [] as number[], milestones: 5, completedMilestones: 5, contacts: 6 },
  { id: '6', title: 'Warehouse Loft — NDSM', status: 'active', category: 'Mixed-Use', budget: 550000, spent: 0, startDate: '2026-02-01', sdgs: [] as number[], milestones: 4, completedMilestones: 1, contacts: 2 },
]

const HOS_PROJECTS = [
  { id: '1', title: 'Royal Suite — Floor 4', status: 'active', category: 'Suite', budget: 450, spent: 0, startDate: '2025-01-01', sdgs: [] as number[], milestones: 4, completedMilestones: 4, contacts: 2 },
  { id: '2', title: 'Standard Double 201', status: 'active', category: 'Standard', budget: 135, spent: 0, startDate: '2025-01-01', sdgs: [] as number[], milestones: 4, completedMilestones: 4, contacts: 1 },
  { id: '3', title: 'Restaurant — La Terrazza', status: 'active', category: 'F&B Venue', budget: 0, spent: 0, startDate: '2024-06-01', sdgs: [] as number[], milestones: 6, completedMilestones: 6, contacts: 4 },
  { id: '4', title: 'Conference Hall A', status: 'active', category: 'Event Space', budget: 800, spent: 0, startDate: '2024-09-01', sdgs: [] as number[], milestones: 5, completedMilestones: 5, contacts: 3 },
  { id: '5', title: 'Penthouse Suite', status: 'maintenance', category: 'Suite', budget: 650, spent: 0, startDate: '2025-01-01', sdgs: [] as number[], milestones: 4, completedMilestones: 2, contacts: 0 },
  { id: '6', title: 'Garden Pavilion', status: 'active', category: 'Event Space', budget: 1200, spent: 0, startDate: '2024-03-01', sdgs: [] as number[], milestones: 3, completedMilestones: 3, contacts: 5 },
  { id: '7', title: 'Deluxe King 305', status: 'reserved', category: 'Deluxe', budget: 225, spent: 0, startDate: '2025-02-01', sdgs: [] as number[], milestones: 4, completedMilestones: 4, contacts: 1 },
  { id: '8', title: 'Economy Twin 102', status: 'active', category: 'Economy', budget: 95, spent: 0, startDate: '2025-01-01', sdgs: [] as number[], milestones: 4, completedMilestones: 3, contacts: 1 },
]

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
}

const statusColors: Record<string, { bg: string; txt: string; border: string }> = {
  active: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  completed: { bg: 'var(--accent-bg)', txt: 'var(--accent-txt)', border: 'var(--accent-border)' },
  planned: { bg: 'var(--bg2)', txt: 'var(--txt3)', border: 'var(--border)' },
  paused: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  pending: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  sold: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
  maintenance: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  reserved: { bg: 'var(--p-bg)', txt: 'var(--p-txt)', border: 'var(--p-border)' },
}

export default function ProjectsPage() {
  const { industry } = useIndustry()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'

  /* Live data for the default (philanthropy) view comes from the API.
     RE and HOS modes keep their hand-curated demo data. */
  const apiQuery = useApi<{ data: ApiProject[] }>('/projects', {
    enabled: !isRE && !isHOS,
  })
  const liveProjects = useMemo<UiProject[]>(() => {
    if (isRE || isHOS) return []
    const rows = apiQuery.data?.data ?? []
    return rows.map(mapApiProject)
  }, [apiQuery.data, isRE, isHOS])

  const projects: UiProject[] = isHOS
    ? HOS_PROJECTS
    : isRE
    ? RE_PROJECTS
    : liveProjects.length > 0
    ? liveProjects
    : DEMO_PROJECTS
  const statusOptions = isHOS
    ? ['all', 'active', 'maintenance', 'reserved']
    : isRE
    ? ['all', 'active', 'pending', 'sold']
    : ['all', 'active', 'planned', 'completed', 'paused']

  const filtered = projects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = projects.filter(p => p.status === 'active').length
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0)
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0)
  const avgPrice = Math.round(totalBudget / projects.length)

  const budgetLabel = isHOS ? 'Nightly Rate' : isRE ? 'Price' : 'Budget'

  const formatCurrency = (v: number) => {
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`
    return `€${(v / 1000).toFixed(0)}K`
  }

  return (
    <>
      <Topbar
        title={isHOS ? 'Venues & Rooms' : isRE ? 'Properties' : 'Projects'}
        sub={isHOS ? 'Manage your properties' : isRE ? 'Manage your portfolio' : 'Manage your CSR initiatives'}
        addLabel={isHOS ? 'New Room' : isRE ? 'New Property' : 'New Project'}
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          {isHOS ? (
            <>
              <KpiCard label="Total Venues" value={projects.length} icon="folder" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Available" value={projects.filter(p => p.status === 'active').length} delta={`${Math.round((activeCount / projects.length) * 100)}% of total`} deltaDir="up" icon="zap" accentColor="var(--g)" delay={130} />
              <KpiCard label="Avg Nightly Rate" value={`€${Math.round(projects.filter(p => p.budget > 0).reduce((s, p) => s + p.budget, 0) / projects.filter(p => p.budget > 0).length)}`} icon="dollar-sign" accentColor="var(--accent)" delay={180} />
              <KpiCard label="Occupancy" value="78%" delta="Current month" deltaDir="up" icon="chart" accentColor="var(--y)" delay={230} />
            </>
          ) : isRE ? (
            <>
              <KpiCard label="Total Properties" value={projects.length} icon="folder" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Active Listings" value={activeCount} delta={`${Math.round((activeCount / projects.length) * 100)}% of total`} deltaDir="up" icon="zap" accentColor="var(--g)" delay={130} />
              <KpiCard label="Portfolio Value" value={formatCurrency(totalBudget)} icon="dollar-sign" accentColor="var(--accent)" delay={180} />
              <KpiCard label="Avg Price" value={formatCurrency(avgPrice)} icon="chart" accentColor="var(--y)" delay={230} />
            </>
          ) : (
            <>
              <KpiCard label="Total Projects" value={projects.length} icon="folder" accentColor="var(--accent)" delay={80} />
              <KpiCard label="Active" value={activeCount} delta={`${Math.round((activeCount / projects.length) * 100)}% of total`} deltaDir="up" icon="zap" accentColor="var(--g)" delay={130} />
              <KpiCard label="Total Budget" value={`€${(totalBudget / 1000).toFixed(0)}K`} icon="dollar-sign" accentColor="var(--accent)" delay={180} />
              <KpiCard label="Budget Used" value={`${Math.round((totalSpent / totalBudget) * 100)}%`} delta={`€${(totalSpent / 1000).toFixed(0)}K spent`} deltaDir="neu" icon="chart" accentColor="var(--y)" delay={230} />
            </>
          )}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, background: 'var(--bg2)', borderRadius: 8, padding: '6px 10px' }}>
            <Search size={14} color="var(--txt3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isHOS ? 'Search rooms & venues...' : isRE ? 'Search properties...' : 'Search projects...'}
              style={{ border: 'none', background: 'none', flex: 1, fontSize: 13, padding: 0 }}
            />
          </div>
          {statusOptions.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 11.5, fontWeight: 600,
              background: statusFilter === s ? 'var(--txt)' : 'var(--bg2)',
              color: statusFilter === s ? 'var(--panel)' : 'var(--txt2)',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
            }}>{s}</button>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setView('grid')} style={{
              padding: 6, borderRadius: 6, background: view === 'grid' ? 'var(--txt)' : 'var(--bg2)',
              color: view === 'grid' ? 'var(--panel)' : 'var(--txt3)', border: 'none', cursor: 'pointer',
              display: 'flex',
            }}><Grid3X3 size={14} /></button>
            <button onClick={() => setView('list')} style={{
              padding: 6, borderRadius: 6, background: view === 'list' ? 'var(--txt)' : 'var(--bg2)',
              color: view === 'list' ? 'var(--panel)' : 'var(--txt3)', border: 'none', cursor: 'pointer',
              display: 'flex',
            }}><List size={14} /></button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {filtered.map(p => {
              const sc = statusColors[p.status] || statusColors.planned
              const progress = Math.round((p.completedMilestones / p.milestones) * 100)
              return (
                <div key={p.id} className="card-hover" style={{
                  background: 'var(--panel)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px', cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                      background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                      textTransform: 'capitalize',
                    }}>{p.status}</span>
                    {!isRE && !isHOS && (
                      <div style={{ display: 'flex', gap: 3 }}>
                        {p.sdgs.map(s => (
                          <div key={s} style={{
                            width: 18, height: 18, borderRadius: 4, background: SDG_COLORS[s],
                            fontSize: 9, fontWeight: 700, color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 12 }}>{p.category}</div>

                  {/* Progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--txt3)' }}>Milestones</span>
                      <span className="mono" style={{ fontSize: 10.5, fontWeight: 600 }}>{p.completedMilestones}/{p.milestones}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${progress}%`,
                        background: progress >= 80 ? 'var(--g)' : progress >= 50 ? 'var(--accent)' : 'var(--y)',
                      }} />
                    </div>
                  </div>

                  {/* Budget / Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--txt3)' }}>{budgetLabel}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      {isHOS
                        ? (p.budget > 0 ? `€${p.budget}/night` : '—')
                        : isRE
                        ? formatCurrency(p.budget)
                        : `€${(p.spent / 1000).toFixed(0)}K / €${(p.budget / 1000).toFixed(0)}K`
                      }
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {(isHOS
                    ? ['Room / Venue', 'Status', 'Category', 'Nightly Rate', 'Progress']
                    : isRE
                    ? ['Property', 'Status', 'Category', 'Price', 'Progress']
                    : ['Project', 'Status', 'Category', 'Budget', 'Progress', 'SDGs']
                  ).map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 10.5,
                      fontWeight: 600, textTransform: 'uppercase', color: 'var(--txt3)',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sc = statusColors[p.status] || statusColors.planned
                  const progress = Math.round((p.completedMilestones / p.milestones) * 100)
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600 }}>{p.title}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: sc.bg, color: sc.txt, border: `1px solid ${sc.border}`,
                          textTransform: 'capitalize',
                        }}>{p.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--txt2)' }}>{p.category}</td>
                      <td className="mono" style={{ padding: '12px 14px', fontSize: 12 }}>
                        {isHOS ? (p.budget > 0 ? `€${p.budget}/night` : '—') : isRE ? formatCurrency(p.budget) : `€${(p.budget / 1000).toFixed(0)}K`}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50, height: 4, borderRadius: 2, background: 'var(--bg2)', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${progress}%`,
                              background: progress >= 80 ? 'var(--g)' : 'var(--accent)',
                              borderRadius: 2,
                            }} />
                          </div>
                          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{progress}%</span>
                        </div>
                      </td>
                      {!isRE && !isHOS && (
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {p.sdgs.map(s => (
                              <div key={s} style={{
                                width: 16, height: 16, borderRadius: 4, background: SDG_COLORS[s],
                                fontSize: 8, fontWeight: 700, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>{s}</div>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
