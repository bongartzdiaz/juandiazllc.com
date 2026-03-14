'use client'

import { useMemo } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTheme } from '@/hooks/useTheme'
import {
  CalendarDays, CalendarCheck, CalendarClock, Target,
  MapPin, Phone, UserPlus, RefreshCw, Plus, ClipboardList, XCircle, CheckCircle2, Clock,
} from 'lucide-react'

/* ── Types ─────────────────────────────────────────────── */

interface Appointment {
  id: number
  naam: string
  telefoon: string
  stad: string
  type: 'Eerste bezoek' | 'Opvolgbezoek'
  status: 'bevestigd' | 'wachtend' | 'afgerond' | 'geannuleerd'
  datum: string          // ISO date string
  tijd: string           // e.g. "09:30"
  notities: string
}

/* ── Helpers ───────────────────────────────────────────── */

function getWeekDates(): Date[] {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short' }).replace(/^\w/, c => c.toUpperCase())
}

function dayNum(d: Date) {
  return d.getDate()
}

function isToday(d: Date) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

const statusStyleMap: Record<string, string> = {
  bevestigd: 'goed',
  wachtend: 'ok',
  afgerond: 'info',
  geannuleerd: 'slecht',
}

const statusBorderColorMap: Record<string, string> = {
  bevestigd: 'var(--g)',
  wachtend: 'var(--o)',
  afgerond: 'var(--b)',
  geannuleerd: 'var(--r)',
}

const statusIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  bevestigd: CheckCircle2,
  wachtend: Clock,
  afgerond: CalendarCheck,
  geannuleerd: XCircle,
}

const typeIconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  'Eerste bezoek': UserPlus,
  'Opvolgbezoek': RefreshCw,
}

/* ── Mock Data ─────────────────────────────────────────── */

function buildMockData(): Appointment[] {
  const week = getWeekDates()
  const f = (d: Date) => fmt(d)

  return [
    { id: 1,  naam: 'Jan de Vries',       telefoon: '06-12345678', stad: 'Amsterdam',  type: 'Eerste bezoek',  status: 'bevestigd',   datum: f(week[0]), tijd: '09:00', notities: 'Geinteresseerd in premium pakket' },
    { id: 2,  naam: 'Maria Jansen',       telefoon: '06-23456789', stad: 'Rotterdam',   type: 'Opvolgbezoek',  status: 'bevestigd',   datum: f(week[0]), tijd: '11:30', notities: 'Offerte bespreken' },
    { id: 3,  naam: 'Pieter Bakker',      telefoon: '06-34567890', stad: 'Utrecht',     type: 'Eerste bezoek',  status: 'wachtend',    datum: f(week[1]), tijd: '10:00', notities: 'Via website lead' },
    { id: 4,  naam: 'Sophie van Dijk',    telefoon: '06-45678901', stad: 'Den Haag',    type: 'Opvolgbezoek',  status: 'afgerond',    datum: f(week[1]), tijd: '14:00', notities: 'Contract getekend' },
    { id: 5,  naam: 'Tom Mulder',         telefoon: '06-56789012', stad: 'Eindhoven',   type: 'Eerste bezoek',  status: 'bevestigd',   datum: f(week[2]), tijd: '09:30', notities: 'Demo plannen' },
    { id: 6,  naam: 'Lisa de Boer',       telefoon: '06-67890123', stad: 'Groningen',   type: 'Opvolgbezoek',  status: 'bevestigd',   datum: f(week[2]), tijd: '13:00', notities: 'Tweede gesprek' },
    { id: 7,  naam: 'Henk Visser',        telefoon: '06-78901234', stad: 'Tilburg',     type: 'Eerste bezoek',  status: 'wachtend',    datum: f(week[2]), tijd: '16:00', notities: 'Wacht op bevestiging' },
    { id: 8,  naam: 'Anna Smit',          telefoon: '06-89012345', stad: 'Almere',      type: 'Opvolgbezoek',  status: 'bevestigd',   datum: f(week[3]), tijd: '10:30', notities: 'Upsell bespreken' },
    { id: 9,  naam: 'Kees Meijer',        telefoon: '06-90123456', stad: 'Breda',       type: 'Eerste bezoek',  status: 'geannuleerd', datum: f(week[3]), tijd: '14:30', notities: 'Klant afgebeld' },
    { id: 10, naam: 'Eva van den Berg',   telefoon: '06-01234567', stad: 'Arnhem',      type: 'Eerste bezoek',  status: 'bevestigd',   datum: f(week[4]), tijd: '09:00', notities: 'Introductiegesprek' },
    { id: 11, naam: 'Daan Willems',       telefoon: '06-11223344', stad: 'Haarlem',     type: 'Opvolgbezoek',  status: 'wachtend',    datum: f(week[4]), tijd: '11:00', notities: 'Follow-up na demo' },
    { id: 12, naam: 'Floor Hendriks',     telefoon: '06-22334455', stad: 'Leiden',      type: 'Eerste bezoek',  status: 'bevestigd',   datum: f(week[5]), tijd: '10:00', notities: 'Referral van Jan de Vries' },
    { id: 13, naam: 'Bram Dekker',        telefoon: '06-33445566', stad: 'Zwolle',      type: 'Opvolgbezoek',  status: 'bevestigd',   datum: f(week[6]), tijd: '13:30', notities: 'Afsluiting verwacht' },
  ]
}

