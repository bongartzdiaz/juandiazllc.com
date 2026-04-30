/* ---------------------------------------------------------------
   Feature flags / kill-switches — Philly CRM
   ---------------------------------------------------------------
   Per-org runtime toggles that don't require a redeploy. Resolution
   order:
     1. Org-specific FeatureFlag row → use its `enabled` value
     2. Global default FeatureFlag row (organizationId = NULL) → use it
     3. FEATURES[key].enabledByDefault from the const below

   In-memory cache with 60s TTL keeps hot paths cheap. The cache is
   per-process (no Redis dependency); flag changes propagate within
   60s of the write. Bust the cache early with `bustFeatureCache()`
   from the admin route after a flag is updated.

   Usage:
     if (!await isFeatureEnabled(prisma, scope.organizationId, FEATURES.AI_CONTACT_ENRICHMENT)) {
       return jsonError('Feature disabled', 403)
     }
   --------------------------------------------------------------- */

import type { PrismaClient } from '@prisma/client'

/** Stable feature keys. Add a new entry here when wiring a new flag.
 *  Keys are kebab-case strings; the const value is the canonical id
 *  written to FeatureFlag.key. Don't rename keys without a migration. */
export const FEATURES = {
  /** Claude Haiku contact enrichment (`/api/contacts/[id]/ai-attributes`). */
  AI_CONTACT_ENRICHMENT: {
    key: 'ai-contact-enrichment',
    enabledByDefault: true,
    description:
      'AI-derived industry / ICP-fit / summary fields on Contact rows. Disable to stop the model running on contact create + the manual Regenerate button.',
  },
  /** AI lead-scoring (`/api/ai/score`). */
  AI_DEAL_SCORING: {
    key: 'ai-deal-scoring',
    enabledByDefault: true,
    description: 'AI-derived lead-score numeric on Contact rows.',
  },
  /** Outbound webhooks fan-out (audit-log mirroring, integrations). */
  WEBHOOKS: {
    key: 'webhooks',
    enabledByDefault: true,
    description: 'Outbound webhook delivery. Disable to silence all integrations during a migration window.',
  },
  /** SCIM provisioning endpoints. */
  SCIM: {
    key: 'scim',
    enabledByDefault: true,
    description: 'SCIM 2.0 user-provisioning endpoints. Disable to halt IdP sync without rotating tokens.',
  },
  /** Drip-campaign sender (outbound email/SMS at scheduled times). */
  DRIP_CAMPAIGNS: {
    key: 'drip-campaigns',
    enabledByDefault: true,
    description: 'Scheduled outbound email + SMS dispatch. Disable to pause every drip campaign without editing each one.',
  },
  /** Realtime publish (Supabase channel fan-out). */
  REALTIME: {
    key: 'realtime',
    enabledByDefault: true,
    description: 'Supabase realtime channel fan-out. Disable to bypass realtime broadcasts during incidents.',
  },
} as const

export type FeatureDef = (typeof FEATURES)[keyof typeof FEATURES]
export type FeatureKey = FeatureDef['key']

/** Return the catalogue as a plain array (for admin UI listing). */
export function listFeatures(): Array<{ key: FeatureKey; enabledByDefault: boolean; description: string }> {
  return Object.values(FEATURES).map(f => ({
    key: f.key,
    enabledByDefault: f.enabledByDefault,
    description: f.description,
  }))
}

/* ---------- Cache ---------- */

