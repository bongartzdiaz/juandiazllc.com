/* ---------------------------------------------------------------
   Gmail sync engine.

   Pulls recent messages from an authenticated Gmail account and
   upserts them into EmailThread + Email, resolving contacts by
   address match within the account's organization.

   Design:
   - Reads tokens from EmailAccount (not Integration). OAuth callback
     should also upsert an EmailAccount for provider='gmail' so this
     module has one place to look.
   - All I/O is injectable (prisma + fetch) — tests mock both.
   - `since` watermark: we pass `q=after:YYYY/MM/DD` to messages.list
     so we never refetch the whole inbox. Gmail's `after:` has
     day-level granularity; we overlap by 1 day to avoid missing
     anything that arrived right at the boundary.
   --------------------------------------------------------------- */

import type { PrismaClient } from '@prisma/client'
import { getAuthPrisma } from '@/lib/philly/auth'
import { decryptSecret, encryptSecret } from '@/lib/philly/crypto'
import { logger } from '@/lib/philly/logger'
import {
  refreshGoogleAccessToken,
  shouldRefresh,
  expiryFromSeconds,
  GoogleRefreshError,
} from '@/lib/philly/integrations/google-oauth'
import {
  parseGmailMessage,
  participantsOf,
  directionFor,
  type GmailMessage,
  type ParsedGmailMessage,
} from './gmail-parser'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface SyncOptions {
  /** Max messages to pull per run. Gmail caps list at 500. */
  maxMessages?: number
  /** Override "now" for determinism in tests. */
  now?: Date
  /** Injected fetch (tests). */
  fetchImpl?: typeof fetch
  /** Injected prisma (tests). */
  prisma?: PrismaClient
}

export interface SyncResult {
  ok: boolean
  accountId: string
  threadsUpserted: number
  messagesUpserted: number
  skipped: number
  error?: string
}

/** Build the Gmail `q` filter for incremental sync. */
export function buildGmailQuery(lastSyncAt: Date | null | undefined, now: Date = new Date()): string {
  if (!lastSyncAt) {
    // First sync: last 30 days only, so we don't pull an entire history.
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return `after:${gmailDate(since)}`
  }
  // Overlap by 1 day to catch boundary messages. Dedupe is handled by
  // the (accountId, messageId) unique constraint on upsert.
  const overlap = new Date(lastSyncAt.getTime() - 24 * 60 * 60 * 1000)
  return `after:${gmailDate(overlap)}`
}

function gmailDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${day}`
}

interface DecryptedTokens {
  accessToken: string | null
  refreshToken: string | null
}

function decryptTokens(account: {
  accessToken: string | null
  refreshToken: string | null
}): DecryptedTokens {
  return {
    accessToken: decryptSecret(account.accessToken),
    refreshToken: decryptSecret(account.refreshToken),
  }
}

/** Ensure the account has a non-expired access token. Refreshes + persists
 *  when needed. Returns the current access token, or null if we can't
 *  authenticate (caller should mark account status='error' upstream). */
export async function ensureFreshAccessToken(
  accountId: string,
  opts: SyncOptions = {},
): Promise<string | null> {
  const prisma = opts.prisma ?? getAuthPrisma()
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  })
  if (!account) return null

  const { accessToken, refreshToken } = decryptTokens(account)
  if (!shouldRefresh(account.tokenExpiry)) {
    return accessToken
  }
  if (!refreshToken) {
    // Expired + no refresh token → dead account. Bubble up so the
    // caller can flip status to 'error' and prompt re-connect.
    logger.warn('[gmail-sync] access token expired and no refresh token', { accountId })
    return null
  }

  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken, {
      fetchImpl: opts.fetchImpl,
    })
    const newExpiry = expiryFromSeconds(refreshed.expiresIn, (opts.now ?? new Date()).getTime())
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encryptSecret(refreshed.accessToken),
        tokenExpiry: newExpiry,
        // Google only returns a new refresh token on rotation (rare).
        ...(refreshed.refreshToken ? { refreshToken: encryptSecret(refreshed.refreshToken) } : {}),
        status: 'active',
      },
    })
    return refreshed.accessToken
  } catch (err) {
    if (err instanceof GoogleRefreshError && err.status === 400) {
      // invalid_grant → user revoked, mark dead.
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: { status: 'error' },
      })
    }
    logger.error('[gmail-sync] refresh failed', {
      accountId,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

async function gmailListMessages(
  accessToken: string,
  query: string,
  maxMessages: number,
  fetchImpl: typeof fetch,
): Promise<Array<{ id: string; threadId: string }>> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(maxMessages, 500)),
  })
  const res = await fetchImpl(`${GMAIL_API}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Gmail messages.list ${res.status}`)
  }
  const json = (await res.json()) as GmailListResponse
  return json.messages ?? []
}

async function gmailGetMessage(
  accessToken: string,
  id: string,
  fetchImpl: typeof fetch,
): Promise<GmailMessage> {
  const res = await fetchImpl(`${GMAIL_API}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Gmail messages.get ${res.status}`)
  }
  return (await res.json()) as GmailMessage
}

async function resolveContactId(
  prisma: PrismaClient,
  organizationId: string,
  addresses: string[],
): Promise<string | null> {
  if (addresses.length === 0) return null
  // MySQL uses utf8mb4_unicode_ci collation → equality is already
  // case-insensitive. No `mode: 'insensitive'` needed (unsupported on MySQL).
  const contact = await prisma.contact.findFirst({
    where: {
      organizationId,
      email: { in: addresses },
    },
    select: { id: true },
  })
  return contact?.id ?? null
}

/** Group parsed messages by providerThreadId, preserving insertion order. */
export function groupByThread(messages: ParsedGmailMessage[]): Map<string, ParsedGmailMessage[]> {
  const by = new Map<string, ParsedGmailMessage[]>()
  for (const m of messages) {
    const arr = by.get(m.providerThreadId) ?? []
    arr.push(m)
    by.set(m.providerThreadId, arr)
  }
  return by
}

/** Main sync entry point. */
export async function syncGmailAccount(
  accountId: string,
  opts: SyncOptions = {},
): Promise<SyncResult> {
  const prisma = opts.prisma ?? getAuthPrisma()
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? new Date()

  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } })
  if (!account) {
    return { ok: false, accountId, threadsUpserted: 0, messagesUpserted: 0, skipped: 0, error: 'account not found' }
  }
  if (account.provider !== 'gmail' && account.provider !== 'google') {
    return { ok: false, accountId, threadsUpserted: 0, messagesUpserted: 0, skipped: 0, error: `unsupported provider: ${account.provider}` }
  }

  const accessToken = await ensureFreshAccessToken(accountId, { ...opts, prisma, now })
  if (!accessToken) {
    return { ok: false, accountId, threadsUpserted: 0, messagesUpserted: 0, skipped: 0, error: 'no access token (re-consent required)' }
  }

  const query = buildGmailQuery(account.lastSyncAt, now)
  const max = opts.maxMessages ?? 50

  let ids: Array<{ id: string; threadId: string }>
  try {
    ids = await gmailListMessages(accessToken, query, max, fetchImpl)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, accountId, threadsUpserted: 0, messagesUpserted: 0, skipped: 0, error: msg }
  }

  if (ids.length === 0) {
    await prisma.emailAccount.update({ where: { id: accountId }, data: { lastSyncAt: now } })
    return { ok: true, accountId, threadsUpserted: 0, messagesUpserted: 0, skipped: 0 }
  }

  // Fetch full messages in parallel (Gmail tolerates ~25 concurrent).
  const CONCURRENCY = 10
  const parsed: ParsedGmailMessage[] = []
  let skipped = 0
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(({ id }) => gmailGetMessage(accessToken, id, fetchImpl)),
    )
    for (const r of results) {
      if (r.status === 'fulfilled') parsed.push(parseGmailMessage(r.value))
      else skipped++
    }
  }

  const grouped = groupByThread(parsed)
  let threadsUpserted = 0
  let messagesUpserted = 0

  for (const [providerThreadId, msgs] of grouped) {
    // Newest message first for snippet + lastMessageAt
    msgs.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
    const newest = msgs[0]
    const allParticipants = Array.from(new Set(msgs.flatMap(participantsOf)))
    const contactId = await resolveContactId(prisma, account.organizationId, allParticipants)

    const thread = await prisma.emailThread.upsert({
      where: { accountId_providerThreadId: { accountId, providerThreadId } },
      create: {
        accountId,
        providerThreadId,
        contactId,
        subject: newest.subject,
        snippet: newest.snippet,
        participants: JSON.stringify(allParticipants),
        messageCount: msgs.length,
        unreadCount: msgs.filter((m) => m.labels.includes('UNREAD')).length,
        lastMessageAt: newest.date,
        lastSyncedAt: now,
        labels: JSON.stringify(Array.from(new Set(msgs.flatMap((m) => m.labels)))),
      },
      update: {
        contactId: contactId ?? undefined,
        subject: newest.subject,
        snippet: newest.snippet,
        participants: JSON.stringify(allParticipants),
        messageCount: msgs.length,
        unreadCount: msgs.filter((m) => m.labels.includes('UNREAD')).length,
        lastMessageAt: newest.date,
        lastSyncedAt: now,
        labels: JSON.stringify(Array.from(new Set(msgs.flatMap((m) => m.labels)))),
      },
    })
    threadsUpserted++

    for (const m of msgs) {
      if (!m.rfcMessageId) {
        skipped++
        continue
      }
      await prisma.email.upsert({
        where: { accountId_messageId: { accountId, messageId: m.rfcMessageId } },
        create: {
          accountId,
          threadRowId: thread.id,
          contactId,
          messageId: m.rfcMessageId,
          threadId: providerThreadId,
          direction: directionFor(m, account.email),
          fromAddress: m.from?.email ?? '',
          toAddresses: JSON.stringify(m.to.map((a) => a.email)),
          ccAddresses: JSON.stringify(m.cc.map((a) => a.email)),
          bccAddresses: JSON.stringify(m.bcc.map((a) => a.email)),
          subject: m.subject,
          snippet: m.snippet,
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          labels: JSON.stringify(m.labels),
          status: 'received',
          receivedAt: m.date,
          sentAt: directionFor(m, account.email) === 'outbound' ? m.date : null,
        },
        update: {
          threadRowId: thread.id,
          contactId: contactId ?? undefined,
          labels: JSON.stringify(m.labels),
          snippet: m.snippet,
        },
      })
      messagesUpserted++
    }
  }

  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { lastSyncAt: now, status: 'active' },
  })

  return { ok: true, accountId, threadsUpserted, messagesUpserted, skipped }
}
