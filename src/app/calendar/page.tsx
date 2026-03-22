'use client'

import { useState, useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useIndustry } from '@/hooks/useIndustry'
import { ChevronLeft, ChevronRight, Clock, MapPin, Users, Video } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time: string
  type: 'meeting' | 'viewing' | 'deadline' | 'milestone' | 'call'
  color: string
}

const CSR_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Q1 Impact Review', date: '2026-03-24', time: '10:00', type: 'meeting', color: 'var(--accent)' },
  { id: '2', title: 'Partner call: GreenTech', date: '2026-03-24', time: '14:00', type: 'call', color: 'var(--p)' },
  { id: '3', title: 'Tree planting milestone', date: '2026-03-26', time: '09:00', type: 'milestone', color: 'var(--g)' },
  { id: '4', title: 'Budget deadline Q2', date: '2026-03-28', time: '17:00', type: 'deadline', color: 'var(--r)' },
  { id: '5', title: 'Board presentation', date: '2026-03-31', time: '11:00', type: 'meeting', color: 'var(--accent)' },
  { id: '6', title: 'Donor meeting', date: '2026-04-02', time: '13:00', type: 'meeting', color: 'var(--accent)' },
  { id: '7', title: 'Water project check-in', date: '2026-04-07', time: '10:00', type: 'call', color: 'var(--p)' },
  { id: '8', title: 'Grant committee review', date: '2026-03-25', time: '09:30', type: 'meeting', color: 'var(--accent)' },
  { id: '9', title: 'Reforestation milestone', date: '2026-03-27', time: '11:00', type: 'milestone', color: 'var(--g)' },
  { id: '10', title: 'Partner call: EduFund', date: '2026-03-29', time: '15:00', type: 'call', color: 'var(--p)' },
  { id: '11', title: 'Quarterly donor update', date: '2026-03-30', time: '10:00', type: 'meeting', color: 'var(--accent)' },
  { id: '12', title: 'Impact metrics deadline', date: '2026-04-04', time: '17:00', type: 'deadline', color: 'var(--r)' },
  { id: '13', title: 'Community outreach plan', date: '2026-04-05', time: '14:00', type: 'meeting', color: 'var(--accent)' },
  { id: '14', title: 'Solar project kickoff', date: '2026-04-09', time: '09:00', type: 'milestone', color: 'var(--g)' },
]

