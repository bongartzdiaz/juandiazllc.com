/* PATCH /api/admin/scim-groups/[id]
   ───────────────────────────────────────────────────────────
   Operator-only update of role + dashboardSections on a single
   ScimGroup row. When role/sections change AND the group has
   members, every existing member's per-org Membership is
   upserted to the new values — same as if they'd just been
   added by an IdP PATCH.

   Bundle BX. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { SECTIONS } from '@/lib/philly/sections'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const VALID_SECTIONS = new Set(SECTIONS.map((s) => s.slug))

const updateSchema = z.object({
  // null clears the role mapping; non-null restricts to the
  // platform's three roles.
  role: z.enum(['admin', 'manager', 'viewer']).nullable().optional(),
  // null clears the per-org section override (members fall back to
  // their User.dashboardSections / global default). Array members
  // must all be valid section slugs.
  dashboardSections: z.array(z.string()).nullable().optional()
    .refine(
      (arr) => arr == null || arr.every((s) => VALID_SECTIONS.has(s)),
      { message: 'dashboardSections contains an unknown section slug' },
    ),
})

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`admin.scim-groups.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.scimGroup.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, displayName: true, role: true, dashboardSections: true },
  })
  if (!existing) return jsonError('Group not found', 404)

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }
  const { role, dashboardSections } = parsed.data

  // Build the update + skip writes for fields the client omitted.
  const data: Record<string, unknown> = {}
  if (role !== undefined) data.role = role
  if (dashboardSections !== undefined) {
    data.dashboardSections = dashboardSections === null ? null : dashboardSections
  }
  if (Object.keys(data).length === 0) {
    return jsonError('Nothing to update', 400)
  }

  const updated = await prisma.scimGroup.update({
    where: { id },
    data,
    select: { id: true, displayName: true, role: true, dashboardSections: true },
  })

  // Apply the new mapping to every existing member. If both the new
  // role and sections are null, this is a no-op (empty data object on
  // the upsert below).
  const memberRows = await prisma.scimGroupMembership.findMany({
    where: { groupId: id }, select: { userId: true },
  })
  const memberCount = memberRows.length
  if (memberCount > 0 && (updated.role || updated.dashboardSections !== null)) {
    for (const m of memberRows) {
      await prisma.membership.upsert({
        where: { userId_organizationId: { userId: m.userId, organizationId: scope.organizationId } },
        update: {
          ...(updated.role ? { role: updated.role } : {}),
          ...(updated.dashboardSections !== null ? { dashboardSections: updated.dashboardSections as never } : {}),
        },
        create: {
          userId: m.userId,
          organizationId: scope.organizationId,
          role: updated.role ?? 'viewer',
          ...(updated.dashboardSections !== null ? { dashboardSections: updated.dashboardSections as never } : {}),
        },
      }).catch(() => { /* best-effort */ })
    }
  }

  await logAudit({
    scope,
    action: 'update',
    entity: 'scimGroup',
    entityId: id,
    changes: {
      ...(role !== undefined ? { role: { old: existing.role, new: updated.role } } : {}),
      ...(dashboardSections !== undefined
        ? { dashboardSections: { old: existing.dashboardSections, new: updated.dashboardSections } }
        : {}),
      membersAffected: { old: null, new: memberCount },
    },
  }).catch(() => { /* best-effort */ })

  return NextResponse.json({
    data: {
      id: updated.id,
      displayName: updated.displayName,
      role: updated.role,
      dashboardSections: updated.dashboardSections,
      membersUpdated: memberCount,
    },
  })
}
