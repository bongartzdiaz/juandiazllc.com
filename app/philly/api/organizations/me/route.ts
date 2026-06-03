import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { updateOrgDetailsSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logAudit } from '@/lib/philly/audit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * PATCH /api/organizations/me
 *   Body: { name, industry?, timeZone, defaultCurrency }
 *
 * Updates the caller's own org. Admin-only — picking the wrong vertical
 * cascades through every nav decision in the app, so we keep this
 * tightly gated.
 */
export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`org-me:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, updateOrgDetailsSchema)
  if (!parsed.success) return parsed.response

  const prisma = getAuthPrisma()

  const before = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { name: true, industry: true, timeZone: true, defaultCurrency: true },
  })

  const updates: Record<string, unknown> = {
    name: parsed.data.name,
    timeZone: parsed.data.timeZone,
    defaultCurrency: parsed.data.defaultCurrency,
  }
  if (parsed.data.industry) updates.industry = parsed.data.industry

  const updated = await prisma.organization.update({
    where: { id: scope.organizationId },
    data: updates,
    select: {
      id: true, name: true, industry: true, timeZone: true,
      defaultCurrency: true, slug: true,
    },
  })

  // Audit only the actually-changed fields
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  if (before?.name !== updated.name) changes.name = { old: before?.name, new: updated.name }
  if (parsed.data.industry && before?.industry !== updated.industry) {
    changes.industry = { old: before?.industry, new: updated.industry }
  }
  if (before?.timeZone !== updated.timeZone) changes.timeZone = { old: before?.timeZone, new: updated.timeZone }
  if (before?.defaultCurrency !== updated.defaultCurrency) {
    changes.defaultCurrency = { old: before?.defaultCurrency, new: updated.defaultCurrency }
  }

  if (Object.keys(changes).length > 0) {
    await logAudit({
      scope,
      action: 'update',
      entity: 'organization',
      entityId: scope.organizationId,
      changes,
    }).catch(() => { /* best-effort */ })
  }

  logger.info('[org-me] updated', {
    orgId: scope.organizationId,
    by: scope.userId,
    fields: Object.keys(changes),
  })

  return NextResponse.json({ data: updated })
}
