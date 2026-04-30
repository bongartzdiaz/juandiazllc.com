/* POST /api/contacts/[id]/ai-attributes
   Re-generates the Attio-style AI attributes (industry, ICP fit, summary)
   for a single contact. Rate-limited since each call hits the LLM. */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { runAndPersistContactAttributes } from '@/lib/philly/ai/contact-attributes'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated } from '@/lib/philly/realtime/publish'
import { SLO, withSpan } from '@/lib/philly/observability'
import { isFeatureEnabled, FEATURES } from '@/lib/philly/features'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Haiku calls typically return in 2-4s; give the route headroom.
export const maxDuration = 30

type RouteCtx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // LLM calls cost money — 10/min per user mirrors the ai/score route.
  const limited = enforceRateLimit(`ai:contact-attr:${scope.userId}`, {
    capacity: 10,
    refillPerSec: 0.166,
  })
  if (limited) return limited

  const { id } = await ctx.params

  const prisma = getAuthPrisma()

  // Kill-switch — admins can disable AI enrichment org-wide via
  // /api/admin/features without redeploying.
  if (!(await isFeatureEnabled(prisma, scope.organizationId, FEATURES.AI_CONTACT_ENRICHMENT.key))) {
    return jsonError('AI contact enrichment is disabled for this organization', 403)
  }

  // Quick ownership check so a 404 comes before the model call.
  const exists = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!exists) return jsonError('Contact not found', 404)

  return withSpan(
    {
      name: 'ai.contact-attributes',
      slo: SLO.AI_ACTION,
      op: 'ai.generate',
      attrs: { organizationId: scope.organizationId, contactId: id },
    },
    async () => {
      const result = await runAndPersistContactAttributes({
        contactId: id,
        organizationId: scope.organizationId,
      })

      if (!result.ok) {
        await logAudit({
          scope,
          action: 'update',
          entity: 'contact',
          entityId: id,
          changes: {
            aiAttributesStatus: { old: 'pending', new: 'error' },
            aiAttributesError: { old: null, new: result.error ?? 'unknown' },
          },
        })
        return NextResponse.json(
          { error: result.error ?? 'Failed to generate attributes' },
          { status: 502 },
        )
      }

      await logAudit({
        scope,
        action: 'update',
        entity: 'contact',
        entityId: id,
        changes: {
          aiAttributes: { old: null, new: 'regenerated' },
        },
      })
      publishEntityUpdated(scope.organizationId, 'contact', id, scope.userId)

      return NextResponse.json({ data: result.data })
    },
  )
}
