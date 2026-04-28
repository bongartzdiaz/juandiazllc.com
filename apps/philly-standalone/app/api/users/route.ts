/* ---------------------------------------------------------------
   /api/users — admin user management.
   - GET   : list users in the caller's organization
   - POST  : admin creates a new user (role + section allow-list) and
             sends a Supabase invite email so the invitee can set
             their own password via the brand /login flow
   - PATCH : update a user's role and/or dashboardSections (admin only)

   Notes:
   - Creation in MariaDB seeds the Philly row with the same
     `__supabase_auth__` sentinel passwordHash that `resolvePhillyUser`
     uses during auto-provisioning. When the invitee first signs in,
     `resolvePhillyUser` finds the pre-seeded row by email and returns
     it unchanged — so the role and section allow-list the admin set
     here is what the invitee lands on.
   - `null` dashboardSections on POST/PATCH = full access.
     Empty array = strict lock to zero sections (useful only together
     with a role change; otherwise the user would see nothing).
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logAudit } from '@/lib/philly/audit'
import { createServiceClient } from '@/lib/supabase/service'
import { isValidSectionSlug } from '@/lib/philly/sections'
import { enforceRateLimit } from '@/lib/philly/rate-limit'

export const runtime = 'nodejs'

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  dashboardSections: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const users = await prisma.user.findMany({
    where: { organizationId: scope.organizationId },
    select: USER_SELECT,
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ users })
}

// `dashboardSections` normalises the caller's intent into three states:
//   • undefined  — field not in the PATCH body; leave DB untouched
//   • null       — explicit "clear" → full-access user
//   • string[]   — strict allow-list; unknown slugs dropped silently
// PATCH discriminates all three; POST treats undefined as "not set
// → full access" by storing the DB NULL.
const sectionsField = z
  .union([z.array(z.string()), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined
    if (v === null) return null
    return v.filter(isValidSectionSlug)
  })

const createSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['admin', 'manager', 'viewer']).default('viewer'),
  dashboardSections: sectionsField,
})

// Inviting a teammate sends a Supabase email and creates a Philly
// User row. Rate-limit per admin to prevent invite-spam — 20 per
// hour is plenty for honest onboarding and tight enough that a
// runaway script trips quickly.
const INVITE_LIMIT = { capacity: 20, refillPerSec: 20 / 3600 } as const

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`users:invite:${scope.userId}`, INVITE_LIMIT)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400)
  }
  const { email, name, role, dashboardSections } = parsed.data

  const prisma = getAuthPrisma()

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true },
  })

  // Multi-org (Bundle G): if the email already has a User row, we
  // don't create a second User — we add a Membership row attaching
  // them to THIS org with the requested role. This is the
  // consultant / shared-employee use case. The User's home org
  // (User.organizationId) stays whatever it was.
  type UserSummary = {
    id: string
    email: string
    name: string
    role: string
    dashboardSections: unknown
    avatarUrl: string | null
    lastLoginAt: Date | null
    createdAt: Date
  }
  let user: UserSummary
  if (existing) {
    if (existing.organizationId === scope.organizationId) {
      return jsonError('User is already a member of this organization', 409)
    }
    // Add a Membership in THIS org. Idempotent: upsert pattern
    // protects against a double-submit re-creating the row.
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: existing.id, organizationId: scope.organizationId } },
      create: {
        userId: existing.id,
        organizationId: scope.organizationId,
        role,
        dashboardSections: dashboardSections ?? undefined,
      },
      update: {
        role,
        dashboardSections: dashboardSections ?? undefined,
      },
    })
    user = await prisma.user.findUniqueOrThrow({
      where: { id: existing.id },
      select: USER_SELECT,
    })
  } else {
    user = await prisma.user.create({
      data: {
        email,
        name: name?.trim() || email.split('@')[0],
        role,
        organizationId: scope.organizationId,
        dashboardSections: dashboardSections ?? undefined,
        // Supabase owns auth; this sentinel prevents any local
        // credentials login from ever matching.
        passwordHash: '__supabase_auth__',
      },
      select: USER_SELECT,
    })
    // Mirror the home-org membership row so listing memberships
    // is the canonical source ("show me everyone in this org").
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: scope.organizationId,
        role,
        dashboardSections: dashboardSections ?? undefined,
      },
    })
  }

  // Best-effort Supabase invite. Fails soft: the Philly row is
  // already created, so an admin can resend the invite separately
  // (or the user can hit /login and request a magic link themselves).
  let inviteSent = false
  let inviteError: string | null = null
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { invited_by: scope.email ?? undefined, role },
    })
    if (error) inviteError = error.message
    else inviteSent = true
  } catch (err) {
    inviteError = err instanceof Error ? err.message : 'invite failed'
  }

  await logAudit({
    scope,
    action: 'create',
    entity: 'user',
    entityId: user.id,
    changes: {
      email: { old: null, new: email },
      role: { old: null, new: role },
      dashboardSections: { old: null, new: dashboardSections ?? null },
      inviteSent: { old: null, new: inviteSent },
    },
  }).catch(() => { /* best-effort */ })

  return NextResponse.json({ user, inviteSent, inviteError })
}

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  dashboardSections: sectionsField,
}).refine(
  (d) => d.role !== undefined || d.dashboardSections !== undefined,
  { message: 'Nothing to update' },
)

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400)
  }
  const { userId, role, dashboardSections } = parsed.data

  const prisma = getAuthPrisma()
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, organizationId: true, dashboardSections: true },
  })
  if (!target) return jsonError('User not found', 404)
  if (target.organizationId !== scope.organizationId) {
    return jsonError('Cross-organization update not allowed', 403)
  }

  // Guardrail: can't demote the last admin
  if (role !== undefined && target.role === 'admin' && role !== 'admin') {
    const adminCount = await prisma.user.count({
      where: { organizationId: scope.organizationId, role: 'admin' },
    })
    if (adminCount <= 1) {
      return jsonError('Cannot demote the last admin', 400)
    }
  }

  // `updateData` is typed loosely because the `dashboardSections`
  // JSON column accepts a union Prisma exposes as a generated type
  // we don't want to import here. Values are already validated via
  // Zod + the `isValidSectionSlug` filter, so the runtime contract is
  // safe; the `as` cast only silences the generated-type check.
  const updateData: Record<string, unknown> = {}
  const changes: Record<string, { old: unknown; new: unknown }> = {}
  if (role !== undefined && role !== target.role) {
    updateData.role = role
    changes.role = { old: target.role, new: role }
  }
  if (dashboardSections !== undefined) {
    // null = full access → store DB null, otherwise the validated list.
    updateData.dashboardSections = dashboardSections
    changes.dashboardSections = { old: target.dashboardSections, new: dashboardSections }
  }

  if (Object.keys(updateData).length === 0) {
    return jsonError('Nothing to update', 400)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
    select: USER_SELECT,
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: target.id,
    changes,
  }).catch(() => { /* audit best-effort */ })

  return NextResponse.json({ user: updated })
}
