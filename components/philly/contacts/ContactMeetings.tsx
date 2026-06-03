'use client'

/* Synced calendar meetings for a contact.
 *
 * Pulls /api/contacts/[id]/meetings — only events whose attendee list
 * actually intersected with this contact at sync time (privacy filter
 * already applied server-side; we never see strangers' calendars).
 *
 * Renders two stacks:
 *   - Upcoming (default — most common usage)
 *   - Past (toggle)
 *
 * Empty state explains why the list might be empty (no calendar
 * connected, or this contact never appeared on a meeting). Keeps the
 * "where are my meetings?" question off the support inbox.
 */

import { useEffect, useState } from 'react'

type Provider = 'google' | 'microsoft'

interface Meeting {
  id: string
  provider: Provider
  title: string
  location: string
  htmlLink: string
  startTime: string
  endTime: string
  allDay: boolean
  matchedEmails: string
}

type RangeKey = 'upcoming' | 'past'

interface Props {
  contactId: string
}

export default function ContactMeetings({ contactId }: Props) {
  const [range, setRange] = useState<RangeKey>('upcoming')
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch(`/philly/api/contacts/${contactId}/meetings?range=${range}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((j) => {
        if (!alive) return
        setMeetings(j?.data?.meetings ?? [])
      })
      .catch((err) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : 'load_failed')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [contactId, range])

  return (
    <div style={{ padding: '24px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Meetings</h3>
        <div role="tablist" style={{ display: 'flex', gap: 4 }}>
          {(['upcoming', 'past'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={range === key}
              onClick={() => setRange(key)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: '1px solid var(--bd, #e5e7eb)',
                background: range === key ? 'var(--g, #0E6B44)' : 'transparent',
                color: range === key ? 'white' : 'var(--text, #111)',
                cursor: 'pointer',
              }}
            >
              {key === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: 24, color: 'var(--muted, #6b7280)', fontSize: 14 }}>
          Loading…
        </div>
      )}
      {error && !loading && (
        <div
          style={{
            padding: 16,
            borderRadius: 8,
            background: 'rgba(220,38,38,0.06)',
            color: '#b91c1c',
            fontSize: 14,
          }}
        >
          Couldn’t load meetings ({error}). Refresh to retry.
        </div>
      )}
      {!loading && !error && meetings && meetings.length === 0 && (
        <EmptyState range={range} />
      )}
      {!loading && !error && meetings && meetings.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {meetings.map((m) => (
            <li key={m.id}>
              <MeetingCard meeting={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const start = new Date(meeting.startTime)
  const end = new Date(meeting.endTime)
  const isRedacted = meeting.title.startsWith('(redacted)')
  return (
    <a
      href={meeting.htmlLink || '#'}
      target={meeting.htmlLink ? '_blank' : undefined}
      rel={meeting.htmlLink ? 'noopener noreferrer' : undefined}
      style={{
        display: 'block',
        padding: 12,
        borderRadius: 8,
        border: '1px solid var(--bd, #e5e7eb)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 120ms',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              fontStyle: isRedacted ? 'italic' : 'normal',
              color: isRedacted ? 'var(--muted, #6b7280)' : 'inherit',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {meeting.title || '(untitled meeting)'}
          </div>
          {meeting.location && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--muted, #6b7280)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {meeting.location}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted, #6b7280)' }}>
          <div style={{ fontWeight: 500, color: 'var(--text, #111)' }}>{formatDay(start)}</div>
          <div>
            {meeting.allDay ? 'All day' : `${formatTime(start)} – ${formatTime(end)}`}
          </div>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
            {meeting.provider === 'google' ? 'Google' : 'Outlook'}
          </div>
        </div>
      </div>
    </a>
  )
}

function EmptyState({ range }: { range: RangeKey }) {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 8,
        border: '1px dashed var(--bd, #e5e7eb)',
        textAlign: 'center',
        color: 'var(--muted, #6b7280)',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 500, color: 'var(--text, #111)', marginBottom: 4 }}>
        {range === 'upcoming' ? 'No upcoming meetings.' : 'No past meetings.'}
      </div>
      <div>
        Connect your calendar in Settings → Integrations, or invite this contact to a meeting in
        Google / Outlook — it’ll show up here within seconds.
      </div>
    </div>
  )
}

function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
