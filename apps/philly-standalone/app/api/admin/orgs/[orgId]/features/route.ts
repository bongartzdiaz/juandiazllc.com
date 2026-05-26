/* GET /api/admin/orgs/[orgId]/features
   ──────────────────────────────────────────────────────────────────
   Super-admin batch read of every FEATURES key resolved against one org.
   The matrix-style UI at /admin/orgs/[orgId]/features needs one fetch
   returning the resolved {enabled, source} for every feature + the
   override-row metadata (if any). Fan-out per-feature requests would
   be N × ~5ms — this batches it into one Promise.all.

   PR-3/4. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSuperAdmin, jsonError } from '@/lib/philly/auth-helpers'
import { FEATURES, type FeatureKey } from '@/lib/philly/features'
import { isFeatureEnabledForOrg } from '@/lib/philly/features/adapter'
import type { SuperAdminOverride } from '@/lib/philly/features/resolve'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ orgId: string }> }

function normalizeOverride(value: string | undefined): SuperAdminOverride {
  if (value === 'FORCED_ON' || value === 'FORCED_OFF') return value
  return 'INHERIT'
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSuperAdmin()
  if (scope instanceof NextResponse) return scope

  const { orgId } = await ctx.params
  const prisma = getAuthPrisma()

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true, subscription: { select: { plan: true } } },
  })
  if (!org) return jsonError('Organization not found', 404)

  // Load all OrgFeatureOverride rows for this org once — then loop the
  // FEATURES catalog and resolve each. This keeps the round-trip count
  // to (1 org lookup + N resolver calls + 1 overrides lookup) where N
  // is the FEATURES count (currently 6).
  const overrideRows = await prisma.orgFeatureOverride.findMany({
    where: { organizationId: orgId },
    select: {
      feature: true,
      state: true,
      reason: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  const overrideByKey = new Map(overrideRows.map(r => [r.feature, r]))

  const catalog = Object.values(FEATURES)

  const features = await Promise.all(
    catalog.map(async f => {
      const key = f.key as FeatureKey
      const resolved = await isFeatureEnabledForOrg(prisma, orgId, key)
      const override = overrideByKey.get(key) ?? null
      return {
        key,
        description: f.description,
        enabledByDefault: f.enabledByDefault,
        enabled: resolved.enabled,
        source: resolved.source,
        override: override
          ? {
              state: normalizeOverride(override.state),
              reason: override.reason,
              createdById: override.createdById,
              createdAt: override.createdAt,
              updatedAt: override.updatedAt,
            }
          : null,
      }
    }),
  )

  return NextResponse.json({
    data: {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.subscription?.plan ?? null,
      },
      features,
    },
  })
}
