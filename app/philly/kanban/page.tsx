'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@/components/philly/layout/Topbar'
import { Calendar, Plus, FileText, Check, Clock, X, User, Tag, Columns3, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '@/components/philly/ui/Modal'
import { useIndustry } from '@/hooks/philly/useIndustry'
import { useEntitySubscription } from '@/hooks/philly/useRealtime'

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
  dealValue?: number
  dealType?: 'sale' | 'rental'
  documents?: { name: string; status: 'uploaded' | 'pending' | 'missing' }[]
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

const RE_SALES_COLUMNS: KanbanColumn[] = [
  { id: 'enquiry', title: 'Enquiry', cards: [
    { id: 'se1', title: 'Van Dijk Family — Amstelveen Villa', description: 'Enquiry via website. 4-bed home, budget €700K. Viewing requested for next week.', priority: 'medium', sdgs: [], assignee: 'WV', dueDate: '2026-04-10', dealValue: 700000, dealType: 'sale', documents: [] },
    { id: 'se2', title: 'Brouwer Investment — NDSM Warehouse', description: 'Phone enquiry. Mixed-use conversion potential. Wants viewing with architect.', priority: 'low', sdgs: [], assignee: 'SB', dueDate: '2026-04-18', dealValue: 1200000, dealType: 'sale', documents: [] },
  ]},
  { id: 'viewing', title: 'Viewing', cards: [
    { id: 'sv1', title: 'Jansen Family — Jordaan Townhouse', description: 'Second viewing done, very interested in garden and canal view. Proceed to reservation.', priority: 'urgent', sdgs: [], assignee: 'WV', dueDate: '2026-03-25', dealValue: 920000, dealType: 'sale', documents: [] },
  ]},
  { id: 'reservation', title: 'Reservation', cards: [
    { id: 'sr1', title: 'Visser Partners — Zuidas Penthouse', description: 'Pre-Sales Agreement signed. Deposit €25K held by agent. Docs scanned and stored.', priority: 'urgent', sdgs: [], assignee: 'SB', dueDate: '2026-03-24', dealValue: 1250000, dealType: 'sale', documents: [{ name: 'Reservation Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }] },
  ]},
  { id: 'searches', title: 'Searches', cards: [
    { id: 'ss1', title: 'Smit Fund — Commercial Portfolio', description: 'Lien search initiated for buyer. Seller requested to provide tax clearance documents.', priority: 'high', sdgs: [], assignee: 'WV', dueDate: '2026-04-05', dealValue: 2100000, dealType: 'sale', documents: [{ name: 'Reservation Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Lien Search', status: 'pending' }, { name: 'Tax Clearance', status: 'pending' }] },
  ]},
  { id: 'results', title: 'Results', cards: [
    { id: 'sr2', title: 'Bakker Corp — Oost Office', description: 'Clean search confirmed. No liens found. Tax clearance received from seller. Ready for sales agreement.', priority: 'medium', sdgs: [], assignee: 'TJ', dueDate: '2026-04-02', dealValue: 395000, dealType: 'sale' as const, documents: [{ name: 'Reservation Agreement', status: 'uploaded' as const }, { name: 'Deposit Receipt', status: 'uploaded' as const }, { name: 'Lien Search', status: 'uploaded' as const }, { name: 'Tax Clearance', status: 'uploaded' as const }] },
  ] },
  { id: 'sales-agreement', title: 'Sales Agreement', cards: [
    { id: 'sa1', title: 'de Groot — Oud-Zuid Apartment', description: 'Clean search confirmed. Sales agreement signed by both parties. Scanned and uploaded.', priority: 'medium', sdgs: [], assignee: 'TJ', dueDate: '2026-03-28', dealValue: 485000, dealType: 'sale', documents: [{ name: 'Reservation Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Lien Search', status: 'uploaded' }, { name: 'Tax Clearance', status: 'uploaded' }, { name: 'Sales Agreement', status: 'uploaded' }] },
  ]},
  { id: 'bill-of-sale', title: 'Bill of Sale', cards: [
    { id: 'sb1', title: 'Peters Family — Oud-West Canal', description: 'Bill of sale generated by notary. Transfer at Land Registry scheduled for next Tuesday.', priority: 'high', sdgs: [], assignee: 'WV', dueDate: '2026-03-26', dealValue: 780000, dealType: 'sale' as const, documents: [{ name: 'Reservation Agreement', status: 'uploaded' as const }, { name: 'Deposit Receipt', status: 'uploaded' as const }, { name: 'Lien Search', status: 'uploaded' as const }, { name: 'Tax Clearance', status: 'uploaded' as const }, { name: 'Sales Agreement', status: 'uploaded' as const }, { name: 'Bill of Sale', status: 'uploaded' as const }] },
  ] },
  { id: 'transfer', title: 'Transfer', cards: [
    { id: 'st1', title: 'Hendriks Dev — Jordaan Townhouse', description: 'Transfer at Land Registry scheduled. Stamp duty calculated and ready for payment.', priority: 'high', sdgs: [], assignee: 'SB', dueDate: '2026-03-20', dealValue: 920000, dealType: 'sale', documents: [{ name: 'Reservation Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Lien Search', status: 'uploaded' }, { name: 'Tax Clearance', status: 'uploaded' }, { name: 'Sales Agreement', status: 'uploaded' }, { name: 'Bill of Sale', status: 'uploaded' }, { name: 'Transfer Certificate', status: 'pending' }] },
  ]},
  { id: 'commission', title: 'Commission', cards: [
    { id: 'sc1', title: 'Bakker Family — Centrum Loft', description: 'Sale completed at €640K. Commission €16K deducted from deposit. Overpayment returned.', priority: 'low', sdgs: [], assignee: 'TJ', dueDate: '2026-03-15', dealValue: 640000, dealType: 'sale', documents: [{ name: 'Reservation Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Lien Search', status: 'uploaded' }, { name: 'Tax Clearance', status: 'uploaded' }, { name: 'Sales Agreement', status: 'uploaded' }, { name: 'Bill of Sale', status: 'uploaded' }, { name: 'Transfer Certificate', status: 'uploaded' }, { name: 'Commission Invoice', status: 'uploaded' }] },
  ]},
]

const RE_RENTAL_COLUMNS: KanbanColumn[] = [
  { id: 'r-enquiry', title: 'Enquiry', cards: [
    { id: 're1', title: 'Mulder Expats — De Pijp Studio', description: 'Enquiry via social media. Looking for 1-bed studio, max €1,900/mo. Viewing requested.', priority: 'medium', sdgs: [], assignee: 'TJ', dueDate: '2026-04-08', dealValue: 1850, dealType: 'rental', documents: [] },
    { id: 're2', title: 'Tech Corp — Centrum Office', description: 'Phone enquiry. Series B startup needs 400sqm office, 3-year lease preferred.', priority: 'high', sdgs: [], assignee: 'WV', dueDate: '2026-04-12', dealValue: 8500, dealType: 'rental', documents: [] },
  ]},
  { id: 'r-viewing', title: 'Viewing', cards: [
    { id: 'rv1', title: 'Santos Family — Amstelveen 3-bed', description: 'Viewing done, interested. Family of 4, needs garden access. Budget €2,200/mo.', priority: 'high', sdgs: [], assignee: 'SB', dueDate: '2026-03-27', dealValue: 2200, dealType: 'rental', documents: [] },
  ]},
  { id: 'r-agreement', title: 'Rental Agreement', cards: [
    { id: 'ra1', title: 'Klein Partners — Zuidas Office', description: 'Rental agreement drafted. Deposit €17,000 (2 months) to be held by agent.', priority: 'urgent', sdgs: [], assignee: 'WV', dueDate: '2026-03-25', dealValue: 8500, dealType: 'rental', documents: [{ name: 'Rental Agreement', status: 'pending' }, { name: 'Deposit Receipt', status: 'pending' }] },
  ]},
  { id: 'r-payment', title: 'Payment', cards: [
    { id: 'rp1', title: 'Johnson Reloc — Jordaan Studio', description: 'First month paid. Reconciliation to landlord processed. Keys scheduled for handover.', priority: 'medium', sdgs: [], assignee: 'TJ', dueDate: '2026-03-22', dealValue: 1650, dealType: 'rental', documents: [{ name: 'Rental Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Payment Confirmation', status: 'uploaded' }, { name: 'Landlord Reconciliation', status: 'pending' }] },
  ]},
  { id: 'r-active', title: 'Active Lease', cards: [
    { id: 'rl1', title: 'Koster — Zuidas Rental', description: '12-month lease active since Mar 1. Tenant settled. Monthly rent €2,450 via direct debit.', priority: 'low', sdgs: [], assignee: 'SB', dueDate: '2027-03-01', dealValue: 2450, dealType: 'rental', documents: [{ name: 'Rental Agreement', status: 'uploaded' }, { name: 'Deposit Receipt', status: 'uploaded' }, { name: 'Payment Confirmation', status: 'uploaded' }, { name: 'Landlord Reconciliation', status: 'uploaded' }] },
  ]},
]

const HOS_COLUMNS: KanbanColumn[] = [
  {
    id: 'inquiry',
    title: 'Inquiry',
    cards: [
      { id: 'hi1', title: 'Tanaka Family — Deluxe King', description: 'Family of 4, requesting adjoining rooms, arriving Apr 5 for 5 nights', priority: 'medium', sdgs: [], assignee: 'PG', dueDate: '2026-04-05' },
      { id: 'hi2', title: 'Corporate Group — Conference Hall', description: 'TechCorp requesting full-day conference for 80 pax with catering', priority: 'high', sdgs: [], assignee: 'AB', dueDate: '2026-04-12' },
    ],
  },
  {
    id: 'confirmed',
    title: 'Confirmed',
    cards: [
      { id: 'hc1', title: 'Mr. & Mrs. Jansen — Royal Suite', description: 'Anniversary celebration, 4 nights, champagne & flowers requested', priority: 'high', sdgs: [], assignee: 'PG', dueDate: '2026-03-28' },
      { id: 'hc2', title: 'Wilson Party — Garden Pavilion', description: 'Wedding reception for 120 guests, full F&B package confirmed', priority: 'urgent', sdgs: [], assignee: 'AB', dueDate: '2026-04-02' },
      { id: 'hc3', title: 'Santos Group — 3x Standard', description: 'Business travelers, 2 nights each, early check-in requested', priority: 'low', sdgs: [], assignee: 'PG', dueDate: '2026-03-30' },
    ],
  },
  {
    id: 'arriving',
    title: 'Arriving Today',
    cards: [
      { id: 'ha1', title: 'Dr. Rossi — Penthouse Suite', description: 'VIP guest, 3 nights, airport transfer arranged, dietary restrictions noted', priority: 'urgent', sdgs: [], assignee: 'PG', dueDate: '2026-03-21' },
      { id: 'ha2', title: 'Chen Family — Deluxe King 305', description: 'Family of 3, 2 nights, crib requested for infant', priority: 'high', sdgs: [], assignee: 'AB', dueDate: '2026-03-21' },
    ],
  },
  {
    id: 'inhouse',
    title: 'In-House',
    cards: [
      { id: 'hh1', title: 'T. Nakamura — Deluxe King 305', description: 'Business stay, 2 of 4 nights completed, laundry service requested', priority: 'medium', sdgs: [], assignee: 'AB', dueDate: '2026-03-23' },
      { id: 'hh2', title: 'Müller Group — 2x Standard', description: 'Corporate stay, minibar restocked, late checkout requested for Friday', priority: 'low', sdgs: [], assignee: 'PG', dueDate: '2026-03-22' },
    ],
  },
  {
    id: 'departing',
    title: 'Departing',
    cards: [
      { id: 'hd1', title: 'Smith Family — Standard 201', description: 'Checkout today, feedback form sent, minibar charges pending', priority: 'medium', sdgs: [], assignee: 'PG', dueDate: '2026-03-21' },
    ],
  },
]

const columnAccents: Record<string, string> = {
  backlog: 'var(--txt3)',
  'in-progress': 'var(--b)',
  review: 'var(--o)',
  done: 'var(--g)',
  // Sales
  'enquiry': 'var(--txt3)',
  'viewing': 'var(--b)',
  'reservation': 'var(--accent)',
  'searches': 'var(--y)',
  'results': 'var(--o)',
  'sales-agreement': 'var(--p)',
  'bill-of-sale': 'var(--b)',
  'transfer': 'var(--g)',
  'commission': 'var(--g)',
  // Rental
  'r-enquiry': 'var(--txt3)',
  'r-viewing': 'var(--b)',
  'r-agreement': 'var(--accent)',
  'r-payment': 'var(--o)',
  'r-active': 'var(--g)',
  // Hospitality
  inquiry: 'var(--txt3)',
  confirmed: 'var(--b)',
  arriving: 'var(--o)',
  inhouse: 'var(--p)',
  departing: 'var(--g)',
}

const SALES_STAGES = ['Enquiry', 'Viewing', 'Reservation', 'Searches', 'Results', 'Sales Agreement', 'Bill of Sale', 'Transfer', 'Commission']
const RENTAL_STAGES = ['Enquiry', 'Viewing', 'Rental Agreement', 'Payment', 'Active Lease']

const SALES_STAGE_MAP: Record<string, number> = {
  'enquiry': 0, 'viewing': 1, 'reservation': 2, 'searches': 3, 'results': 4,
  'sales-agreement': 5, 'bill-of-sale': 6, 'transfer': 7, 'commission': 8,
}
const RENTAL_STAGE_MAP: Record<string, number> = {
  'r-enquiry': 0, 'r-viewing': 1, 'r-agreement': 2, 'r-payment': 3, 'r-active': 4,
}

function formatDealValue(value: number, type: 'sale' | 'rental'): string {
  if (type === 'rental') {
    return `€${value.toLocaleString('en-NL')}/mo`
  }
  if (value >= 1000000) {
    const m = value / 1000000
    return `€${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  return `€${Math.round(value / 1000)}K`
}

interface RealBoard {
  id: string
  name: string
  columns: Array<{
    id: string
    name: string
    cards: Array<{
      id: string
      title: string
      description: string | null
      priority: string
      dueDate: string | null
      assignee?: { id: string; name: string | null } | null
    }>
  }>
}

export default function KanbanPage() {
  const t = useTranslations('kanban')
  const { industry } = useIndustry()
  const isRE = industry === 'realestate'
  const isHOS = industry === 'hospitality'
  const [reMode, setReMode] = useState<'sales' | 'rental'>('sales')
  const [selectedCard, setSelectedCard] = useState<KanbanCard | null>(null)
  const [showAddCard, setShowAddCard] = useState(false)
  const [addCardColumn, setAddCardColumn] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addPriority, setAddPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [addAssignee, setAddAssignee] = useState('')
  const [addCardLoading, setAddCardLoading] = useState(false)
  const [addCardError, setAddCardError] = useState<string | null>(null)

  // Fetch real boards from API. If the org has real boards, show them with
  // live CRUD; otherwise fall back to the industry-specific demo preview.
  const [realBoards, setRealBoards] = useState<RealBoard[] | null>(null)
  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch('/philly/api/kanban/boards', { cache: 'no-store' })
      const j = await res.json().catch(() => ({}))
      setRealBoards(Array.isArray(j.data) ? j.data : [])
    } catch {
      setRealBoards([])
    }
  }, [])

  useEffect(() => { fetchBoards() }, [fetchBoards])

  // Live updates when kanban cards/columns/boards change anywhere in the org.
  useEntitySubscription('kanbanCard', fetchBoards)
  useEntitySubscription('kanbanColumn', fetchBoards)
  useEntitySubscription('kanbanBoard', fetchBoards)

  const hasRealBoards = (realBoards?.length ?? 0) > 0

  const columns = isHOS
    ? HOS_COLUMNS
    : isRE
      ? (reMode === 'sales' ? RE_SALES_COLUMNS : RE_RENTAL_COLUMNS)
      : DEMO_COLUMNS

  return (
    <>
      <Topbar
        title={isHOS ? 'Reservations' : isRE ? 'Deals' : t('title')}
        sub={isHOS ? 'Manage bookings' : isRE ? 'Track your transactions' : t('subtitle')}
        addLabel={isHOS ? 'New Booking' : isRE ? 'New Deal' : 'New Board'}
      />

      <div style={{ padding: '18px 24px 40px' }}>
        {/* Demo content notice */}
        {!hasRealBoards && realBoards !== null && (
          <div style={{
            padding: '10px 14px', marginBottom: 14, borderRadius: 8,
            background: 'var(--y-bg)', border: '1px solid var(--y-border)',
            color: 'var(--y-txt)', fontSize: 12.5, lineHeight: 1.5,
          }}>
            <strong>Preview mode:</strong> the cards shown below are sample data.
            Your organization has no kanban boards yet — head to
            {' '}<a href="/philly/deals" style={{ color: 'inherit', textDecoration: 'underline' }}>Deals</a>
            {' '}or
            {' '}<a href="/philly/projects" style={{ color: 'inherit', textDecoration: 'underline' }}>Projects</a>
            {' '}to start tracking real work.
          </div>
        )}

        {/* RE Pipeline Toggle */}
        {isRE && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', borderRadius: 8, padding: 3, marginBottom: 16, width: 'fit-content' }}>
            {['sales', 'rental'].map(m => (
              <button key={m} onClick={() => setReMode(m as 'sales' | 'rental')} style={{
                padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: reMode === m ? 'var(--panel)' : 'transparent',
                color: reMode === m ? 'var(--txt)' : 'var(--txt3)',
                boxShadow: reMode === m ? 'var(--shadow-sm)' : 'none',
              }}>
                {m === 'sales' ? 'Sales Pipeline' : 'Rental Pipeline'}
              </button>
            ))}
          </div>
        )}

        {/* Board */}
        <div style={{
          display: 'flex', gap: 14,
          overflowX: 'auto', paddingBottom: 16,
          minHeight: 'calc(100vh - 140px)',
        }}>
          {columns.map(col => {
            const colWidth = isRE && reMode === 'sales' ? 220 : 270
            return (
              <div key={col.id} style={{
                minWidth: colWidth, maxWidth: isRE && reMode === 'sales' ? 240 : 300, flex: `0 0 ${colWidth}px`,
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
                  <button
                    onClick={() => { setAddCardColumn(col.id); setShowAddCard(true) }}
                    style={{
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
                      <div
                        key={card.id}
                        className="card-hover"
                        onClick={() => setSelectedCard(card)}
                        style={{
                          background: 'var(--panel)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm)',
                          transition: 'box-shadow 0.15s, border-color 0.15s',
                        }}
                      >
                        {/* Priority + SDGs row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                            background: ps.bg, color: ps.txt, border: `1px solid ${ps.border}`,
                            textTransform: 'capitalize',
                          }}>{card.priority}</span>
                          {!isRE && !isHOS && card.sdgs.length > 0 && (
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

                        {/* RE: Deal value + document count */}
                        {isRE && card.dealValue != null && card.dealType && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{
                              fontSize: 12, fontWeight: 700, color: 'var(--accent)',
                            }}>
                              {formatDealValue(card.dealValue, card.dealType)}
                            </span>
                            {card.documents && card.documents.length > 0 && (
                              <span style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 10, color: 'var(--txt3)', fontWeight: 500,
                              }}>
                                <FileText size={10} />
                                {card.documents.filter(d => d.status === 'uploaded').length}/{card.documents.length} docs
                              </span>
                            )}
                          </div>
                        )}

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
            )
          })}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.35)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }} onClick={() => { setShowAddCard(false); setAddTitle(''); setAddDesc(''); setAddPriority('medium'); setAddAssignee(''); setAddCardError(null) }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kanban-add-card-title"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--panel)', borderRadius: 16,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
              padding: '24px 28px', width: 420, maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div id="kanban-add-card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add Card</div>
            <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 18 }}>
              Add a new card to {columns.find(c => c.id === addCardColumn)?.title ?? 'column'}
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (addCardLoading) return
              if (!addTitle.trim()) {
                setAddCardError('Title is required')
                return
              }
              setAddCardLoading(true)
              setAddCardError(null)
              try {
                const res = await fetch('/philly/api/kanban/cards', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    columnId: addCardColumn,
                    title: addTitle.trim(),
                    description: addDesc.trim(),
                    priority: addPriority,
                    assigneeId: addAssignee.trim() || null,
                  }),
                })
                const json = await res.json().catch(() => ({}))
                if (!res.ok) {
                  setAddCardError(json?.error ?? json?.message ?? `Failed to create card (${res.status})`)
                  return
                }
                setShowAddCard(false)
                setAddTitle('')
                setAddDesc('')
                setAddPriority('medium')
                setAddAssignee('')
                setAddCardError(null)
                fetchBoards()
              } catch (err) {
                setAddCardError(err instanceof Error ? err.message : 'Network error')
              } finally {
                setAddCardLoading(false)
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Title *</label>
                <input
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  required
                  autoFocus
                  placeholder="Card title"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Description</label>
                <textarea
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  rows={3}
                  placeholder="Optional description"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Priority</label>
                <select
                  value={addPriority}
                  onChange={e => setAddPriority(e.target.value as 'low' | 'medium' | 'high')}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt2)', marginBottom: 4, display: 'block' }}>Assignee</label>
                <input
                  value={addAssignee}
                  onChange={e => setAddAssignee(e.target.value)}
                  placeholder="Assignee ID or name"
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 13, color: 'var(--txt)', fontFamily: 'inherit',
                  }}
                />
              </div>
              {addCardError && (
                <div role="alert" style={{
                  padding: '8px 12px', borderRadius: 8,
                  background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                  color: 'var(--r-txt)', fontSize: 12, fontWeight: 600,
                }}>{addCardError}</div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => { setShowAddCard(false); setAddTitle(''); setAddDesc(''); setAddPriority('medium'); setAddAssignee(''); setAddCardError(null) }}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--bg2)',
                    fontSize: 12, fontWeight: 600, color: 'var(--txt2)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCardLoading || !addTitle.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    border: 'none', background: 'var(--accent)',
                    fontSize: 12, fontWeight: 600, color: '#fff',
                    cursor: addCardLoading || !addTitle.trim() ? 'not-allowed' : 'pointer',
                    opacity: addCardLoading || !addTitle.trim() ? 0.5 : 1,
                  }}
                >
                  {addCardLoading ? 'Adding...' : 'Add Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RE Document Modal */}
      <Modal
        open={isRE && selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        title={selectedCard?.title || ''}
        subtitle={selectedCard?.dealType === 'sale' ? 'Sales Deal' : selectedCard?.dealType === 'rental' ? 'Rental Deal' : ''}
        size="sm"
      >
        {selectedCard && <DealModal card={selectedCard} reMode={reMode} isRE={isRE} onClose={() => setSelectedCard(null)} />}
      </Modal>

      {/* Generic Card Detail Drawer (non-RE) */}
      {!isRE && (
        <CardDetailDrawer
          card={selectedCard}
          columns={columns}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </>
  )
}

/* ── Card Detail Drawer (sliding right panel) ───────────────────── */

function CardDetailDrawer({
  card,
  columns,
  onClose,
}: {
  card: KanbanCard | null
  columns: KanbanColumn[]
  onClose: () => void
}) {
  useEffect(() => {
    if (!card) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [card, onClose])

  if (!card) return null

  const currentColumn = columns.find(col => col.cards.some(c => c.id === card.id))
  const ps = priorityStyles[card.priority]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(2px)',
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 41,
        width: 380, background: 'var(--panel)',
        borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 250ms cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, gap: 10,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              {card.title}
            </div>
            {currentColumn && (
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>
                in {currentColumn.title}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              cursor: 'pointer', color: 'var(--txt2)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Priority badge */}
          <div style={{ marginBottom: 14 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
              background: ps.bg, color: ps.txt, border: `1px solid ${ps.border}`,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{card.priority}</span>
          </div>

          {/* Description */}
          {card.description && (
            <div style={{ marginBottom: 18 }}>
              <DrawerLabel>Description</DrawerLabel>
              <div style={{ fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.5 }}>
                {card.description}
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            <MetaRow icon={User} label="Assignee" value={card.assignee || 'Unassigned'} />
            <MetaRow icon={Calendar} label="Due Date" value={card.dueDate} mono />
            <MetaRow icon={Columns3} label="Status" value={currentColumn?.title ?? '—'} />
          </div>

          {/* SDGs (philanthropy) */}
          {card.sdgs.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <DrawerLabel>SDG Tags</DrawerLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {card.sdgs.map(s => (
                  <span key={s} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 8px', borderRadius: 6,
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
                  }}>
                    <Tag size={10} /> SDG {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Move to column */}
          <div style={{ marginBottom: 18 }}>
            <DrawerLabel>Move to Column</DrawerLabel>
            <select
              defaultValue={currentColumn?.id ?? ''}
              onChange={async (e) => {
                const newColumnId = e.target.value
                if (!newColumnId || newColumnId === currentColumn?.id) return
                try {
                  const res = await fetch(`/philly/api/kanban/cards/${card.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ columnId: newColumnId }),
                  })
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    throw new Error(j.error ?? `Move failed (${res.status})`)
                  }
                  onClose()
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Move failed'
                  alert(msg)
                }
              }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                fontSize: 12.5, color: 'var(--txt)', fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {columns.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexShrink: 0,
        }}>
          <button
            onClick={() => alert('Edit — hook up to edit flow')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 600, color: 'var(--txt2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={async () => {
              if (!confirm('Delete this card?')) return
              await fetch(`/philly/api/kanban/cards/${card.id}`, { method: 'DELETE' }).catch(() => {})
              onClose()
            }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--r-bg)', border: '1px solid var(--r-border)',
              fontSize: 12, fontWeight: 600, color: 'var(--r-txt)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </>
  )
}

function DrawerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.05em', color: 'var(--txt3)', marginBottom: 6,
    }}>
      {children}
    </div>
  )
}

function MetaRow({
  icon: Icon, label, value, mono,
}: {
  icon: typeof User; label: string; value: string; mono?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8,
      background: 'var(--bg2)', border: '1px solid var(--border)',
    }}>
      <Icon size={13} style={{ color: 'var(--txt3)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600, minWidth: 70 }}>
        {label}
      </span>
      <span
        className={mono ? 'mono' : undefined}
        style={{ fontSize: 12, color: 'var(--txt)', fontWeight: 500, marginLeft: 'auto' }}
      >
        {value}
      </span>
    </div>
  )
}

function DealModal({ card: selectedCard, reMode, isRE }: { card: KanbanCard; reMode: 'sales' | 'rental'; isRE: boolean; onClose: () => void }) {
  const allColumns = reMode === 'sales' ? RE_SALES_COLUMNS : RE_RENTAL_COLUMNS
  const stages = selectedCard.dealType === 'sale' ? SALES_STAGES : RENTAL_STAGES
  const stageMap = selectedCard.dealType === 'sale' ? SALES_STAGE_MAP : RENTAL_STAGE_MAP
  const currentColumnId = allColumns.find(col => col.cards.some(c => c.id === selectedCard.id))?.id
  const currentStageIndex = currentColumnId ? (stageMap[currentColumnId] ?? 0) : 0

  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Deal info + badge + assignee */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {selectedCard.dealValue != null && selectedCard.dealType && (
                <div style={{
                  padding: '8px 14px', borderRadius: 8,
                  background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Deal Value</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>
                      {formatDealValue(selectedCard.dealValue, selectedCard.dealType)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: selectedCard.dealType === 'sale' ? 'var(--g-bg)' : 'var(--p-bg)',
                    color: selectedCard.dealType === 'sale' ? 'var(--g-txt)' : 'var(--p-txt)',
                    border: `1px solid ${selectedCard.dealType === 'sale' ? 'var(--g-border)' : 'var(--p-border)'}`,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {selectedCard.dealType === 'sale' ? 'Sale' : 'Rental'}
                  </span>
                </div>
              )}
              {/* Assignee */}
              <div style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--accent-bg)', border: '2px solid var(--accent-border)',
                  color: 'var(--accent-txt)', fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{selectedCard.assignee}</div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>Assignee</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedCard.assignee}</div>
                </div>
              </div>
            </div>

            {/* Deal Timeline */}
            {isRE && (
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--txt2)' }}>Deal Progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
                  {stages.map((stage, i) => {
                    const isCompleted = i < currentStageIndex
                    const isCurrent = i === currentStageIndex
                    return (
                      <Fragment key={stage}>
                        {i > 0 && (
                          <div style={{
                            flex: '1 0 16px', height: 2, minWidth: 16,
                            background: isCompleted ? 'var(--g)' : 'var(--border)',
                            borderStyle: isCompleted ? 'solid' : 'dashed',
                          }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <div style={{
                            width: isCurrent ? 22 : 18, height: isCurrent ? 22 : 18,
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isCompleted ? 'var(--g)' : isCurrent ? 'var(--accent)' : 'transparent',
                            border: isCompleted || isCurrent ? 'none' : '2px solid var(--border)',
                            color: isCompleted || isCurrent ? '#fff' : 'var(--txt3)',
                            fontSize: 9, fontWeight: 700,
                            transition: 'all 0.2s',
                          }}>
                            {isCompleted ? '\u2713' : i + 1}
                          </div>
                          <span style={{
                            fontSize: 8.5, color: isCurrent ? 'var(--txt)' : 'var(--txt3)',
                            fontWeight: isCurrent ? 600 : 400, whiteSpace: 'nowrap',
                            maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center',
                          }}>{stage}</span>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <div style={{ fontSize: 12.5, color: 'var(--txt2)', lineHeight: 1.5 }}>
              {selectedCard.description}
            </div>

            {/* Document checklist */}
            {selectedCard.documents && selectedCard.documents.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Document Checklist</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedCard.documents.map((doc, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                    }}>
                      {doc.status === 'uploaded' && (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--g-bg)', border: '1px solid var(--g-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check size={11} style={{ color: 'var(--g-txt)' }} />
                        </div>
                      )}
                      {doc.status === 'pending' && (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--y-bg)', border: '1px solid var(--y-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Clock size={11} style={{ color: 'var(--y-txt)' }} />
                        </div>
                      )}
                      {doc.status === 'missing' && (
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--r-bg)', border: '1px solid var(--r-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <X size={11} style={{ color: 'var(--r-txt)' }} />
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{doc.name}</span>
                      <span style={{
                        marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        textTransform: 'capitalize',
                        background: doc.status === 'uploaded' ? 'var(--g-bg)' : doc.status === 'pending' ? 'var(--y-bg)' : 'var(--r-bg)',
                        color: doc.status === 'uploaded' ? 'var(--g-txt)' : doc.status === 'pending' ? 'var(--y-txt)' : 'var(--r-txt)',
                        border: `1px solid ${doc.status === 'uploaded' ? 'var(--g-border)' : doc.status === 'pending' ? 'var(--y-border)' : 'var(--r-border)'}`,
                      }}>{doc.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCard.documents && selectedCard.documents.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                No documents attached yet.
              </div>
            )}
          </div>
  )
}
