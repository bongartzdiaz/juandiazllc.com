/* ---------------------------------------------------------------
   API key generation + verification for the public v1 API.
   Format:  pk_<24hex>   (prefix + 24 chars random hex)
   Storage: keyHash = SHA-256(rawKey). Raw key only returned on create.
   --------------------------------------------------------------- */

import crypto from 'crypto'
import { getAuthPrisma } from '@/lib/philly/auth'

export interface ApiKeyScope {
  organizationId: string
  apiKeyId: string
  permissions: 'read' | 'write' | 'admin'
}

const KEY_PREFIX = 'pk_'

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const body = crypto.randomBytes(24).toString('hex') // 48 chars
  const raw = KEY_PREFIX + body
  // codeql[js/insufficient-password-hash] — fast hash is correct for
  // 192-bit random API keys (Stripe/GitHub pattern). Bcrypt/argon2 is
  // for low-entropy human passwords; brute-forcing a 192-bit secret
  // is computationally infeasible regardless of hash speed.
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return { raw, hash, prefix: raw.slice(0, 12) }
}

function hashKey(raw: string): string {
  // codeql[js/insufficient-password-hash] — see generateApiKey above.
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** Validate an API key from Authorization header or X-Api-Key header. */
export async function validateApiKey(rawHeader: string | null): Promise<ApiKeyScope | null> {
  if (!rawHeader) return null
  const raw = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim()
  if (!raw.startsWith(KEY_PREFIX)) return null

  const prisma = getAuthPrisma()
  const hash = hashKey(raw)
  const row = await prisma.apiKey.findUnique({ where: { keyHash: hash } })
  if (!row) return null
  if (row.expiresAt && row.expiresAt < new Date()) return null

  // Fire-and-forget lastUsedAt update
  prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return {
    organizationId: row.organizationId,
    apiKeyId: row.id,
    permissions: (row.permissions as 'read' | 'write' | 'admin') ?? 'read',
  }
}

export function canWrite(scope: ApiKeyScope): boolean {
  return scope.permissions === 'write' || scope.permissions === 'admin'
}

export function canAdmin(scope: ApiKeyScope): boolean {
  return scope.permissions === 'admin'
}
