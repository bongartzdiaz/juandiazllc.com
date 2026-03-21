'use client'

import { useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { GripVertical, Calendar, Plus } from 'lucide-react'
import { useIndustry } from '@/hooks/useIndustry'

const SDG_COLORS: Record<number, string> = {
  1: '#E5243B', 2: '#DDA63A', 3: '#4C9F38', 4: '#C5192D', 5: '#FF3A21',
  6: '#26BDE2', 7: '#FCC30B', 8: '#A21942', 9: '#FD6925', 10: '#DD1367',
  11: '#FD9D24', 12: '#BF8B2E', 13: '#3F7E44', 14: '#0A97D9', 15: '#56C02B',
  16: '#00689D', 17: '#19486A',
}

type Priority = 'urgent' | 'high' | 'medium' | 'low'

interface KanbanCard {
  id: string
  title: string
  description: string
  priority: Priority
  sdgs: number[]
  assignee: string
  dueDate: string
}

interface KanbanColumn {
  id: string
  title: string
  cards: KanbanCard[]
}

const priorityStyles: Record<Priority, { bg: string; txt: string; border: string }> = {
  urgent: { bg: 'var(--r-bg)', txt: 'var(--r-txt)', border: 'var(--r-border)' },
  high: { bg: 'var(--o-bg)', txt: 'var(--o-txt)', border: 'var(--o-border)' },
  medium: { bg: 'var(--y-bg)', txt: 'var(--y-txt)', border: 'var(--y-border)' },
  low: { bg: 'var(--g-bg)', txt: 'var(--g-txt)', border: 'var(--g-border)' },
}

const DEMO_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    cards: [
      { id: 'b1', title: 'Research carbon offset partners', description: 'Identify potential partners for carbon offset initiatives in Southeast Asia', priority: 'medium', sdgs: [13, 15], assignee: 'JD', dueDate: '2026-04-15' },
      { id: 'b2', title: 'Draft Q2 impact survey', description: 'Create survey template for stakeholder feedback collection', priority: 'low', sdgs: [17], assignee: 'AK', dueDate: '2026-04-22' },
      { id: 'b3', title: 'Review grant applications', description: 'Evaluate 12 incoming grant proposals for education programs', priority: 'high', sdgs: [4, 10], assignee: 'ML', dueDate: '2026-04-01' },
    ],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    cards: [
      { id: 'p1', title: 'Clean water pipeline Kenya', description: 'Coordinate with local NGOs for water infrastructure deployment', priority: 'urgent', sdgs: [6, 3], assignee: 'RV', dueDate: '2026-03-28' },
      { id: 'p2', title: 'SDG alignment audit', description: 'Map all active projects against UN SDG targets and indicators', priority: 'high', sdgs: [17], assignee: 'JD', dueDate: '2026-03-30' },
    ],
  },
  {
    id: 'review',
    title: 'Review',
    cards: [
      { id: 'r1', title: 'Annual impact report draft', description: 'Final review of 2025 impact metrics and narrative sections', priority: 'urgent', sdgs: [17], assignee: 'AK', dueDate: '2026-03-25' },
      { id: 'r2', title: 'Reforestation site assessment', description: 'Validate satellite data for Amsterdam urban reforestation zones', priority: 'medium', sdgs: [11, 13, 15], assignee: 'ML', dueDate: '2026-04-05' },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    cards: [
      { id: 'd1', title: 'Onboard new CSR partner', description: 'Complete onboarding for TechForGood Foundation partnership', priority: 'low', sdgs: [4, 8], assignee: 'RV', dueDate: '2026-03-18' },
      { id: 'd2', title: 'Update donor dashboard', description: 'Deploy new KPI widgets showing real-time donation tracking', priority: 'medium', sdgs: [17], assignee: 'JD', dueDate: '2026-03-20' },
    ],
  },
]

