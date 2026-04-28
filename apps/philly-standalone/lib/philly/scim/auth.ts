/* ---------------------------------------------------------------
   SCIM 2.0 — bearer token authentication
   ---------------------------------------------------------------
   Each customer organisation issues a long-lived bearer token via
   the admin Settings → API Keys page (with scope `scim:users`).
   The token is stored hashed (SHA-256 of the raw value) on the
   ApiKey row; only the prefix is shown after creation.

   Inbound SCIM requests must carry `Authorization: Bearer <token>`.
   We hash the candidate token, look up the matching ApiKey row,
   verify the org matches, the scope grants `scim:users`, and the
   key isn't expired. Returns the scope so call-sites can use the
   organizationId for tenant-scoped queries.

   Wraps the SCIM-shaped error response per RFC 7644 §3.12 when
   anything fails so IdPs get the structured response they expect.
   --------------------------------------------------------------- */

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { scimError } from './schemas'

export interface ScimAuthScope {
  apiKeyId: string
  organizationId: string
  scopes: string[]
}

const REQUIRED_SCOPE = 'scim:users'

export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function authScimRequest(
  req: NextRequest,
): Promise<ScimAuthScope | NextResponse> {
  const auth = req.headers.get('authorization')
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
    return scimError(401, 'Missing or invalid Authorization header. Expect "Bearer <token>".')
  }
  const token = auth.slice('Bearer '.length).trim()
  if (!token) return scimError(401, 'Empty bearer token')

  const prisma = getAuthPrisma()
  const keyHash = hashApiKey(token)
  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      organizationId: true,
      scopes: true,
      expiresAt: true,
    },
  })
  if (!key) return scimError(401, 'Token not recognised')
  if (key.expiresAt && key.expiresAt.getTime() < Date.now()) {
    return scimError(401, 'Token has expired')
  }
  const scopes = parseScopes(key.scopes)
  if (!scopes.includes(REQUIRED_SCOPE)) {
    return scimError(403, `Token does not grant the "${REQUIRED_SCOPE}" scope`)
  }

  // Best-effort lastUsedAt touch (don't block on it).
  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* swallow */ })

  return { apiKeyId: key.id, organizationId: key.organizationId, scopes }
}

function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (Array.isArray(v)) return v.filter((s): s is string => typeof s === 'string')
  } catch {
    /* not JSON — fall through */
  }
  // Fallback: comma- or space-separated string.
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
}
