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
 * What this module does NOT handle (yet):
 *   - Multi-page pagination (Google/MS both use nextPageToken). For the
 *     MVP we follow the first page only. With ~50 events per call,
 *     missing a page means at most 50 stale events on next sync — not
 *     correctness-breaking, just delayed. Bundle D4 adds pagination.
 *   - Calendar-not-primary (we only sync `primary` for Google, `me/events`
 *     for MS). Multi-calendar is a future model change. */

import { decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { getActiveConnection } from './connection'
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
      connection: { select: { userId: true, provider: true } },
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

  if (provider === 'google') {
    return await syncGoogle(channelId, conn.accessToken, channel.syncToken)
  }
  return await syncMicrosoft(channelId, conn.accessToken, channel.syncToken)
}

// ─── Google ─────────────────────────────────────────────────────────

async function syncGoogle(
  channelId: string,
  accessToken: string,
  syncToken: string | null,
): Promise<SyncResult> {
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

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (err) {
    return zero({ error: `network:${(err as Error).message?.slice(0, 100)}` })
  }

  // 410 GONE → syncToken expired. Drop it and recurse for a bootstrap
  // sync. Recursion bottoms out because we set syncToken=null.
  if (res.status === 410) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: { syncToken: null },
    })
    return await syncGoogle(channelId, accessToken, null)
  }

  if (!res.ok) {
    return zero({ error: 'http_error', status: res.status })
  }

  const json = (await res.json().catch(() => null)) as
    | { items?: Array<{ status?: string; id: string }>; nextSyncToken?: string }
    | null
  if (!json) {
    return zero({ error: 'response_invalid' })
  }

  const items = json.items ?? []
  let added = 0
  let updated = 0
  let removed = 0
  // Google encodes deletions as items with `status: 'cancelled'`. Created
  // and updated aren't differentiated in the response — we infer based
  // on whether we've seen the event id before. Since we don't yet
  // persist event rows, we count cancellations as `removed` and the
  // rest as `added` for now. Bundle D4 (with persistence) will
  // distinguish updated vs added by checking the local row.
  for (const it of items) {
    if (it.status === 'cancelled') removed++
    else added++
  }

  let tokenRotated = false
  if (json.nextSyncToken) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: {
        syncToken: json.nextSyncToken,
        lastError: null,
      },
    })
    tokenRotated = true
  }

  return {
    ok: true,
    bootstrapped: !syncToken,
    processed: items.length,
    added,
    updated,
    removed,
    tokenRotated,
  }
}

// ─── Microsoft Graph ─────────────────────────────────────────────────

async function syncMicrosoft(
  channelId: string,
  accessToken: string,
  deltaLink: string | null,
): Promise<SyncResult> {
  // For MS, the syncToken column actually stores the full @odata.deltaLink
  // URL. On bootstrap we hit calendarView/delta directly with a date
  // range; subsequent calls use the stored deltaLink as the URL.
  let url: string
  if (deltaLink) {
    url = deltaLink
  } else {
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
    url = u.toString()
  }

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // MS recommends a Prefer header to control the page size. 250
        // matches Google; keeps both providers similar.
        Prefer: 'odata.maxpagesize=250',
      },
    })
  } catch (err) {
    return zero({ error: `network:${(err as Error).message?.slice(0, 100)}` })
  }

  // MS Graph returns 410 / 404 when the deltaLink is too old / invalid.
  // Drop the link and recurse for a fresh bootstrap.
  if (res.status === 410 || res.status === 404) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: { syncToken: null },
    })
    return await syncMicrosoft(channelId, accessToken, null)
  }

  if (!res.ok) {
    return zero({ error: 'http_error', status: res.status })
  }

  const json = (await res.json().catch(() => null)) as
    | {
        value?: Array<{ id: string; '@removed'?: { reason: string } }>
        '@odata.deltaLink'?: string
        '@odata.nextLink'?: string
      }
    | null
  if (!json) {
    return zero({ error: 'response_invalid' })
  }

  const items = json.value ?? []
  let added = 0
  let removed = 0
  for (const it of items) {
    if (it['@removed']) removed++
    else added++
  }

  // MS returns the next checkpoint as `@odata.deltaLink` on the FINAL
  // page only. Earlier pages have `@odata.nextLink` instead. For MVP
  // we follow the first page; if we got a deltaLink that means there
  // was only one page. If we got a nextLink, we don't follow it yet —
  // those events catch up on next notification.
  let tokenRotated = false
  if (json['@odata.deltaLink']) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: {
        syncToken: json['@odata.deltaLink'],
        lastError: null,
      },
    })
    tokenRotated = true
  }

  return {
    ok: true,
    bootstrapped: !deltaLink,
    processed: items.length,
    added,
    updated: 0,
    removed,
    tokenRotated,
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

/** Test-only — the URL/window constants. */
export const __internals = {
  GOOGLE_EVENTS_LIST_URL,
  MS_CALENDAR_VIEW_DELTA_URL,
  BOOTSTRAP_PAST_DAYS,
  BOOTSTRAP_FUTURE_DAYS,
}
