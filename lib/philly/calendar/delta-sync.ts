/* Delta-sync worker for calendar push notifications.
 *
 * Triggered when a webhook fires for a CalendarChannel. Pulls only the
 * events that changed since the last syncToken (Google) or deltaLink
 * (Microsoft), instead of the full window. Persists the new token on
 * the channel so the next sync starts from the new checkpoint.
 *
 * Persistence:
 *   For Bundle D3 we ONLY rotate the token + count the changes. The
 *   actual upsert into a SyncedEvent table is deferred — the existing
 *   /api/calendar/external-events route still polls live for the UI.
 *   Adding persistence is a clean follow-up that doesn't change this
 *   module's contract; the next bundle adds an upsert call inside
 *   `processEvents`.
 *
 * Recovery from token expiry:
 *   - Google returns HTTP 410 GONE when a syncToken is too old. We drop
 *     the token, request `events.list` without one (bootstrap), and
 *     persist the resulting nextSyncToken from the final page.
 *   - Microsoft returns 410 / 404 / "resync required" similarly. Same
 *     pattern: drop deltaLink, hit `/calendarView/delta` from scratch,
 *     persist the new @odata.deltaLink.
 *
 * Pagination:
 *   Both providers paginate with bounded loops (MAX_PAGES). We follow
 *   nextPageToken (Google) / @odata.nextLink (MS) until a page returns
 *   the final delta marker (nextSyncToken / @odata.deltaLink) or the
 *   page budget is exhausted. The delta marker only appears on the
 *   FINAL page, so we MUST persist after the loop completes — partial
 *   advancement would skip events. If we hit MAX_PAGES without a
 *   delta marker, we leave the existing token untouched and the next
 *   notification (or a renewal sweep) catches up.
 *
 * What this module does NOT handle (yet):
 *   - Calendar-not-primary (we only sync `primary` for Google, `me/events`
 *     for MS). Multi-calendar is a future model change. */

import { decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { getActiveConnection } from './connection'
import { persistEvents, type NormalisedEvent } from './event-persistence'
import type { ProviderKey } from './providers'

const GOOGLE_EVENTS_LIST_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const MS_CALENDAR_VIEW_DELTA_URL =
  'https://graph.microsoft.com/v1.0/me/calendarView/delta'

/** When bootstrapping (no syncToken yet), how far back to look. Google
 *  requires a `timeMin` for the initial list-with-syncToken-request;
 *  MS calendarView/delta requires `startDateTime` and `endDateTime`.
 *  14 days back gives us context for ongoing meetings without dragging
 *  in years of archive. */
const BOOTSTRAP_PAST_DAYS = 14
/** Forward window for the bootstrap fetch. Same rationale — covers
 *  upcoming meetings the user cares about, not their entire calendar. */
const BOOTSTRAP_FUTURE_DAYS = 90

/** Hard cap on pages we'll follow inside a single sync call. With
 *  maxResults=250 per page that's 2,500 events per push notification,
 *  which is well above realistic per-notification deltas (Google
 *  batches changes, MS pushes one-at-a-time). The cap prevents a
 *  pathological case (provider-side pagination bug, malicious
 *  channel) from spinning the worker indefinitely. If we ever hit
 *  it, the next notification or the renewal sweep picks up the rest. */
const MAX_PAGES = 10

export interface SyncResult {
  ok: boolean
  bootstrapped: boolean
  /** Provider returned 0 or N events. Counts by lifecycle. */
  processed: number
  added: number
  updated: number
  removed: number
  /** True iff the channel's syncToken/deltaLink was rotated. */
  tokenRotated: boolean
  /** Provider-side error if !ok. */
  error?: string
  /** HTTP status if a single fetch failed; null otherwise. */
  status?: number | null
}

/**
 * Sync delta for a single channel. Idempotent at the channel level —
 * safe to call multiple times for the same notification. The actual
 * dedup happens against the provider's syncToken / deltaLink, which
 * advances on success.
 *
 * Errors are returned as `{ ok: false, error }` not thrown — callers
 * (the webhook handler) will log + ack the webhook 200 anyway, since
 * a transient sync failure shouldn't make the provider retry the
 * notification (we'll catch up on the next push or on the renewal-cron
 * tick).
 */
export async function syncDeltaForChannel(channelId: string): Promise<SyncResult> {
  const prisma = getAuthPrisma()
  const channel = await prisma.calendarChannel.findUnique({
    where: { id: channelId },
    include: {
      connection: { select: { id: true, userId: true, organizationId: true, provider: true } },
    },
  })
  if (!channel) {
    return zero({ error: 'channel_not_found' })
  }
  if (channel.status !== 'active') {
    return zero({ error: 'channel_inactive' })
  }

  const provider = channel.connection.provider as ProviderKey
  const conn = await getActiveConnection(channel.connection.userId, provider)
  if (!conn) {
    return zero({ error: 'connection_unavailable' })
  }

  const ctx: SyncContext = {
    channelId,
    connectionId: channel.connection.id,
    organizationId: channel.connection.organizationId,
    userId: channel.connection.userId,
    accessToken: conn.accessToken,
  }

  if (provider === 'google') {
    return await syncGoogle(ctx, channel.syncToken)
  }
  return await syncMicrosoft(ctx, channel.syncToken)
}

/** Per-call context for the provider-specific sync workers. Kept as
 *  one object so the function signatures stay manageable as we add
 *  fields (persistence, observability, etc.). */
interface SyncContext {
  channelId: string
  connectionId: string
  organizationId: string
  userId: string
  accessToken: string
}

// ─── Google ─────────────────────────────────────────────────────────

async function syncGoogle(
  ctx: SyncContext,
  syncToken: string | null,
  recursionDepth: number = 0,
): Promise<SyncResult> {
  const buildFirstPageUrl = (): string => {
    const url = new URL(GOOGLE_EVENTS_LIST_URL)
    if (syncToken) {
      url.searchParams.set('syncToken', syncToken)
      url.searchParams.set('singleEvents', 'true')
    } else {
      // Bootstrap: no syncToken yet, fetch a window. nextSyncToken comes
      // back on the final page. Order params as Google's docs recommend
      // when establishing a sync baseline.
      const now = Date.now()
      const timeMin = new Date(now - BOOTSTRAP_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(now + BOOTSTRAP_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString()
      url.searchParams.set('timeMin', timeMin)
      url.searchParams.set('timeMax', timeMax)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
    }
    url.searchParams.set('maxResults', '250')
    return url.toString()
  }

  const buildNextPageUrl = (pageToken: string): string => {
    const u = new URL(buildFirstPageUrl())
    u.searchParams.set('pageToken', pageToken)
    return u.toString()
  }

  let totalProcessed = 0
  let nextSyncToken: string | undefined
  let pageToken: string | undefined
  const collected: NormalisedEvent[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const target = page === 0 ? buildFirstPageUrl() : buildNextPageUrl(pageToken!)

    let res: Response
    try {
      res = await fetch(target, {
        headers: { Authorization: `Bearer ${ctx.accessToken}` },
      })
    } catch (err) {
      return zero({ error: `network:${(err as Error).message?.slice(0, 100)}` })
    }

    if (res.status === 410) {
      if (recursionDepth >= 1) {
        return zero({ error: 'persistent_410', status: 410 })
      }
      const prisma = getAuthPrisma()
      await prisma.calendarChannel.update({
        where: { id: ctx.channelId },
        data: { syncToken: null },
      })
      return await syncGoogle(ctx, null, recursionDepth + 1)
    }

    if (!res.ok) {
      return zero({ error: 'http_error', status: res.status })
    }

    const json = (await res.json().catch(() => null)) as
      | {
          items?: GoogleEventPayload[]
          nextSyncToken?: string
          nextPageToken?: string
        }
      | null
    if (!json) {
      return zero({ error: 'response_invalid' })
    }

    const items = json.items ?? []
    totalProcessed += items.length
    for (const it of items) {
      const norm = normaliseGoogleEvent(it)
      if (norm) collected.push(norm)
    }

    if (json.nextSyncToken) {
      nextSyncToken = json.nextSyncToken
      break
    }
    if (json.nextPageToken) {
      pageToken = json.nextPageToken
      continue
    }
    break
  }

  // Persist collected events BEFORE rotating the token. If persistence
  // fails halfway through, we want the next notification to re-sync the
  // same window, not skip to the next checkpoint.
  const persisted = await persistEvents({
    connectionId: ctx.connectionId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    provider: 'google',
    events: collected,
  })

  let tokenRotated = false
  if (nextSyncToken) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: ctx.channelId },
      data: {
        syncToken: nextSyncToken,
        lastError: null,
      },
    })
    tokenRotated = true
  }

  return {
    ok: true,
    bootstrapped: !syncToken,
    processed: totalProcessed,
    added: persisted.persisted,
    updated: 0,
    removed: persisted.cancelled,
    tokenRotated,
  }
}

interface GoogleEventPayload {
  id: string
  status?: string
  summary?: string
  description?: string
  location?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  attendees?: Array<{ email?: string }>
}

function normaliseGoogleEvent(raw: GoogleEventPayload): NormalisedEvent | null {
  if (!raw.id) return null
  const start = raw.start?.dateTime ?? raw.start?.date
  const end = raw.end?.dateTime ?? raw.end?.date
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  return {
    externalId: raw.id,
    title: raw.summary ?? '',
    description: raw.description ?? '',
    location: raw.location ?? '',
    htmlLink: raw.htmlLink ?? '',
    start: startDate,
    end: endDate,
    allDay: !raw.start?.dateTime,
    attendeeEmails: (raw.attendees ?? [])
      .map((a) => a.email ?? '')
      .filter((e) => e.length > 0),
    cancelled: raw.status === 'cancelled',
  }
}

// ─── Microsoft Graph ─────────────────────────────────────────────────

