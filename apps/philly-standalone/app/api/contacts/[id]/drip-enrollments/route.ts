/* GET /api/contacts/[id]/drip-enrollments
   ──────────────────────────────────────────────────────────────────
   Lists active + recent drip enrollments for a contact. Used by the
   Klant Master Profile → Drip tab.

   Response:
     { data: Array<{
         id, campaignName, status, lastStepIndex, totalSteps,
         nextDueAt, lastDeliveredAt, enrolledAt
     }> }

   Security: org-scoped via Contact ownership check (matching the
   pattern in app/api/contacts/[id]/notes/route.ts). A user from a
   different org calling this endpoint with a known contact-id gets
   404, never the data. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('contacts')
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  // First confirm the contact belongs to this org — without this, a
  // user could enumerate enrollments by guessing contact-ids.
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const enrollments = await prisma.dripEnrollment.findMany({
    where: { contactId: id, organizationId: scope.organizationId },
    include: {
      campaign: { select: { id: true, name: true, stepsJson: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Count steps per campaign — stepsJson is a JSON array string.
  const data = enrollments.map(e => {
    let totalSteps = 0
    try {
      const arr = JSON.parse(e.campaign.stepsJson ?? '[]')
      if (Array.isArray(arr)) totalSteps = arr.length
    } catch { /* leave 0 */ }
    return {
      id: e.id,
      campaignId: e.campaignId,
      campaignName: e.campaign.name,
      status: e.status,
      lastStepIndex: e.lastStepIndex,
      totalSteps,
      nextDueAt: e.nextDueAt?.toISOString() ?? null,
      lastDeliveredAt: e.lastDeliveredAt?.toISOString() ?? null,
      enrolledAt: e.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ data })
}