const RE_COLUMNS: KanbanColumn[] = [
  {
    id: 'prospecting',
    title: 'Prospecting',
    cards: [
      { id: 'rp1', title: 'Van Dijk Family — Amstelveen Home', description: 'Family looking for 4-bedroom home near international school, budget 700K', priority: 'medium', sdgs: [], assignee: 'WV', dueDate: '2026-04-10' },
      { id: 'rp2', title: 'Brouwer Group — NDSM Loft', description: 'Investment group interested in warehouse conversion, mixed-use potential', priority: 'low', sdgs: [], assignee: 'SB', dueDate: '2026-04-18' },
    ],
  },
  {
    id: 'showing',
    title: 'Showing',
    cards: [
      { id: 'rs1', title: 'Tech Corp — Centrum Office Lease', description: 'Series B startup needs 400sqm office space, 3-year lease preferred', priority: 'high', sdgs: [], assignee: 'TJ', dueDate: '2026-03-28' },
      { id: 'rs2', title: 'Jansen Family — Jordaan Townhouse', description: 'Second viewing scheduled, very interested in garden and canal view', priority: 'urgent', sdgs: [], assignee: 'WV', dueDate: '2026-03-25' },
    ],
  },
  {
    id: 'offer',
    title: 'Offer Made',
    cards: [
      { id: 'ro1', title: 'Visser Partners — Zuidas Penthouse', description: 'Offer at 1.2M, seller countered at 1.25M, awaiting buyer response', priority: 'urgent', sdgs: [], assignee: 'SB', dueDate: '2026-03-24' },
      { id: 'ro2', title: 'Mulder Expats — De Pijp Studio', description: 'Rental application submitted, credit check in progress', priority: 'medium', sdgs: [], assignee: 'TJ', dueDate: '2026-03-30' },
    ],
  },
  {
    id: 'contract',
    title: 'Under Contract',
    cards: [
      { id: 'rc1', title: 'Smit Fund — Commercial Portfolio', description: 'Due diligence phase, building inspection scheduled for next week', priority: 'high', sdgs: [], assignee: 'WV', dueDate: '2026-04-05' },
    ],
  },
  {
    id: 'closed',
    title: 'Closed',
    cards: [
      { id: 'rd1', title: 'Hendriks Dev — Jordaan Townhouse', description: 'Sale completed at 920K, keys handed over, commission received', priority: 'low', sdgs: [], assignee: 'SB', dueDate: '2026-03-15' },
      { id: 'rd2', title: 'Koster Relocation — Zuidas Rental', description: '12-month lease signed, tenant moved in, first month collected', priority: 'low', sdgs: [], assignee: 'TJ', dueDate: '2026-03-10' },
    ],
  },
]

const columnAccents: Record<string, string> = {
  backlog: 'var(--txt3)',
  'in-progress': 'var(--b)',
  review: 'var(--o)',
  done: 'var(--g)',
  prospecting: 'var(--txt3)',
  showing: 'var(--b)',
  offer: 'var(--o)',
  contract: 'var(--p)',
  closed: 'var(--g)',
}

export default function KanbanPage() {
  const { industry } = useIndustry()
  const isRE = industry === 'realestate'
  const [columns] = useState(isRE ? RE_COLUMNS : DEMO_COLUMNS)

  return (
    <>
      <Topbar
        title={isRE ? 'Deals' : 'Kanban'}
        sub={isRE ? 'Track your transactions' : 'Visual project management'}
        addLabel={isRE ? 'New Deal' : 'New Board'}
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* Board */}
        <div style={{
          display: 'flex', gap: 14,
          overflowX: 'auto', paddingBottom: 16,
          minHeight: 'calc(100vh - 140px)',
        }}>
          {columns.map(col => (
            <div key={col.id} style={{
              minWidth: 270, maxWidth: 300, flex: '0 0 270px',
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10, padding: '0 4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: columnAccents[col.id] || 'var(--txt3)',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{col.title}</span>
                  <span style={{
                    fontSize: 10.5, fontWeight: 600, color: 'var(--txt3)',
                    background: 'var(--bg2)', borderRadius: 6, padding: '1px 7px',
                  }}>{col.cards.length}</span>
                </div>
                <button style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 6,
                  background: 'none', border: '1px solid var(--border)',
                  color: 'var(--txt3)', cursor: 'pointer',
                }}>
                  <Plus size={12} />
                </button>
              </div>

              {/* Cards stack */}
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
                background: 'var(--bg2)', borderRadius: 10, padding: 8,
                border: '1px solid var(--border)',
              }}>
                {col.cards.map(card => {
                  const ps = priorityStyles[card.priority]
                  return (
                    <div key={card.id} className="card-hover" style={{
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 14px', cursor: 'grab',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'box-shadow 0.15s, border-color 0.15s',
                    }}>
                      {/* Priority + SDGs row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                          background: ps.bg, color: ps.txt, border: `1px solid ${ps.border}`,
                          textTransform: 'capitalize',
                        }}>{card.priority}</span>
                        {!isRE && card.sdgs.length > 0 && (
                          <div style={{ display: 'flex', gap: 3 }}>
                            {card.sdgs.map(s => (
                              <div key={s} style={{
                                width: 16, height: 16, borderRadius: 4, background: SDG_COLORS[s],
                                fontSize: 8, fontWeight: 700, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>{s}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.35 }}>
                        {card.title}
                      </div>

                      {/* Description snippet */}
                      <div style={{
                        fontSize: 11.5, color: 'var(--txt3)', marginBottom: 10,
                        lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {card.description}
                      </div>

                      {/* Footer: assignee + due date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                          color: 'var(--accent-txt)', fontSize: 9, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{card.assignee}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--txt3)' }}>
                          <Calendar size={10} />
                          <span className="mono">{card.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
