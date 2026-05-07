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
    // For paging, Google requires re-supplying the original query (sync
    // token OR window) plus the pageToken. Easiest: rebuild and add.
    const u = new URL(buildFirstPageUrl())
    u.searchParams.set('pageToken', pageToken)
    return u.toString()
  }

  let added = 0
  let updated = 0
  let removed = 0
  let totalProcessed = 0
  let nextSyncToken: string | undefined
  let pageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const target = page === 0 ? buildFirstPageUrl() : buildNextPageUrl(pageToken!)

    let res: Response
    try {
      res = await fetch(target, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    } catch (err) {
      return zero({ error: `network:${(err as Error).message?.slice(0, 100)}` })
    }

    // 410 GONE → syncToken expired. Drop it and recurse for a bootstrap
    // sync. Depth guard: a second 410 means something is genuinely
    // broken (e.g. the bootstrap call itself is rejected) and we bail
    // loud rather than loop. Recursion only ever bottoms out at depth 1.
    if (res.status === 410) {
      if (recursionDepth >= 1) {
        return zero({ error: 'persistent_410', status: 410 })
      }
      const prisma = getAuthPrisma()
      await prisma.calendarChannel.update({
        where: { id: channelId },
        data: { syncToken: null },
      })
      return await syncGoogle(channelId, accessToken, null, recursionDepth + 1)
    }

    if (!res.ok) {
      return zero({ error: 'http_error', status: res.status })
    }

    const json = (await res.json().catch(() => null)) as
      | {
          items?: Array<{ status?: string; id: string }>
          nextSyncToken?: string
          nextPageToken?: string
        }
      | null
    if (!json) {
      return zero({ error: 'response_invalid' })
    }

    const items = json.items ?? []
    totalProcessed += items.length
    // Google encodes deletions as items with `status: 'cancelled'`.
    // Created and updated aren't differentiated in the response — we
    // infer based on whether we've seen the event id before. Since we
    // don't yet persist event rows, we count cancellations as `removed`
    // and the rest as `added` for now. Bundle D4 (with persistence)
    // will distinguish updated vs added by checking the local row.
    for (const it of items) {
      if (it.status === 'cancelled') removed++
      else added++
    }

    if (json.nextSyncToken) {
      nextSyncToken = json.nextSyncToken
      break
    }
    if (json.nextPageToken) {
      pageToken = json.nextPageToken
      continue
    }
    // No nextPageToken AND no nextSyncToken — a Google response shape
    // we shouldn't see (bootstrap call without orderBy can omit the
    // sync token, but our bootstrap sets orderBy=startTime). Bail
    // without rotating the token; next notification will retry.
    break
  }

  let tokenRotated = false
  if (nextSyncToken) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
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
  recursionDepth: number = 0,
): Promise<SyncResult> {
  // For MS, the syncToken column actually stores the full @odata.deltaLink
  // URL. On bootstrap we hit calendarView/delta directly with a date
  // range; subsequent calls use the stored deltaLink as the URL.
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

  let added = 0
  let removed = 0
  let totalProcessed = 0
  let nextDeltaLink: string | undefined
  let nextLink: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const target = page === 0 ? buildFirstUrl() : nextLink!

    let res: Response
    try {
      res = await fetch(target, {
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
    // Only meaningful on the first page (subsequent nextLinks are
    // generated by MS for an already-validated session). Drop the link
    // and recurse for a fresh bootstrap. Depth guard mirrors Google.
    if (res.status === 410 || res.status === 404) {
      if (page > 0) {
        // Mid-pagination 410 — leave the existing token alone, the next
        // notification triggers a fresh start. Don't recurse from here.
        return zero({ error: 'http_error', status: res.status })
      }
      if (recursionDepth >= 1) {
        return zero({ error: 'persistent_410', status: res.status })
      }
      const prisma = getAuthPrisma()
      await prisma.calendarChannel.update({
        where: { id: channelId },
        data: { syncToken: null },
      })
      return await syncMicrosoft(channelId, accessToken, null, recursionDepth + 1)
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
    totalProcessed += items.length
    for (const it of items) {
      if (it['@removed']) removed++
      else added++
    }

    if (json['@odata.deltaLink']) {
      nextDeltaLink = json['@odata.deltaLink']
      break
    }
    if (json['@odata.nextLink']) {
      nextLink = json['@odata.nextLink']
      continue
    }
    // Neither marker — shouldn't happen on a successful delta call.
    // Bail without persisting; next notification retries.
    break
  }

  let tokenRotated = false
  if (nextDeltaLink) {
    const prisma = getAuthPrisma()
    await prisma.calendarChannel.update({
      where: { id: channelId },
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
