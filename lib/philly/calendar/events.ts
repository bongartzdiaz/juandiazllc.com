/* Provider-agnostic event fetcher.

   Returns a normalized event shape across Google + Microsoft so the
   UI can render a single list. We don't try to perfectly model every
   provider field — just the ones that matter for "show me my next
   meetings": title, start, end, location, attendees, all-day, link
   back to the provider for editing.

   Pagination + delta sync are deferred. MVP: fetch the next 50
   events from primary calendar. Hospitality + RE customers will hit
   that limit fast for buyer-tour days, but there's no UX flow yet
   that needs more — when there is, swap to delta-sync (Google
   `syncToken` / MS Graph `delta`) and persist a checkpoint per
   connection. */

import { getActiveConnection, markConnectionError } from './connection'
import { providerConfig, type ProviderKey } from './providers'

export interface NormalizedEvent {
  id: string
  title: string
  start: string // ISO 8601 with offset
  end: string
  allDay: boolean
  location: string
  attendees: string[] // email addresses
  htmlLink: string | null
  provider: ProviderKey
}

export interface ListEventsInput {
  userId: string
  provider: ProviderKey
  /** ISO 8601 start of window (defaults: now). */
  from?: string
  /** ISO 8601 end of window (defaults: now + 14 days). */
  to?: string
  /** Max events to return (provider-clamped to 250 max). */
  limit?: number
}

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 250
const DEFAULT_WINDOW_DAYS = 14

export type ListEventsResult =
  | { ok: true; events: NormalizedEvent[] }
  | { ok: false; error: 'not_connected' | 'fetch_failed'; detail?: string }

export async function listEvents(input: ListEventsInput): Promise<ListEventsResult> {
  const conn = await getActiveConnection(input.userId, input.provider)
  if (!conn) return { ok: false, error: 'not_connected' }

  const cfg = providerConfig(input.provider)
  const from = input.from ?? new Date().toISOString()
  const to =
    input.to ??
    new Date(Date.now() + DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  const url = buildEventsUrl(input.provider, cfg.eventsUrl, { from, to, limit })

  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
  } catch (err) {
    return { ok: false, error: 'fetch_failed', detail: (err as Error).message?.slice(0, 100) }
  }

  if (res.status === 401) {
    // Token rejected after a successful local refresh — provider has
    // invalidated the grant (security event, manual revoke, etc.).
    // Surface as not_connected; reconnection from the UI fixes it.
    await markConnectionError(conn.id, 'access_token_rejected_401')
    return { ok: false, error: 'not_connected' }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      error: 'fetch_failed',
      detail: `${res.status} ${text.slice(0, 200)}`,
    }
  }

  const json = (await res.json().catch(() => null)) as
    | Record<string, unknown>
    | null
  if (!json) return { ok: false, error: 'fetch_failed', detail: 'invalid_json' }

  const events = normalizeEvents(input.provider, json)
  return { ok: true, events }
}

interface BuildUrlOpts {
  from: string
  to: string
  limit: number
}

function buildEventsUrl(provider: ProviderKey, base: string, opts: BuildUrlOpts): string {
  const u = new URL(base)
  if (provider === 'google') {
    u.searchParams.set('timeMin', opts.from)
    u.searchParams.set('timeMax', opts.to)
    u.searchParams.set('maxResults', String(opts.limit))
    u.searchParams.set('singleEvents', 'true')
    u.searchParams.set('orderBy', 'startTime')
  } else if (provider === 'microsoft') {
    // MS Graph uses $filter for date range and $top for limit.
    u.searchParams.set(
      '$filter',
      `start/dateTime ge '${opts.from}' and end/dateTime le '${opts.to}'`,
    )
    u.searchParams.set('$top', String(opts.limit))
    u.searchParams.set('$orderby', 'start/dateTime')
    u.searchParams.set(
      '$select',
      'id,subject,start,end,isAllDay,location,attendees,webLink',
    )
  }
  return u.toString()
}

interface GoogleEventTime {
  dateTime?: string
  date?: string // for all-day events
}
interface GoogleEvent {
  id: string
  summary?: string
  start?: GoogleEventTime
  end?: GoogleEventTime
  location?: string
  attendees?: { email?: string }[]
  htmlLink?: string
}
interface MsEventTime {
  dateTime?: string
  timeZone?: string
}
interface MsEvent {
  id: string
  subject?: string
  start?: MsEventTime
  end?: MsEventTime
  isAllDay?: boolean
  location?: { displayName?: string }
  attendees?: { emailAddress?: { address?: string } }[]
  webLink?: string
}

function normalizeEvents(provider: ProviderKey, json: Record<string, unknown>): NormalizedEvent[] {
  if (provider === 'google') {
    const items = Array.isArray(json.items) ? (json.items as GoogleEvent[]) : []
    return items.map((e): NormalizedEvent => {
      const allDay = Boolean(e.start?.date && !e.start?.dateTime)
      return {
        id: e.id,
        title: e.summary ?? '(no title)',
        start: e.start?.dateTime ?? e.start?.date ?? '',
        end: e.end?.dateTime ?? e.end?.date ?? '',
        allDay,
        location: e.location ?? '',
        attendees: (e.attendees ?? [])
          .map((a) => a.email)
          .filter((x): x is string => Boolean(x)),
        htmlLink: e.htmlLink ?? null,
        provider,
      }
    })
  }
  if (provider === 'microsoft') {
    const value = Array.isArray(json.value) ? (json.value as MsEvent[]) : []
    return value.map((e): NormalizedEvent => ({
      id: e.id,
      title: e.subject ?? '(no title)',
      start: e.start?.dateTime ?? '',
      end: e.end?.dateTime ?? '',
      allDay: Boolean(e.isAllDay),
      location: e.location?.displayName ?? '',
      attendees: (e.attendees ?? [])
        .map((a) => a.emailAddress?.address)
        .filter((x): x is string => Boolean(x)),
      htmlLink: e.webLink ?? null,
      provider,
    }))
  }
  return []
}

/** Test-only — exported so tests can patch normalizeEvents with provider fixtures. */
export const __internals = { buildEventsUrl, normalizeEvents }
