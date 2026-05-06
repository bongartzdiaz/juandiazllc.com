/* CalendarConnection storage + token-refresh helpers.

   The single chokepoint for any code that needs to read or use a
   user's calendar tokens. Decryption happens here, refresh happens
   here, and the encrypted forms never leave this module's boundary.

   Public API:
   - upsertConnection(): persist tokens after OAuth callback
   - getActiveConnection(): fetch + decrypt + (lazily) refresh, returns
     a usable accessToken
   - listConnectionsForUser(): UI list with no secrets exposed
   - revokeConnection(): mark status='revoked', tokens stay encrypted
     for audit, will be deleted on user erasure cascade.

   Token refresh: we refresh proactively when access token expires in
   <30s. On 401 from a provider call (handled by callers), invalidate
   via markConnectionError() and let the user reconnect — we don't
   attempt a forced refresh on 401 because Microsoft commonly invalidates
   refresh tokens after a security event and looping refresh attempts
   masks the underlying problem. */

import { encryptSecret, decryptSecret } from '@/lib/philly/crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { providerConfig, type ProviderKey } from './providers'

/** Threshold below which we proactively refresh on read. */
const REFRESH_LEEWAY_MS = 30 * 1000

export interface UpsertInput {
  userId: string
  organizationId: string
  provider: ProviderKey
  providerAccountId: string
  providerEmail: string | null
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
}

export async function upsertConnection(input: UpsertInput): Promise<void> {
  const prisma = getAuthPrisma()
  const data = {
    userId: input.userId,
    organizationId: input.organizationId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    providerEmail: input.providerEmail,
    accessTokenEnc: encryptSecret(input.accessToken)!,
    refreshTokenEnc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    expiresAt: input.expiresAt,
    scopes: input.scopes.join(' '),
    status: 'active',
    lastError: null,
  }
  await prisma.calendarConnection.upsert({
    where: { userId_provider: { userId: input.userId, provider: input.provider } },
    create: data,
    update: data,
  })
}

export interface PublicConnection {
  id: string
  provider: ProviderKey
  providerEmail: string | null
  status: string
  scopes: string[]
  connectedAt: Date
  lastUsedAt: Date | null
  lastError: string | null
}

export async function listConnectionsForUser(userId: string): Promise<PublicConnection[]> {
  const prisma = getAuthPrisma()
  const rows = await prisma.calendarConnection.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      provider: true,
      providerEmail: true,
      status: true,
      scopes: true,
      createdAt: true,
      lastUsedAt: true,
      lastError: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider as ProviderKey,
    providerEmail: r.providerEmail,
    status: r.status,
    scopes: r.scopes ? r.scopes.split(' ').filter(Boolean) : [],
    connectedAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
    lastError: r.lastError,
  }))
}

export async function revokeConnection(connectionId: string, userId: string): Promise<boolean> {
  const prisma = getAuthPrisma()
  const found = await prisma.calendarConnection.findFirst({
    where: { id: connectionId, userId },
    select: { id: true },
  })
  if (!found) return false
  await prisma.calendarConnection.update({
    where: { id: found.id },
    data: { status: 'revoked', lastError: null },
  })
  return true
}

export async function markConnectionError(connectionId: string, message: string): Promise<void> {
  const prisma = getAuthPrisma()
  await prisma.calendarConnection.update({
    where: { id: connectionId },
    data: { status: 'error', lastError: message.slice(0, 1000) },
  })
}

export interface ActiveConnectionResult {
  id: string
  provider: ProviderKey
  accessToken: string
  expiresAt: Date | null
  providerEmail: string | null
}

/**
 * Fetch the active connection for a user/provider pair, decrypt the
 * access token, and refresh it if it's near expiry. Returns null if
 * the user has no active connection or refresh failed and we marked
 * the connection as errored. Callers should treat null as "not connected".
 */
export async function getActiveConnection(
  userId: string,
  provider: ProviderKey,
): Promise<ActiveConnectionResult | null> {
  const prisma = getAuthPrisma()
  const row = await prisma.calendarConnection.findUnique({
    where: { userId_provider: { userId, provider } },
  })
  if (!row || row.status !== 'active') return null

  let accessToken = decryptSecret(row.accessTokenEnc)
  if (!accessToken) {
    await markConnectionError(row.id, 'access_token_decrypt_failed')
    return null
  }

  // Lazy refresh.
  const needsRefresh =
    row.expiresAt != null && row.expiresAt.getTime() - Date.now() < REFRESH_LEEWAY_MS

  if (needsRefresh) {
    const refreshToken = row.refreshTokenEnc ? decryptSecret(row.refreshTokenEnc) : null
    if (!refreshToken) {
      await markConnectionError(row.id, 'no_refresh_token')
      return null
    }
    const refreshed = await refreshAccessToken(provider, refreshToken)
    if (!refreshed.ok) {
      await markConnectionError(row.id, `refresh_failed:${refreshed.error}`)
      return null
    }
    accessToken = refreshed.accessToken
    const newExpiresAt = refreshed.expiresIn
      ? new Date(Date.now() + refreshed.expiresIn * 1000)
      : null
    await prisma.calendarConnection.update({
      where: { id: row.id },
      data: {
        accessTokenEnc: encryptSecret(refreshed.accessToken)!,
        // Some providers (Microsoft) rotate refresh tokens on every
        // refresh; persist the new one if returned.
        refreshTokenEnc: refreshed.refreshToken
          ? encryptSecret(refreshed.refreshToken)
          : row.refreshTokenEnc,
        expiresAt: newExpiresAt,
        lastError: null,
      },
    })
  }

  return {
    id: row.id,
    provider,
    accessToken,
    expiresAt: row.expiresAt,
    providerEmail: row.providerEmail,
  }
}

interface RefreshResult {
  ok: boolean
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  error?: string
}

async function refreshAccessToken(
  provider: ProviderKey,
  refreshToken: string,
): Promise<RefreshResult> {
  const cfg = providerConfig(provider)
  const clientId = process.env[cfg.envClientId]
  const clientSecret = process.env[cfg.envClientSecret]
  if (!clientId || !clientSecret) {
    return { ok: false, accessToken: '', error: 'provider_not_configured' }
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  let res: Response
  try {
    res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (err) {
    return {
      ok: false,
      accessToken: '',
      error: `network:${(err as Error).message ?? 'unknown'}`.slice(0, 100),
    }
  }

  if (!res.ok) {
    return { ok: false, accessToken: '', error: `http_${res.status}` }
  }

  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; refresh_token?: string; expires_in?: number }
    | null
  if (!json?.access_token) {
    return { ok: false, accessToken: '', error: 'no_access_token_in_response' }
  }
  return {
    ok: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
  }
}

/** Test-only — exported so unit tests can patch crypto behavior cleanly. */
export const __internals = { refreshAccessToken }
