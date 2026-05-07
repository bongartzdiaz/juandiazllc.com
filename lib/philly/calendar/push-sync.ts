/* Calendar push-sync: provider-agnostic subscribe / renew / unsubscribe.

   Wraps the differences between Google's `watch` channels (TTL 7 days,
   stop endpoint) and Microsoft Graph's subscriptions (TTL ~70 hours,
   PATCH-renewable, validation handshake) behind a single API:
     subscribe()    — register with provider, persist CalendarChannel
     renew()        — extend / replace before expiry
     unsubscribe()  — tell provider to stop, mark row expired
     listDueForRenewal() — selector for the cron

   See docs/calendar-push-sync.md for the architectural rationale and
   provider-specific gotchas this module navigates around.

   Tokens never leave this module unencrypted. The shared-secret used
   for webhook auth (Google `token` / MS `clientState`) is encrypted at
   rest via lib/philly/crypto.ts and only decrypted in-memory when the
   webhook handler needs to verify a delivery. */

import crypto from 'crypto'
import { encryptSecret, decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { getActiveConnection } from './connection'
import type { ProviderKey } from './providers'

// Google channel TTL is documented as up to 7 days. We request 6 days so
// the renewal cron has a 1-day buffer to retry a transient failure before
// the channel actually expires.
const GOOGLE_CHANNEL_TTL_MS = 6 * 24 * 60 * 60 * 1000

// MS Graph caps subscription TTL for events at 4230 minutes (≈70.5 hours).
// We request 4200 to leave ourselves 30 minutes of slack vs the API ceiling
// (defends against clock skew + whatever rounding their parser does).
const MS_SUBSCRIPTION_TTL_MS = 4200 * 60 * 1000

// How far before expiry we consider a channel "due" for the renewal cron.
const RENEWAL_BUFFER_MS = 12 * 60 * 60 * 1000 // 12 hours — comfortably ahead of MS's 70-hour TTL

const GOOGLE_WATCH_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events/watch'
const GOOGLE_STOP_URL = 'https://www.googleapis.com/calendar/v3/channels/stop'
const MS_SUBSCRIPTIONS_URL = 'https://graph.microsoft.com/v1.0/subscriptions'
const MS_CALENDAR_RESOURCE = 'me/events'

export interface SubscribeInput {
  userId: string
  provider: ProviderKey
  webhookBaseUrl: string // e.g. process.env.NEXT_PUBLIC_APP_URL
}

export interface SubscribeSuccess {
  ok: true
  channelId: string
  externalId: string
  expiresAt: Date
}

export interface SubscribeFailure {
  ok: false
  error:
    | 'connection_not_found'
    | 'token_unavailable'
    | 'provider_request_failed'
    | 'provider_response_invalid'
  detail?: string
}

export type SubscribeResult = SubscribeSuccess | SubscribeFailure

/**
 * Register a push-sync channel with the user's calendar provider, then
 * persist a CalendarChannel row. Idempotent: if the user already has an
 * active channel for this provider, returns the existing row without
 * making a provider call. Caller is responsible for unsubscribing first
 * if they want to force a re-subscription.
 */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const conn = await getActiveConnection(input.userId, input.provider)
  if (!conn) return { ok: false, error: 'connection_not_found' }

  const prisma = getAuthPrisma()

  // Idempotency — if there's already an active channel, return it.
  const existing = await prisma.calendarChannel.findFirst({
    where: { connectionId: conn.id, status: 'active' },
    select: { id: true, externalId: true, expiresAt: true },
  })
  if (existing) {
    return {
      ok: true,
      channelId: existing.id,
      externalId: existing.externalId,
      expiresAt: existing.expiresAt,
    }
  }

  const authSecret = generateAuthSecret()
  const webhookUrl = buildWebhookUrl(input.webhookBaseUrl, input.provider)

  if (input.provider === 'google') {
    return await subscribeGoogle({
      connectionId: conn.id,
      accessToken: conn.accessToken,
      authSecret,
      webhookUrl,
    })
  } else {
    return await subscribeMicrosoft({
      connectionId: conn.id,
      accessToken: conn.accessToken,
      authSecret,
      webhookUrl,
    })
  }
}

interface ProviderSubscribeArgs {
  connectionId: string
  accessToken: string
  authSecret: string
  webhookUrl: string
}

