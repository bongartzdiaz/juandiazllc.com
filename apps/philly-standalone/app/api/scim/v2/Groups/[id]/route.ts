/* GET    /api/scim/v2/Groups/[id] — fetch a single group
   PATCH  /api/scim/v2/Groups/[id] — partial update (RFC 7644 §3.5.2)
   PUT    /api/scim/v2/Groups/[id] — full replace (RFC 7644 §3.5.1)
   DELETE /api/scim/v2/Groups/[id] — delete

   Bundle BW. Member adds/removes flow through the existing
   ScimGroupMembership join. When the group has a non-null
   `role` / `dashboardSections`, members added via this group
   get their per-org Membership upserted to those values, which
   is how IdP-Group → Platform-role mapping works without per-IdP
   claim parsing. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { authScimRequest, scimGate } from '@/lib/philly/scim/auth'
import {
  scimJson, scimError, isValidPatchRequest,
} from '@/lib/philly/scim/schemas'
import {
  parseScimGroupInput, groupToScim, parseGroupPatchOp,
  type MemberDiff,
} from '@/lib/philly/scim/group-mapping'
import { logAudit } from '@/lib/philly/audit'
import type { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const SELECT = {
  id: true,
  organizationId: true,
  scimExternalId: true,
  displayName: true,
  role: true,
  dashboardSections: true,
  createdAt: true,
  updatedAt: true,
  members: { include: { user: { select: { id: true, email: true } } } },
} as const

async function emit(group: {
  id: string
  organizationId: string
  scimExternalId: string | null
  displayName: string
  createdAt: Date
  updatedAt: Date
  members: Array<{ user: { id: string; email: string } }>
}, baseUrl: string) {
  return groupToScim({
    id: group.id,
    organizationId: group.organizationId,
    scimExternalId: group.scimExternalId,
    displayName: group.displayName,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.members.map((m) => ({ id: m.user.id, email: m.user.email })),
  }, baseUrl)
}

/** When a user is added to a group with a role/sections set, upsert
 *  their Membership in this org to those values. Removing a member
 *  intentionally does NOT revert the role — RFC 7644 doesn't say
 *  what should happen and silently demoting users is dangerous. */
