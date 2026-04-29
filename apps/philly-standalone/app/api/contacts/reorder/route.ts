/* POST /api/contacts/reorder — set explicit displayOrder for one or
   more contacts. Used by Bundle AG drag-drop reorder.

   Body: { ids: string[] }
   Each id is assigned displayOrder = idx + 1 (lower = higher in list).
   Atomic per-call: we run a single transaction so a partial failure
   doesn't leave the org's contacts in a half-ordered state. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_REORDER = 500

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contacts:reorder:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: { ids?: string[] }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return jsonError('ids must be a non-empty array', 400)
  }
  if (body.ids.length > MAX_REORDER) {
    return jsonError(`Maximum ${MAX_REORDER} contacts per reorder call`, 400)
  }
  // Reject duplicates so we never assign the same order to two ids.
  const unique = new Set(body.ids)
  if (unique.size !== body.ids.length) {
    return jsonError('ids must be unique', 400)
  }

  const prisma = getAuthPrisma()

  // Verify every id belongs to the caller's org. Anything missing
  // is silently dropped with a hint in the response — partial
  // success is better than rejecting the whole batch when one
  // contact was deleted in another tab.
  const owned = await prisma.contact.findMany({
    where: { id: { in: body.ids }, organizationId: scope.organizationId },
    select: { id: true },
  })
  const ownedIds = new Set(owned.map((c: { id: string }) => c.id))
  const orderedOwned = body.ids.filter((id) => ownedIds.has(id))

  await prisma.$transaction(
    orderedOwned.map((id, idx) =>
      prisma.contact.update({
        where: { id },
        data: { displayOrder: BigInt(idx + 1) },
      }),
    ),
  )

  await logAudit({
    scope,
    action: 'update',
    entity: 'contact',
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