async function subscribeGoogle(args: ProviderSubscribeArgs): Promise<SubscribeResult> {
  const channelId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + GOOGLE_CHANNEL_TTL_MS)

  let res: Response
  try {
    res = await fetch(GOOGLE_WATCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: args.webhookUrl,
        token: args.authSecret, // echoed back as X-Goog-Channel-Token
        expiration: expiresAt.getTime(),
      }),
    })
  } catch (err) {
    return { ok: false, error: 'provider_request_failed', detail: errorMessage(err) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      error: 'provider_request_failed',
      detail: `${res.status} ${text.slice(0, 200)}`,
    }
  }

  const json = (await res.json().catch(() => null)) as
    | { id?: string; resourceId?: string; expiration?: string | number }
    | null
  if (!json?.id || !json.resourceId) {
    return { ok: false, error: 'provider_response_invalid' }
  }

  // Google echoes back the expiration as a string of unix-millis; trust
  // theirs over our local computation since they're the source of truth.
  const providerExpiry = json.expiration
    ? new Date(typeof json.expiration === 'string' ? parseInt(json.expiration, 10) : json.expiration)
    : expiresAt

  const prisma = getAuthPrisma()
  const row = await prisma.calendarChannel.create({
    data: {
      connectionId: args.connectionId,
      provider: 'google',
      externalId: json.id,
      resourceId: json.resourceId,
      resource: null,
      authSecretEnc: encryptSecret(args.authSecret)!,
      syncToken: null,
      expiresAt: providerExpiry,
      lastRenewedAt: new Date(),
      status: 'active',
    },
    select: { id: true, externalId: true, expiresAt: true },
  })

  return { ok: true, channelId: row.id, externalId: row.externalId, expiresAt: row.expiresAt }
}

async function subscribeMicrosoft(args: ProviderSubscribeArgs): Promise<SubscribeResult> {
  const expiresAt = new Date(Date.now() + MS_SUBSCRIPTION_TTL_MS)

  let res: Response
  try {
    res = await fetch(MS_SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        changeType: 'created,updated,deleted',
        notificationUrl: args.webhookUrl,
        resource: MS_CALENDAR_RESOURCE,
        expirationDateTime: expiresAt.toISOString(),
        clientState: args.authSecret,
        latestSupportedTlsVersion: 'v1_2',
      }),
    })
  } catch (err) {
    return { ok: false, error: 'provider_request_failed', detail: errorMessage(err) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return {
      ok: false,
      error: 'provider_request_failed',
      detail: `${res.status} ${text.slice(0, 200)}`,
    }
  }

  const json = (await res.json().catch(() => null)) as
    | { id?: string; expirationDateTime?: string }
    | null
  if (!json?.id) {
    return { ok: false, error: 'provider_response_invalid' }
  }

  const providerExpiry = json.expirationDateTime
    ? new Date(json.expirationDateTime)
    : expiresAt

  const prisma = getAuthPrisma()
  const row = await prisma.calendarChannel.create({
    data: {
      connectionId: args.connectionId,
      provider: 'microsoft',
      externalId: json.id,
      resourceId: null,
      resource: MS_CALENDAR_RESOURCE,
      authSecretEnc: encryptSecret(args.authSecret)!,
      syncToken: null,
      expiresAt: providerExpiry,
      lastRenewedAt: new Date(),
      status: 'active',
    },
    select: { id: true, externalId: true, expiresAt: true },
  })

  return { ok: true, channelId: row.id, externalId: row.externalId, expiresAt: row.expiresAt }
}

export interface UnsubscribeResult {
  ok: boolean
  error?: 'channel_not_found' | 'provider_request_failed'
  detail?: string
}

/**
 * Tell the provider to stop sending notifications, then mark the row
 * expired. Best-effort: if the provider call fails (network blip, the
 * channel is already expired upstream), we still mark the row expired
 * locally so it doesn't keep showing up in renewal scans.
 */
export async function unsubscribe(channelId: string): Promise<UnsubscribeResult> {
  const prisma = getAuthPrisma()
  const channel = await prisma.calendarChannel.findUnique({
    where: { id: channelId },
    include: {
      connection: {
        select: { id: true, userId: true, provider: true },
      },
    },
  })
  if (!channel) return { ok: false, error: 'channel_not_found' }

  const conn = await getActiveConnection(channel.connection.userId, channel.connection.provider as ProviderKey)
  // No active connection (revoked, errored). We can't tell the provider
  // to stop, but we still mark the row locally — the channel will time
  // out upstream within its TTL anyway.
  if (!conn) {
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: { status: 'expired', lastError: 'connection_unavailable_at_unsubscribe' },
    })
    return { ok: true }
  }

  let providerOk = false
  let providerDetail: string | undefined
  if (channel.provider === 'google') {
    if (!channel.resourceId) {
      // Defensive: shouldn't happen — Google always returns resourceId.
      providerDetail = 'missing_resourceId'
    } else {
      const result = await stopGoogle(conn.accessToken, channel.externalId, channel.resourceId)
      providerOk = result.ok
      providerDetail = result.detail
    }
  } else if (channel.provider === 'microsoft') {
    const result = await stopMicrosoft(conn.accessToken, channel.externalId)
    providerOk = result.ok
    providerDetail = result.detail
  }

  await prisma.calendarChannel.update({
    where: { id: channelId },
    data: {
      status: 'expired',
      lastError: providerOk ? null : `unsubscribe:${providerDetail ?? 'unknown'}`,
    },
  })
  return providerOk ? { ok: true } : { ok: false, error: 'provider_request_failed', detail: providerDetail }
}

