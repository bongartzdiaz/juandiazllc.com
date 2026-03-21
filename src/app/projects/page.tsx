'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { Search, Grid3X3, List, ArrowUpDown } from 'lucide-react'

const DEMO_PROJECTS = [
  { id: '1', title: 'Urban Reforestation Amsterdam', status: 'active', category: 'Environment', budget: 120000, spent: 86400, startDate: '2025-09-01', sdgs: [11, 13, 15], milestones: 8, completedMilestones: 6, contacts: 5 },
  { id: '2', title: 'Clean Water Access Kenya', status: 'active', category: 'Water & Sanitation', budget: 250000, spent: 112500, startDate: '2025-11-15', sdgs: [6, 3], milestones: 12, completedMilestones: 5, contacts: 8 },
  { id: '3', title: 'Tech Education for Youth', status: 'active', category: 'Education', budget: 80000, spent: 70400, startDate: '2025-06-01', sdgs: [4, 8, 10], milestones: 10, completedMilestones: 9, contacts: 12 },
  { id: '4', title: 'Renewable Energy Transition', status: 'planned', category: 'Energy', budget: 500000, spent: 75000, startDate: '2026-04-01', sdgs: [7, 13], milestones: 15, completedMilestones: 2, contacts: 3 },
  { id: '5', title: 'Food Bank Partnership', status: 'completed', category: 'Hunger', budget: 45000, spent: 43200, startDate: '2025-03-01', sdgs: [1, 2], milestones: 6, completedMilestones: 6, contacts: 4 },
  { id: '6', title: 'Ocean Plastic Cleanup', status: 'active', category: 'Environment', budget: 180000, spent: 54000, startDate: '2026-01-15', sdgs: [14, 13], milestones: 10, completedMilestones: 3, contacts: 6 },
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
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filtered = DEMO_PROJECTS.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const activeCount = DEMO_PROJECTS.filter(p => p.status === 'active').length
  const totalBudget = DEMO_PROJECTS.reduce((s, p) => s + p.budget, 0)
  const totalSpent = DEMO_PROJECTS.reduce((s, p) => s + p.spent, 0)

  return (
    <>
      <Topbar title="Projects" sub="Manage your CSR initiatives" addLabel="New Project" />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          <KpiCard label="Total Projects" value={DEMO_PROJECTS.length} icon="folder" accentColor="var(--accent)" delay={80} />
          <KpiCard label="Active" value={activeCount} delta={`${Math.round((activeCount / DEMO_PROJECTS.length) * 100)}% of total`} deltaDir="up" icon="zap" accentColor="var(--g)" delay={130} />
          <KpiCard label="Total Budget" value={`$${(totalBudget / 1000).toFixed(0)}K`} icon="dollar-sign" accentColor="var(--accent)" delay={180} />
          <KpiCard label="Budget Used" value={`${Math.round((totalSpent / totalBudget) * 100)}%`} delta={`$${(totalSpent / 1000).toFixed(0)}K spent`} deltaDir="neu" icon="chart" accentColor="var(--y)" delay={230} />
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
              placeholder="Search projects..."
              style={{ border: 'none', background: 'none', flex: 1, fontSize: 13, padding: 0 }}
            />
          </div>
          {['all', 'active', 'planned', 'completed', 'paused'].map(s => (
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
                    <div style={{ display: 'flex', gap: 3 }}>
                      {p.sdgs.map(s => (
                        <div key={s} style={{
                          width: 18, height: 18, borderRadius: 4, background: SDG_COLORS[s],
                          fontSize: 9, fontWeight: 700, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{s}</div>
                      ))}
                    </div>
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

                  {/* Budget */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--txt3)' }}>Budget</span>
                    <span className="mono" style={{ fontWeight: 600 }}>
                      ${(p.spent / 1000).toFixed(0)}K / ${(p.budget / 1000).toFixed(0)}K
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
                  {['Project', 'Status', 'Category', 'Budget', 'Progress', 'SDGs'].map(h => (
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
                      <td className="mono" style={{ padding: '12px 14px', fontSize: 12 }}>${(p.budget / 1000).toFixed(0)}K</td>
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
