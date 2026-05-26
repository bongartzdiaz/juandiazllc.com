/* GET /api/admin/features/impact/[key]
   ──────────────────────────────────────────────────────────────────
   Returns the impact count for one feature in the caller's org, used
   by the client-admin confirm dialog before disabling.

   Auth: requireRole(['admin']) — org-admin can read their OWN impact.
   Distinct from /api/admin/orgs/[orgId]/features which is super-admin
   only (cross-org).

   PR-4. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { FEATURES, type FeatureKey } from '@/lib/philly/features'
import { getDisableImpact } from '@/lib/philly/features/impact-warnings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ key: string }> }

const ALL_KEYS: ReadonlySet<FeatureKey> = new Set(
  Object.values(FEATURES).map(f => f.key) as FeatureKey[],
)

function isFeatureKey(s: string): s is FeatureKey {
  return (ALL_KEYS as ReadonlySet<string>).has(s)
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const { key } = await ctx.params
  if (!isFeatureKey(key)) return jsonError('Unknown feature key', 400)

  const prisma = getAuthPrisma()
  const impact = await getDisableImpact(prisma, scope.organizationId, key)

  return NextResponse.json({ data: impact })
}