interface StopResult { ok: boolean; detail?: string }

async function stopGoogle(accessToken: string, channelId: string, resourceId: string): Promise<StopResult> {
  try {
    const res = await fetch(GOOGLE_STOP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: channelId, resourceId }),
    })
    // 204 No Content on success. 404 is fine — channel already gone.
    if (res.ok || res.status === 404) return { ok: true }
    return { ok: false, detail: `http_${res.status}` }
  } catch (err) {
    return { ok: false, detail: errorMessage(err) }
  }
}

async function stopMicrosoft(accessToken: string, subscriptionId: string): Promise<StopResult> {
  try {
    const res = await fetch(`${MS_SUBSCRIPTIONS_URL}/${encodeURIComponent(subscriptionId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok || res.status === 404) return { ok: true }
    return { ok: false, detail: `http_${res.status}` }
  } catch (err) {
    return { ok: false, detail: errorMessage(err) }
  }
}

/**
 * Channels expiring within the buffer window. Used by the renewal cron.
 * Caller iterates and calls renew() for each.
 */
export async function listDueForRenewal(now: Date = new Date()): Promise<
  Array<{ id: string; provider: ProviderKey; expiresAt: Date }>
> {
  const prisma = getAuthPrisma()
  const cutoff = new Date(now.getTime() + RENEWAL_BUFFER_MS)
  const rows = await prisma.calendarChannel.findMany({
    where: {
      status: 'active',
      expiresAt: { lt: cutoff },
    },
    select: { id: true, provider: true, expiresAt: true },
    orderBy: { expiresAt: 'asc' },
  })
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider as ProviderKey,
    expiresAt: r.expiresAt,
  }))
}

export interface RenewResult {
  ok: boolean
  newExpiresAt?: Date
  error?: 'channel_not_found' | 'connection_unavailable' | 'provider_request_failed'
  detail?: string
}

/**
 * Renew a channel before it expires. Strategy is provider-specific:
 *   - Google: create a NEW channel, then stop the old one. Overlap is
 *     intentional — Google's docs explicitly recommend this to avoid
 *     a notification gap.
 *   - Microsoft: PATCH /subscriptions/{id} with a new expirationDateTime.
 *     Same channel, just extended.
 *
 * On Google renewal, we reuse the same authSecret for the new channel
 * so the webhook handler doesn't have to track a transition.
 */
export async function renew(channelId: string, webhookBaseUrl: string): Promise<RenewResult> {
  const prisma = getAuthPrisma()
  const channel = await prisma.calendarChannel.findUnique({
    where: { id: channelId },
    include: {
      connection: { select: { userId: true, provider: true } },
    },
  })
  if (!channel) return { ok: false, error: 'channel_not_found' }

  const conn = await getActiveConnection(channel.connection.userId, channel.connection.provider as ProviderKey)
  if (!conn) {
    await prisma.calendarChannel.update({
      where: { id: channelId },
      data: { status: 'error', lastError: 'connection_unavailable' },
    })
    return { ok: false, error: 'connection_unavailable' }
  }

  if (channel.provider === 'google') {
    return await renewGoogle({
      channelId,
      accessToken: conn.accessToken,
      oldExternalId: channel.externalId,
      oldResourceId: channel.resourceId,
      authSecretEnc: channel.authSecretEnc,
      webhookUrl: buildWebhookUrl(webhookBaseUrl, 'google'),
    })
  } else {
    return await renewMicrosoft({
      channelId,
      accessToken: conn.accessToken,
      externalId: channel.externalId,
    })
  }
}

interface RenewGoogleArgs {
  channelId: string
  accessToken: string
  oldExternalId: string
  oldResourceId: string | null
  authSecretEnc: string
  webhookUrl: string
}

async function renewGoogle(args: RenewGoogleArgs): Promise<RenewResult> {
  const authSecret = decryptSecret(args.authSecretEnc)
  if (!authSecret) {
    await markRenewError(args.channelId, 'auth_secret_decrypt_failed')
    return { ok: false, error: 'provider_request_failed', detail: 'auth_secret_decrypt_failed' }
  }

  const newChannelId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + GOOGLE_CHANNEL_TTL_MS)

  let res: Response
  try {
    res = await fetch(GOOGLE_WATCH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: newChannelId,
        type: 'web_hook',
        address: args.webhookUrl,
        token: authSecret,
        expiration: expiresAt.getTime(),
      }),
    })
  } catch (err) {
    await markRenewError(args.channelId, errorMessage(err))
    return { ok: false, error: 'provider_request_failed', detail: errorMessage(err) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const detail = `${res.status} ${text.slice(0, 200)}`
    await markRenewError(args.channelId, detail)
    return { ok: false, error: 'provider_request_failed', detail }
  }

  const json = (await res.json().catch(() => null)) as
    | { id?: string; resourceId?: string; expiration?: string | number }
    | null
  if (!json?.id || !json.resourceId) {
    await markRenewError(args.channelId, 'response_invalid')
    return { ok: false, error: 'provider_request_failed', detail: 'response_invalid' }
  }

  const providerExpiry = json.expiration
    ? new Date(typeof json.expiration === 'string' ? parseInt(json.expiration, 10) : json.expiration)
    : expiresAt

  // Stop the old channel — best-effort, don't fail renewal if stop fails.
  // The old channel will time out on its own anyway.
  if (args.oldResourceId) {
    void stopGoogle(args.accessToken, args.oldExternalId, args.oldResourceId)
  }

  const prisma = getAuthPrisma()
  await prisma.calendarChannel.update({
    where: { id: args.channelId },
    data: {
      externalId: json.id,
      resourceId: json.resourceId,
      expiresAt: providerExpiry,
      lastRenewedAt: new Date(),
      lastError: null,
    },
  })
  return { ok: true, newExpiresAt: providerExpiry }
}

interface RenewMsArgs {
  channelId: string
  accessToken: string
  externalId: string
}

async function renewMicrosoft(args: RenewMsArgs): Promise<RenewResult> {
  const newExpiry = new Date(Date.now() + MS_SUBSCRIPTION_TTL_MS)

  let res: Response
  try {
    res = await fetch(`${MS_SUBSCRIPTIONS_URL}/${encodeURIComponent(args.externalId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expirationDateTime: newExpiry.toISOString(),
      }),
    })
  } catch (err) {
    await markRenewError(args.channelId, errorMessage(err))
    return { ok: false, error: 'provider_request_failed', detail: errorMessage(err) }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const detail = `${res.status} ${text.slice(0, 200)}`
    await markRenewError(args.channelId, detail)
    return { ok: false, error: 'provider_request_failed', detail }
  }

  const json = (await res.json().catch(() => null)) as
    | { expirationDateTime?: string }
    | null
  const providerExpiry = json?.expirationDateTime ? new Date(json.expirationDateTime) : newExpiry

  const prisma = getAuthPrisma()
  await prisma.calendarChannel.update({
    where: { id: args.channelId },
    data: {
      expiresAt: providerExpiry,
      lastRenewedAt: new Date(),
      lastError: null,
    },
  })
  return { ok: true, newExpiresAt: providerExpiry }
}