async function syncMicrosoft(
  ctx: SyncContext,
  deltaLink: string | null,
  recursionDepth: number = 0,
): Promise<SyncResult> {
  const buildFirstUrl = (): string => {
    if (deltaLink) return deltaLink
    const u = new URL(MS_CALENDAR_VIEW_DELTA_URL)
    const now = Date.now()
    u.searchParams.set(
      'startDateTime',
      new Date(now - BOOTSTRAP_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    )
    u.searchParams.set(
      'endDateTime',
      new Date(now + BOOTSTRAP_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    )
    return u.toString()
  }

  let totalProcessed = 0
  let nextDeltaLink: string | undefined
  let nextLink: string | undefined
  const collected: NormalisedEvent[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const target = page === 0 ? buildFirstUrl() : nextLink!

    let res: Response
    try {
      res = await fetch(target, {
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          Prefer: 'odata.maxpagesize=250',
        },
      })
    } catch (err) {
      return zero({ error: `network:${(err as Error).message?.slice(0, 100)}` })
    }

    if (res.status === 410 || res.status === 404) {
      if (page > 0) {
        return zero({ error: 'http_error', status: res.status })
      }
      if (recursionDepth >= 1) {
        return zero({ error: 'persistent_410', status: res.status })
      }
      const prisma = getAuthPrisma()
      await prisma.calendarChannel.update({
        where: { id: ctx.channelId },
        data: { syncToken: null },
      })
      return await syncMicrosoft(ctx, null, recursionDepth + 1)
    }

    if (!res.ok) {
      return zero({ error: 'http_error', status: res.status })
    }

    const json = (await res.json().catch(() => null)) as
      | {
          value?: MsEventPayload[]
          '@odata.deltaLink'?: string
          '@odata.nextLink'?: string
        }
      | null
    if (!json) {
      return zero({ error: 'response_invalid' })
    }

    const items = json.value ?? []
    totalProcessed += items.length
    for (const it of items) {
      const norm = normaliseMsEvent(it)
      if (norm) collected.push(norm)
    }

    if (json['@odata.deltaLink']) {
      nextDeltaLink = json['@odata.deltaLink']
      break
    }
    if (json['@odata.nextLink']) {
      nextLink = json['@odata.nextLink']
      continue
    }
    break
  }

  const persisted = await persistEvents({
    connectionId: ctx.connectionId,
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    provider: 'microsoft',
    events: collected,
  })

  let tokenRotated = false
  if (nextDeltaLink) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: ctx.channelId },
      data: {
        syncToken: nextDeltaLink,
        lastError: null,
      },
    })
    tokenRotated = true
  }

  return {
    ok: true,
    bootstrapped: !deltaLink,
    processed: totalProcessed,
    added: persisted.persisted,
    updated: 0,
    removed: persisted.cancelled,
    tokenRotated,
  }
}

interface MsEventPayload {
  id: string
  '@removed'?: { reason: string }
  subject?: string
  bodyPreview?: string
  isAllDay?: boolean
  webLink?: string
  start?: { dateTime?: string; timeZone?: string }
  end?: { dateTime?: string; timeZone?: string }
  location?: { displayName?: string }
  attendees?: Array<{ emailAddress?: { address?: string } }>
}

function normaliseMsEvent(raw: MsEventPayload): NormalisedEvent | null {
  if (!raw.id) return null
  if (raw['@removed']) {
    // Tombstone — only id is reliable. start/end may be missing.
    return {
      externalId: raw.id,
      title: '',
      description: '',
      location: '',
      htmlLink: '',
      start: new Date(0),
      end: new Date(0),
      allDay: false,
      attendeeEmails: [],
      cancelled: true,
    }
  }
  const start = raw.start?.dateTime
  const end = raw.end?.dateTime
  if (!start || !end) return null
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null
  return {
    externalId: raw.id,
    title: raw.subject ?? '',
    description: raw.bodyPreview ?? '',
    location: raw.location?.displayName ?? '',
    htmlLink: raw.webLink ?? '',
    start: startDate,
    end: endDate,
    allDay: Boolean(raw.isAllDay),
    attendeeEmails: (raw.attendees ?? [])
      .map((a) => a.emailAddress?.address ?? '')
      .filter((e) => e.length > 0),
    cancelled: false,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function zero(extra: Partial<SyncResult> & { error?: string; status?: number }): SyncResult {
  return {
    ok: false,
    bootstrapped: false,
    processed: 0,
    added: 0,
    updated: 0,
    removed: 0,
    tokenRotated: false,
    ...extra,
  }
}

/** Test-only — the URL/window constants + signature checks. */
export const __internals = {
  GOOGLE_EVENTS_LIST_URL,
  MS_CALENDAR_VIEW_DELTA_URL,
  BOOTSTRAP_PAST_DAYS,
  BOOTSTRAP_FUTURE_DAYS,
  MAX_PAGES,
  // Exposed as length-only references so tests can assert the
  // recursion guard exists without invoking a live HTTP call.
  syncGoogleArity: syncGoogle.length,
  syncMicrosoftArity: syncMicrosoft.length,
}