/* ── Component ─────────────────────────────────────────── */

export default function AgendaPage() {
  const { theme } = useTheme()
  const appointments = useMemo(buildMockData, [])
  const weekDates = useMemo(getWeekDates, [])

  const todayStr = fmt(new Date())

  /* KPI calculations */
  const todayCount = appointments.filter(a => a.datum === todayStr).length
  const weekCount = appointments.length
  const next7 = (() => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const end = new Date(now); end.setDate(end.getDate() + 7)
    return appointments.filter(a => {
      const d = new Date(a.datum)
      return d >= now && d < end
    }).length
  })()
  const convRate = weekCount > 0
    ? Math.round((appointments.filter(a => a.status === 'afgerond').length / weekCount) * 100)
    : 0

  /* Group by date */
  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const a of appointments) {
      ;(map[a.datum] ||= []).push(a)
    }
    // sort each day by time
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.tijd.localeCompare(b.tijd))
    }
    return map
  }, [appointments])

  return (
    <>
      <Topbar title="Agenda" sub="Buitendienst afspraken en planning" />

      <div style={{ padding: '18px 22px 40px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Afspraken vandaag" value={todayCount} delta="Vandaag gepland" deltaDir="neu" accentColor="var(--b)" icon="calendar" delay={80} />
          <KpiCard label="Afspraken deze week" value={weekCount} delta="Ma t/m zo" deltaDir="neu" accentColor="var(--o)" icon="users" delay={130} />
          <KpiCard label="Komende 7 dagen" value={next7} delta="Vanaf vandaag" deltaDir={next7 > 5 ? 'up' : 'neu'} accentColor="var(--g)" icon="zap" delay={180} />
          <KpiCard label="Conversiepercentage" value={`${convRate}%`} delta="Afgerond / totaal" deltaDir={convRate > 10 ? 'up' : 'down'} goal="Doel > 25%" icon="target" delay={230} />
        </div>

        {/* Week view header + add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--b)' }} />
            Weekoverzicht
          </div>
          <button style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 7,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: 'var(--txt)', color: 'var(--panel)',
            border: 'none', boxShadow: 'var(--shadow-sm)',
            fontFamily: 'inherit',
          }}>
            <Plus size={13} /> Afspraak toevoegen
          </button>
        </div>

        {/* Weekly calendar grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
          marginBottom: 12,
        }}>
          {weekDates.map(date => {
            const key = fmt(date)
            const dayAppts = byDate[key] || []
            const confirmedCount = dayAppts.filter(a => a.status === 'bevestigd').length
            const today = isToday(date)

            return (
              <div key={key} style={{
                background: 'var(--panel)',
                border: today ? '2px solid var(--b)' : '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Day header */}
                <div style={{
                  padding: '10px 10px 8px',
                  borderBottom: '1px solid var(--border)',
                  background: today ? (theme === 'dark' ? 'rgba(94,170,255,0.08)' : 'rgba(22,80,220,0.04)') : 'var(--bg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      fontSize: 18, fontWeight: 700, lineHeight: 1,
                      color: today ? 'var(--b)' : 'var(--txt)',
                      letterSpacing: '-0.02em',
                    }}>{dayNum(date)}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      color: today ? 'var(--b)' : 'var(--txt3)',
                      letterSpacing: '0.04em',
                    }}>{dayLabel(date)}</span>
                  </div>
                  {today && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      color: 'var(--b)', letterSpacing: '0.06em',
                    }}>Vandaag</span>
                  )}
                </div>

                {/* Mini summary */}
                <div style={{
                  padding: '6px 10px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--txt3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <CalendarDays size={10} color="var(--txt3)" />
                    {dayAppts.length} afspraak{dayAppts.length !== 1 ? 'en' : ''}
                  </span>
                  {confirmedCount > 0 && (
                    <span className="mono" style={{ fontSize: 10, color: 'var(--g-txt)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle2 size={10} color="var(--g-txt)" />
                      {confirmedCount} bevestigd
                    </span>
                  )}
                </div>

                {/* Appointment cards */}
                <div style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 5, overflowY: 'auto' }}>
                  {dayAppts.length === 0 && (
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--txt3)', fontSize: 11, fontStyle: 'italic',
                    }}>
                      Geen afspraken
                    </div>
                  )}
                  {dayAppts.map(appt => {
                    const borderLeftColor = statusBorderColorMap[appt.status] || 'var(--border)'
                    const TypeIcon = typeIconMap[appt.type]
                    const StatusIcon = statusIconMap[appt.status]

                    return (
                      <div key={appt.id} style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${borderLeftColor}`,
                        borderRadius: 8,
                        padding: '8px 9px',
                        cursor: 'default',
                        transition: 'border-color 0.15s',
                      }}>
                        {/* Time + Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} color="var(--txt3)" />
                            <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--txt)', letterSpacing: '-0.01em' }}>
                              {appt.tijd}
                            </span>
                          </div>
                          <StatusBadge status={statusStyleMap[appt.status]} label={appt.status} />
                        </div>

                        {/* Name */}
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', marginBottom: 3, lineHeight: 1.3 }}>
                          {appt.naam}
                        </div>

                        {/* Location */}
                        <div style={{ fontSize: 10.5, color: 'var(--txt2)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} color="var(--txt3)" /> {appt.stad}
                        </div>

                        {/* Type badge with icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {TypeIcon && <TypeIcon size={10} color={appt.type === 'Eerste bezoek' ? 'var(--b-txt)' : 'var(--y-txt)'} />}
                          <StatusBadge
                            status={appt.type === 'Eerste bezoek' ? 'info' : 'testfase'}
                            label={appt.type}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detailed appointments table below */}
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 15px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, letterSpacing: '-0.01em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--o)' }} />
              Alle afspraken deze week
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--o-bg)', border: '1px solid var(--o-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ClipboardList size={13} color="var(--o-txt)" />
              </div>
              <StatusBadge status="goed" label={`${appointments.filter(a => a.status === 'bevestigd').length} bevestigd`} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Datum', 'Tijd', 'Naam', 'Telefoon', 'Stad', 'Type', 'Status', 'Notities'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '9px 12px', fontSize: 10.5, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)',
                      borderBottom: '1px solid var(--border)', background: 'var(--bg2)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments
                  .sort((a, b) => a.datum.localeCompare(b.datum) || a.tijd.localeCompare(b.tijd))
                  .map(a => (
                    <tr key={a.id}>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--txt2)' }}>
                        {new Date(a.datum).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 600 }}>
                        {a.tijd}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5, fontWeight: 500 }}>
                        {a.naam}
                      </td>
                      <td className="mono" style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: 'var(--txt2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={10} color="var(--txt3)" /> {a.telefoon}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--txt2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={10} color="var(--txt3)" /> {a.stad}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                        <StatusBadge status={a.type === 'Eerste bezoek' ? 'info' : 'testfase'} label={a.type} />
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                        <StatusBadge status={statusStyleMap[a.status]} label={a.status} dot />
                      </td>
                      <td style={{ padding: '9px 12px', borderBottom: '1px solid var(--border)', fontSize: 11.5, color: 'var(--txt3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.notities}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
