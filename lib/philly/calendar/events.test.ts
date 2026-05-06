import { describe, it, expect } from 'vitest'
import { __internals } from './events'

const { buildEventsUrl, normalizeEvents } = __internals

describe('buildEventsUrl — Google', () => {
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

  it('appends Google-style params (timeMin/Max, maxResults, singleEvents)', () => {
    const url = buildEventsUrl('google', base, {
      from: '2026-05-06T00:00:00Z',
      to: '2026-05-13T00:00:00Z',
      limit: 50,
    })
    const u = new URL(url)
    expect(u.searchParams.get('timeMin')).toBe('2026-05-06T00:00:00Z')
    expect(u.searchParams.get('timeMax')).toBe('2026-05-13T00:00:00Z')
    expect(u.searchParams.get('maxResults')).toBe('50')
    expect(u.searchParams.get('singleEvents')).toBe('true')
    expect(u.searchParams.get('orderBy')).toBe('startTime')
  })
})

describe('buildEventsUrl — Microsoft', () => {
  const base = 'https://graph.microsoft.com/v1.0/me/calendar/events'

  it('uses $filter, $top, $orderby, $select for Graph', () => {
    const url = buildEventsUrl('microsoft', base, {
      from: '2026-05-06T00:00:00Z',
      to: '2026-05-13T00:00:00Z',
      limit: 25,
    })
    const u = new URL(url)
    expect(u.searchParams.get('$top')).toBe('25')
    expect(u.searchParams.get('$orderby')).toBe('start/dateTime')
    const filter = u.searchParams.get('$filter') ?? ''
    expect(filter).toContain('2026-05-06')
    expect(filter).toContain('2026-05-13')
    expect(u.searchParams.get('$select')).toContain('subject')
  })
})

describe('normalizeEvents — Google', () => {
  it('extracts timed events with attendees and html link', () => {
    const json = {
      items: [
        {
          id: 'evt_1',
          summary: 'Buyer tour: 123 Main St',
          start: { dateTime: '2026-05-07T10:00:00+02:00' },
          end: { dateTime: '2026-05-07T11:00:00+02:00' },
          location: '123 Main St, Amsterdam',
          attendees: [{ email: 'buyer@example.com' }, { email: 'agent@diaz.example' }],
          htmlLink: 'https://calendar.google.com/event?eid=...',
        },
      ],
    }
    const events = normalizeEvents('google', json)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: 'evt_1',
      title: 'Buyer tour: 123 Main St',
      start: '2026-05-07T10:00:00+02:00',
      end: '2026-05-07T11:00:00+02:00',
      allDay: false,
      location: '123 Main St, Amsterdam',
      attendees: ['buyer@example.com', 'agent@diaz.example'],
      htmlLink: 'https://calendar.google.com/event?eid=...',
      provider: 'google',
    })
  })

  it('flags all-day events when only start.date is set', () => {
    const json = {
      items: [
        {
          id: 'evt_2',
          summary: 'Closing day',
          start: { date: '2026-05-15' },
          end: { date: '2026-05-16' },
        },
      ],
    }
    const events = normalizeEvents('google', json)
    expect(events[0].allDay).toBe(true)
    expect(events[0].start).toBe('2026-05-15')
  })

  it('handles missing summary by labeling (no title)', () => {
    const json = { items: [{ id: 'evt_3', start: { dateTime: '2026-05-06T09:00:00Z' }, end: { dateTime: '2026-05-06T10:00:00Z' } }] }
    const events = normalizeEvents('google', json)
    expect(events[0].title).toBe('(no title)')
  })

  it('returns empty array on missing items', () => {
    expect(normalizeEvents('google', {})).toEqual([])
    expect(normalizeEvents('google', { items: 'not-an-array' as unknown as never[] })).toEqual([])
  })
})

describe('normalizeEvents — Microsoft', () => {
  it('extracts events with subject + isAllDay + location.displayName', () => {
    const json = {
      value: [
        {
          id: 'evt_ms_1',
          subject: 'Listing presentation',
          start: { dateTime: '2026-05-08T13:30:00.0000000', timeZone: 'UTC' },
          end:   { dateTime: '2026-05-08T14:30:00.0000000', timeZone: 'UTC' },
          isAllDay: false,
          location: { displayName: 'Office, room 4' },
          attendees: [{ emailAddress: { address: 'client@example.com' } }],
          webLink: 'https://outlook.office.com/calendar/item/...',
        },
      ],
    }
    const events = normalizeEvents('microsoft', json)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      id: 'evt_ms_1',
      title: 'Listing presentation',
      allDay: false,
      location: 'Office, room 4',
      attendees: ['client@example.com'],
      htmlLink: 'https://outlook.office.com/calendar/item/...',
      provider: 'microsoft',
    })
  })

  it('handles missing attendees and webLink', () => {
    const json = {
      value: [
        {
          id: 'evt_ms_2',
          subject: 'Solo block',
          start: { dateTime: '2026-05-08T08:00:00.0000000' },
          end:   { dateTime: '2026-05-08T09:00:00.0000000' },
        },
      ],
    }
    const events = normalizeEvents('microsoft', json)
    expect(events[0].attendees).toEqual([])
    expect(events[0].htmlLink).toBeNull()
  })
})
