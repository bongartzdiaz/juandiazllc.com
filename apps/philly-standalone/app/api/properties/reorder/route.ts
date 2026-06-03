/* POST /api/properties/reorder — set explicit displayOrder for one
   or more properties. Bundle BR drag-drop reorder.

   Body: { ids: string[] }
   Each id is assigned displayOrder = idx + 1 (lower = higher in list).
   Atomic per-call: single transaction so a partial failure doesn't
   leave the org's properties in a half-ordered state.

   Mirrors /api/contacts/reorder (Bundle AG) and /api/deals/reorder
   (Bundle AL). */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { reorderBody } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_REORDER = 500

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`properties:reorder:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, reorderBody(MAX_REORDER))
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()

  // Tenancy check + drop unknown ids silently so a deleted-in-another-
  // tab property doesn't fail the whole batch.
  const owned = await prisma.property.findMany({
    where: { id: { in: body.ids }, organizationId: scope.organizationId },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((p: { id: string }) => p.id))
  const orderedOwned = body.ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedOwned.map((id, idx) =>
      prisma.property.update({
        where: { id },
        data: { displayOrder: BigInt(idx + 1) },
      }),
    ),
  )

  await logAudit({
    scope,
    action: 'update',
    entity: 'property',
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