const RE_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Viewing: Penthouse Zuidas', date: '2026-03-24', time: '10:00', type: 'viewing', color: 'var(--accent)' },
  { id: '2', title: 'Closing: Townhouse Jordaan', date: '2026-03-24', time: '15:00', type: 'milestone', color: 'var(--g)' },
  { id: '3', title: 'Client call: Van Dijk', date: '2026-03-25', time: '11:00', type: 'call', color: 'var(--p)' },
  { id: '4', title: 'Viewing: Family Home', date: '2026-03-26', time: '14:00', type: 'viewing', color: 'var(--accent)' },
  { id: '5', title: 'Offer deadline: Studio', date: '2026-03-27', time: '17:00', type: 'deadline', color: 'var(--r)' },
  { id: '6', title: 'Open house: NDSM Loft', date: '2026-03-29', time: '12:00', type: 'viewing', color: 'var(--accent)' },
  { id: '7', title: 'Contract signing', date: '2026-04-01', time: '10:00', type: 'milestone', color: 'var(--g)' },
  { id: '8', title: 'Viewing: Centrum Office', date: '2026-04-03', time: '09:00', type: 'viewing', color: 'var(--accent)' },
  { id: '9', title: 'Appraisal: Oud-Zuid flat', date: '2026-03-25', time: '14:00', type: 'viewing', color: 'var(--accent)' },
  { id: '10', title: 'Mortgage deadline: Jansen', date: '2026-03-28', time: '17:00', type: 'deadline', color: 'var(--r)' },
  { id: '11', title: 'Notary meeting: Peters', date: '2026-03-30', time: '10:00', type: 'meeting', color: 'var(--accent)' },
  { id: '12', title: 'Open house: De Pijp', date: '2026-03-31', time: '13:00', type: 'viewing', color: 'var(--accent)' },
  { id: '13', title: 'Client call: Brouwer', date: '2026-04-02', time: '11:00', type: 'call', color: 'var(--p)' },
  { id: '14', title: 'Closing: Zuidas Penthouse', date: '2026-04-04', time: '15:00', type: 'milestone', color: 'var(--g)' },
  { id: '15', title: 'Inspection: NDSM Loft', date: '2026-04-07', time: '10:00', type: 'viewing', color: 'var(--accent)' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const typeIcons: Record<string, typeof Clock> = {
  meeting: Users,
  viewing: MapPin,
  deadline: Clock,
  milestone: Clock,
  call: Video,
}

export default function CalendarPage() {
  const { industry } = useIndustry()
  const events = industry === 'realestate' ? RE_EVENTS : CSR_EVENTS
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 1)) // March 2026
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 6) % 7 // Monday start
    const days: { date: number; month: number; current: boolean }[] = []

    // Previous month fill
    const prevLast = new Date(year, month, 0).getDate()
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ date: prevLast - i, month: month - 1, current: false })
    }
    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: d, month, current: true })
    }
    // Next month fill
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, month: month + 1, current: false })
    }
    return days
  }, [year, month])

  const getDateStr = (d: { date: number; month: number }) => {
    const m = d.month < 0 ? 11 : d.month > 11 ? 0 : d.month
    const y = d.month < 0 ? year - 1 : d.month > 11 ? year + 1 : year
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d.date).padStart(2, '0')}`
  }

  const eventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr)
  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : []
  const today = new Date().toISOString().slice(0, 10)

  return (
    <>
      <Topbar title="Calendar" sub="Appointments & deadlines" />
      <div style={{ padding: '18px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
          {/* Calendar Grid */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px', boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt2)',
              }}><ChevronLeft size={16} /></button>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{MONTHS[month]} {year}</div>
              <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--bg2)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt2)',
              }}><ChevronRight size={16} /></button>
            </div>

            {/* Day Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{
                  textAlign: 'center', fontSize: 10.5, fontWeight: 600,
                  color: 'var(--txt3)', padding: '6px 0', textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {calendarDays.map((d, i) => {
                const dateStr = getDateStr(d)
                const dayEvents = eventsForDate(dateStr)
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDate
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      aspectRatio: '1', borderRadius: 8, padding: '4px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-bg)' : isToday ? 'var(--bg2)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                      opacity: d.current ? 1 : 0.35,
                      transition: 'all 100ms ease',
                      display: 'flex', flexDirection: 'column',
                    }}
                  >
                    <div style={{
                      fontSize: 12, fontWeight: isToday ? 700 : 500,
                      color: isToday ? 'var(--accent)' : 'var(--txt)',
                      textAlign: 'center', marginBottom: 2,
                    }}>{d.date}</div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {dayEvents.slice(0, 3).map(e => (
                        <div key={e.id} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: e.color,
                        }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Events Sidebar */}
          <div style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px', boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
              {selectedDate
                ? new Date(selectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </div>

            {selectedDate && selectedEvents.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--txt3)', padding: '20px 0', textAlign: 'center' }}>
                No events on this date
              </div>
            )}

            {selectedEvents.map(e => {
              const Icon = typeIcons[e.type] || Clock
              return (
                <div key={e.id} style={{
                  padding: '12px', borderRadius: 10, marginBottom: 8,
                  background: 'var(--panel2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${e.color}`,
                  cursor: 'pointer',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon size={13} color={e.color} />
                    <span style={{
                      fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                      color: e.color, letterSpacing: '0.05em',
                    }}>{e.type}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 3 }}>{e.time}</div>
                </div>
              )
            })}

            {/* Upcoming */}
            {!selectedDate && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Upcoming
                </div>
                {events.slice(0, 5).map(e => {
                  const Icon = typeIcons[e.type] || Clock
                  return (
                    <div key={e.id} style={{
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 7, background: 'var(--bg2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={13} color={e.color} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.title}</div>
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--txt3)' }}>{e.date} · {e.time}</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