async function markRenewError(channelId: string, detail: string): Promise<void> {
  const prisma = getAuthPrisma()
  await prisma.calendarChannel.update({
    where: { id: channelId },
    data: { lastError: `renew:${detail.slice(0, 500)}` },
  })
}

/** 32 bytes of base64url randomness — used as Google `token` and MS
 *  `clientState`. Both have generous size limits (Google 256, MS 128
 *  characters) so 43 chars of base64url is comfortably within range. */
function generateAuthSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function buildWebhookUrl(baseUrl: string, provider: ProviderKey): string {
  const trimmed = baseUrl.replace(/\/$/, '')
  return `${trimmed}/philly/api/calendar/webhook/${provider}`
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 200)
  return String(err).slice(0, 200)
}

/** Test-only — exposes internals so unit tests can assert provider-specific
 *  request/response shapes without booting the full Prisma stack. */
export const __internals = {
  GOOGLE_CHANNEL_TTL_MS,
  MS_SUBSCRIPTION_TTL_MS,
  RENEWAL_BUFFER_MS,
  GOOGLE_WATCH_URL,
  GOOGLE_STOP_URL,
  MS_SUBSCRIPTIONS_URL,
  MS_CALENDAR_RESOURCE,
  buildWebhookUrl,
  generateAuthSecret,
}