interface CacheEntry {
  value: boolean
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

function cacheKey(orgId: string | null | undefined, key: FeatureKey): string {
  return `${orgId ?? 'global'}::${key}`
}

/** Bust every cache entry for a (org, key) pair. Call after a write. */
export function bustFeatureCache(orgId: string | null | undefined, key?: FeatureKey): void {
  if (key) {
    cache.delete(cacheKey(orgId, key))
    cache.delete(cacheKey(null, key)) // global default may have shifted
    return
  }
  // Bust everything for the org (and the global slot — cheap).
  for (const k of cache.keys()) {
    if (k.startsWith(`${orgId ?? 'global'}::`) || k.startsWith('global::')) {
      cache.delete(k)
    }
  }
}

/** Bust the entire cache. Useful in tests. */
export function clearFeatureCache(): void {
  cache.clear()
}

/* ---------- Reads ---------- */

/**
 * Whether a feature is enabled for the given org. Resolves through
 * the cache, then the org-specific row, then the global row, then
 * the code-side default.
 */
export async function isFeatureEnabled(
  prisma: PrismaClient,
  orgId: string | null | undefined,
  key: FeatureKey,
): Promise<boolean> {
  const def = Object.values(FEATURES).find(f => f.key === key)
  if (!def) {
    // Unknown key — fail closed. Better to disable than to silently
    // ignore a typo'd feature ID.
    return false
  }

  const ck = cacheKey(orgId, key)
  const hit = cache.get(ck)
  const now = Date.now()
  if (hit && hit.expiresAt > now) return hit.value

  let resolved: boolean = def.enabledByDefault

  // Single query that returns both the org-specific row (if any) and
  // the global default — let the DB pick once.
  type Row = { organizationId: string | null; enabled: boolean }
  const rows = (await prisma.featureFlag.findMany({
    where: {
      key,
      OR: [{ organizationId: null }, { organizationId: orgId ?? '__no_org__' }],
    },
    select: { organizationId: true, enabled: true },
  })) as Row[]

  const orgRow = orgId ? rows.find(r => r.organizationId === orgId) : null
  const globalRow = rows.find(r => r.organizationId === null)

  if (orgRow) resolved = orgRow.enabled
  else if (globalRow) resolved = globalRow.enabled

  cache.set(ck, { value: resolved, expiresAt: now + CACHE_TTL_MS })
  return resolved
}

/** Internal — sync helper for places that need a fast best-effort
 *  read (e.g. inside cold paths where you don't want to await). */
export function readCachedFeature(
  orgId: string | null | undefined,
  key: FeatureKey,
): boolean | null {
  const hit = cache.get(cacheKey(orgId, key))
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    cache.delete(cacheKey(orgId, key))
    return null
  }
  return hit.value
}

/* ---------- Writes ---------- */

export interface SetFeatureInput {
  prisma: PrismaClient
  organizationId: string | null
  key: FeatureKey
  enabled: boolean
  description?: string | null
}

/**
 * Upsert a feature flag. Pass organizationId=null to set the global
 * default. The caller is responsible for the auth gate (admin only)
 * + audit-logging the change.
 */
export async function setFeatureEnabled(input: SetFeatureInput): Promise<void> {
  const { prisma, organizationId, key, enabled, description } = input
  // Validate the key — fail closed on typos.
  const def = Object.values(FEATURES).find(f => f.key === key)
  if (!def) throw new Error(`Unknown feature key: ${key}`)

  await prisma.featureFlag.upsert({
    where: {
      organizationId_key: {
        organizationId: organizationId as string,
        key,
      },
    },
    update: { enabled, description: description ?? def.description },
    create: {
      organizationId,
      key,
      enabled,
      description: description ?? def.description,
    },
  })

  bustFeatureCache(organizationId, key)
}

/**
 * Delete an org-specific override so the org falls back to the
 * global default (or the code-side default). Pass organizationId=null
 * to delete the global default.
 */
export async function clearFeatureOverride(
  prisma: PrismaClient,
  organizationId: string | null,
  key: FeatureKey,
): Promise<void> {
  const def = Object.values(FEATURES).find(f => f.key === key)
  if (!def) throw new Error(`Unknown feature key: ${key}`)

  await prisma.featureFlag.deleteMany({
    where: { organizationId, key },
  })

  bustFeatureCache(organizationId, key)
}
