/* POST /api/deals/reorder — set explicit displayOrder on a list of
   deals. Used by Bundle AL drag-drop reorder on the deals list view.

   Body: { ids: string[] }
   Each id is assigned displayOrder = idx + 1 (lower = higher in the
   list). Atomic per-call: a single $transaction so a partial failure
   leaves the chain consistent. Capped at 500 ids/call. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { reorderBody } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_REORDER = 500

export async function POST(req: NextRequest) {
  const scope = await requireSection('deals', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`deals:reorder:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, reorderBody(MAX_REORDER))
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()

  // Tenancy: deals are scoped through their pipeline, not directly via
  // organizationId. Drop ids that don't belong to a pipeline in the
  // caller's org so a partial-success path stays consistent.
  const owned = await prisma.deal.findMany({
    where: {
      id: { in: body.ids },
      pipeline: { organizationId: scope.organizationId },
    },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((d: { id: string }) => d.id))
  const orderedOwned = body.ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedOwned.map((id, idx) =>
      prisma.deal.update({
        where: { id },
        data: { displayOrder: BigInt(idx + 1) },
      }),
    ),
  )

  await logAudit({
    scope,
    action: 'update',
    entity: 'deal',
    entityId: null,
    changes: { reorder: { old: null, new: { count: orderedOwned.length } } },
  }).catch(() => { /* best-effort */ })

  return NextResponse.json({
    data: {
      reordered: orderedOwned.length,
      skipped: body.ids.length - orderedOwned.length,
    },
  })
}