async function applyRoleMapping(
  prisma: PrismaClient,
  group: { id: string; organizationId: string; role: string | null; dashboardSections: unknown },
  addedUserIds: string[],
): Promise<void> {
  if (!group.role && !group.dashboardSections) return
  for (const userId of addedUserIds) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: group.organizationId } },
      update: {
        ...(group.role ? { role: group.role } : {}),
        ...(group.dashboardSections !== null ? { dashboardSections: group.dashboardSections as never } : {}),
      },
      create: {
        userId,
        organizationId: group.organizationId,
        role: group.role ?? 'viewer',
        ...(group.dashboardSections !== null ? { dashboardSections: group.dashboardSections as never } : {}),
      },
    }).catch(() => { /* best-effort — bad userId already filtered upstream */ })
  }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  const group = await prisma.scimGroup.findFirst({
    where: {
      organizationId: auth.organizationId,
      OR: [{ id }, { scimExternalId: id }],
    },
    select: SELECT,
  })
  if (!group) return scimError(404, `Group ${id} not found`)

  const url = new URL(req.url)
  return scimJson(await emit(group, `${url.origin}/api/scim/v2`))
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  let body: unknown
  try { body = await req.json() } catch { return scimError(400, 'Invalid JSON', 'invalidSyntax') }
  let parsed
  try { parsed = parseScimGroupInput(body) } catch (err) {
    return scimError(400, err instanceof Error ? err.message : 'Invalid SCIM Group', 'invalidValue')
  }

  const existing = await prisma.scimGroup.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, displayName: true, role: true, dashboardSections: true },
  })
  if (!existing) return scimError(404, `Group ${id} not found`)

  // displayName-uniqueness recheck if it changed.
  if (parsed.displayName !== existing.displayName) {
    const clash = await prisma.scimGroup.findFirst({
      where: { organizationId: auth.organizationId, displayName: parsed.displayName, NOT: { id } },
      select: { id: true },
    })
    if (clash) return scimError(409, `displayName "${parsed.displayName}" already in use`, 'uniqueness')
  }

  // Bundle CM — distinguish "members field absent" (undefined,
  // leave membership alone) from "members: []" (explicit clear).
  // RFC 7644 PUT replaces the resource — but Okta is known to PUT
  // a renamed group without re-sending members, and treating that
  // as "clear all members" mass-unenrolls the group.
  const replaceMembers = parsed.memberIds !== undefined
  const memberRows = replaceMembers && parsed.memberIds!.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: parsed.memberIds! }, organizationId: auth.organizationId },
        select: { id: true },
      })
    : []
  const valid = new Set(memberRows.map((u) => u.id))

  // Snapshot the existing memberships ONLY when we plan to replace,
  // so the role-mapping diff can compute "newly added" correctly.
  const before = replaceMembers
    ? await prisma.scimGroupMembership.findMany({
        where: { groupId: id }, select: { userId: true },
      })
    : []
  const beforeSet = new Set(before.map((m) => m.userId))
  const addedIds = replaceMembers ? [...valid].filter((u) => !beforeSet.has(u)) : []

  // Group-attribute update (always). Membership replace only when
  // the IdP explicitly sent a members array.
  await prisma.$transaction([
    ...(replaceMembers
      ? [prisma.scimGroupMembership.deleteMany({ where: { groupId: id } })]
      : []),
    prisma.scimGroup.update({
      where: { id },
      data: {
        displayName: parsed.displayName,
        // Bundle CC audit fix — PUT replaces, so explicit null
        // clears the column. parseScimGroupInput coerces missing
        // to null already.
        scimExternalId: parsed.externalId,
        ...(replaceMembers
          ? { members: { create: [...valid].map((userId) => ({ userId })) } }
          : {}),
      },
    }),
  ])

  if (replaceMembers) {
    await applyRoleMapping(prisma, { ...existing, organizationId: auth.organizationId }, addedIds)
  }

  const updated = await prisma.scimGroup.findUniqueOrThrow({
    where: { id }, select: SELECT,
  })

  await logAudit({
    scope: { userId: '_scim', organizationId: auth.organizationId, role: 'admin', email: '_scim', dashboardSections: null, mfaEnrolled: false },
    action: 'update',
    entity: 'scimGroup', entityId: id,
    changes: {
      displayName: { old: existing.displayName, new: parsed.displayName },
      // Bundle CM — only audit member changes when the PUT actually
      // replaced them; an absent members field is a no-op.
      ...(replaceMembers
        ? { memberCount: { old: beforeSet.size, new: valid.size } }
        : {}),
    },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  return scimJson(await emit(updated, `${url.origin}/api/scim/v2`))
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  let body: unknown
  try { body = await req.json() } catch { return scimError(400, 'Invalid JSON', 'invalidSyntax') }
  if (!isValidPatchRequest(body)) {
    return scimError(400, 'Body must be a SCIM PatchOp request', 'invalidSyntax')
  }

  const existing = await prisma.scimGroup.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, displayName: true, role: true, dashboardSections: true },
  })
  if (!existing) return scimError(404, `Group ${id} not found`)

  // Combine all ops into a single diff to apply atomically.
  const merged: MemberDiff = { add: [], remove: [] }
  for (const op of body.Operations) {
    const result = parseGroupPatchOp(op)
    if ('error' in result) {
      return scimError(400, result.error, 'invalidValue')
    }
    merged.add.push(...result.add)
    merged.remove.push(...result.remove)
    if (result.replace !== undefined) merged.replace = result.replace
    if (result.setDisplayName !== undefined) merged.setDisplayName = result.setDisplayName
    if (result.setExternalId !== undefined) merged.setExternalId = result.setExternalId
  }

  // displayName uniqueness check.
  if (merged.setDisplayName && merged.setDisplayName !== existing.displayName) {
    const clash = await prisma.scimGroup.findFirst({
      where: { organizationId: auth.organizationId, displayName: merged.setDisplayName, NOT: { id } },
      select: { id: true },
    })
    if (clash) return scimError(409, `displayName "${merged.setDisplayName}" already in use`, 'uniqueness')
  }

  // Validate every targeted user id belongs to the same org.
  const targetIds = new Set([...merged.add, ...(merged.replace ?? [])])
  const validRows = targetIds.size > 0
    ? await prisma.user.findMany({
        where: { id: { in: [...targetIds] }, organizationId: auth.organizationId },
        select: { id: true },
      })
    : []
  const valid = new Set(validRows.map((u) => u.id))
  // Drop unknown ids from add/replace silently.
  const validatedAdd = merged.add.filter((u) => valid.has(u))
  const validatedReplace = merged.replace?.filter((u) => valid.has(u))

  // Snapshot before for audit log + role-mapping diff.
  const before = await prisma.scimGroupMembership.findMany({
    where: { groupId: id }, select: { userId: true },
  })
  const beforeSet = new Set(before.map((m) => m.userId))

  await prisma.$transaction(async (tx) => {
    // Group-attribute updates first. Bundle CG — use !== undefined so
    // an explicit null on setExternalId clears the column (RFC 7644
    // PATCH-replace value:null semantics) instead of being dropped
    // by a falsy check.
    if (merged.setDisplayName !== undefined || merged.setExternalId !== undefined) {
      await tx.scimGroup.update({
        where: { id },
        data: {
          ...(merged.setDisplayName !== undefined ? { displayName: merged.setDisplayName } : {}),
          ...(merged.setExternalId !== undefined ? { scimExternalId: merged.setExternalId } : {}),
        },
      })
    }

    if (validatedReplace !== undefined) {
      await tx.scimGroupMembership.deleteMany({ where: { groupId: id } })
      if (validatedReplace.length > 0) {
        await tx.scimGroupMembership.createMany({
          data: validatedReplace.map((userId) => ({ groupId: id, userId })),
          skipDuplicates: true,
        })
      }
    } else {
      if (validatedAdd.length > 0) {
        await tx.scimGroupMembership.createMany({
          data: validatedAdd.map((userId) => ({ groupId: id, userId })),
          skipDuplicates: true,
        })
      }
      if (merged.remove.length > 0) {
        await tx.scimGroupMembership.deleteMany({
          where: { groupId: id, userId: { in: merged.remove } },
        })
      }
    }
  })

  // Compute final added-set for role mapping (covers both replace + add).
  const after = await prisma.scimGroupMembership.findMany({
    where: { groupId: id }, select: { userId: true },
  })
  const afterSet = new Set(after.map((m) => m.userId))
  const newlyAdded = [...afterSet].filter((u) => !beforeSet.has(u))
  await applyRoleMapping(prisma, { ...existing, organizationId: auth.organizationId }, newlyAdded)

  const updated = await prisma.scimGroup.findUniqueOrThrow({
    where: { id }, select: SELECT,
  })

  await logAudit({
    scope: { userId: '_scim', organizationId: auth.organizationId, role: 'admin', email: '_scim', dashboardSections: null, mfaEnrolled: false },
    action: 'update',
    entity: 'scimGroup', entityId: id,
    changes: {
      memberCount: { old: beforeSet.size, new: afterSet.size },
      ...(merged.setDisplayName ? { displayName: { old: existing.displayName, new: merged.setDisplayName } } : {}),
    },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  return scimJson(await emit(updated, `${url.origin}/api/scim/v2`))
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  const existing = await prisma.scimGroup.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, displayName: true },
  })
  if (!existing) return scimError(404, `Group ${id} not found`)

  // Cascade on the FK drops the join rows; the group row itself is
  // gone after this. We don't revert per-user roles (a deleted group
  // shouldn't auto-demote — the operator should make that call).
  await prisma.scimGroup.delete({ where: { id } })

  await logAudit({
    scope: { userId: '_scim', organizationId: auth.organizationId, role: 'admin', email: '_scim', dashboardSections: null, mfaEnrolled: false },
    action: 'delete',
    entity: 'scimGroup', entityId: id,
    changes: { displayName: { old: existing.displayName, new: null } },
  }).catch(() => { /* best-effort */ })

  return new NextResponse(null, { status: 204 })
}
