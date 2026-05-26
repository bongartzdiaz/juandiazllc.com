/* GET   /api/admin/features — list flags + their current state for the caller's org
   PATCH /api/admin/features — toggle a flag

   Per-org kill-switches. Resolution + cache live in
   `lib/philly/features.ts`. Only admins can read or write. Every
   change is audit-logged + rate-limited. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import {
  FEATURES,
  isFeatureEnabled,
  setFeatureEnabled,
  clearFeatureOverride,
  listFeatures,
  type FeatureKey,
} from '@/lib/philly/features'
import { isFeatureEnabledForOrg } from '@/lib/philly/features/adapter'
import type { SuperAdminOverride } from '@/lib/philly/features/resolve'
import { z } from 'zod'

function normalizeOverride(value: string | undefined): SuperAdminOverride {
  if (value === 'FORCED_ON' || value === 'FORCED_OFF') return value
  return 'INHERIT'
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALL_KEYS = Object.values(FEATURES).map(f => f.key) as readonly string[]

const patchSchema = z.object({
  key: z.string().refine(k => ALL_KEYS.includes(k), { message: 'Unknown feature key' }),
  // null clears the org override (falls back to global default).
  enabled: z.boolean().nullable(),
})

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const catalogue = listFeatures()

  // PR-4: extend the per-feature response to include the resolved
  // SOURCE (8-variant ResolveReason) and any super-admin OVERRIDE
  // row for this org. The client-admin UI uses `source` to decide
  // whether to render a toggle (in-plan + no super-admin override),
  // a read-only "Set by support" lock (super-admin override), or an
  // upgrade CTA (plan-not-included).
  const overrideRows = await prisma.orgFeatureOverride.findMany({
    where: { organizationId: scope.organizationId },
    select: { feature: true, state: true, reason: true },
  })
  const overrideByKey = new Map(overrideRows.map(r => [r.feature, r]))

  const states = await Promise.all(
    catalogue.map(async f => {
      const key = f.key as FeatureKey
      const resolved = await isFeatureEnabledForOrg(prisma, scope.organizationId, key)
      const override = overrideByKey.get(key)
      return {
        key,
        description: f.description,
        enabledByDefault: f.enabledByDefault,
        enabled: resolved.enabled,
        source: resolved.source,
        // Client-admin sees the OVERRIDE STATE + REASON so the read-only
        // lock can render "Set by support: <reason>". The createdById /
        // createdAt are super-admin metadata — NOT exposed at this
        // level (client doesn't need to know which super-admin acted).
        override: override
          ? {
              state: normalizeOverride(override.state),
              reason: override.reason,
            }
          : null,
      }
    }),
  )

  return NextResponse.json({ data: states })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`admin.features.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)

  const { key, enabled } = parsed.data
  const prisma = getAuthPrisma()
  const featureKey = key as FeatureKey

  const previous = await isFeatureEnabled(prisma, scope.organizationId, featureKey)

  if (enabled === null) {
    await clearFeatureOverride(prisma, scope.organizationId, featureKey)
  } else {
    await setFeatureEnabled({
      prisma,
      organizationId: scope.organizationId,
      key: featureKey,
      enabled,
    })
  }

  const next = await isFeatureEnabled(prisma, scope.organizationId, featureKey)

  await logAudit({
    scope,
    action: 'update',
    entity: 'featureFlag',
    entityId: featureKey,
    changes: { enabled: { old: previous, new: next } },
  })

  return NextResponse.json({ data: { key: featureKey, enabled: next } })
}
