import { NextRequest, NextResponse } from 'next/server'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { createInviteSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'
import { generateInviteToken, defaultInviteExpiry, sendInviteEmail } from '@/lib/philly/invites'
import { getSeatStatus } from '@/lib/philly/seats'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/organizations/invite
 *   List active (pending, non-expired, non-revoked) invites for the
 *   caller's org. Any authenticated org member can read this.
 */
export async function GET(_req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const now = new Date()

  const invites = await prisma.invite.findMany({
    where: {
      organizationId: scope.organizationId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      email: true,
      role: true,
      invitedByUserId: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const seats = await getSeatStatus(scope.organizationId)
  return NextResponse.json({ data: { invites, seats } })
}

/**
 * POST /api/organizations/invite
 *   Body: { email, role? }
 *   Admin/manager only. Issues a single-use token, persists the row,
 *   sends the invite email. Refuses if seat limit reached or if there's
 *   already a pending invite for the same email in this org.
 */
export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`invite:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, createInviteSchema)
  if (!parsed.success) return parsed.response
  const { email, role } = parsed.data

  const prisma = getAuthPrisma()

  // Check seat capacity (counts users + pending invites)
  const seats = await getSeatStatus(scope.organizationId)
  if (seats.available <= 0) {
    return jsonError(`Seat limit reached (${seats.used}/${seats.limit}). Upgrade your plan to invite more teammates.`, 409)
  }

  // No duplicate pending invite for the same email in this org
  const existingPending = await prisma.invite.findFirst({
    where: {
      organizationId: scope.organizationId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  if (existingPending) {
    return jsonError('There is already a pending invite for this email.', 409)
  }

  // No invite for an email that already has a User in this org
  const existingUser = await prisma.user.findFirst({
    where: { email, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (existingUser) {
    return jsonError('This person already has an account in this organization.', 409)
  }

  const token = generateInviteToken()
  const expiresAt = defaultInviteExpiry()

  const invite = await prisma.invite.create({
    data: {
      organizationId: scope.organizationId,
      email,
      role,
      token,
      invitedByUserId: scope.userId,
      expiresAt,
    },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  })

  // Look up org + inviter for the email body
  const [org, inviter] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { name: true },
    }),
    prisma.user.findUnique({
      where: { id: scope.userId },
      select: { name: true, email: true },
    }),
  ])

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.lucen.ai'
  const acceptUrl = `${baseUrl}/invite/accept?token=${encodeURIComponent(token)}`

  // Email is best-effort — failure logs but does not roll back the invite.
  // Operator can resurface the link from the team page if mail bounces.
  const emailResult = await sendInviteEmail({
    to: email,
    inviterName: inviter?.name ?? inviter?.email ?? 'A teammate',
    organizationName: org?.name ?? 'your team',
    acceptUrl,
    expiresAt,
  })
  if (!emailResult.ok) {
    logger.warn('[invite] email send failed but invite created', { inviteId: invite.id, email, error: emailResult.error })
  }

  await logAudit({
    scope,
    action: 'create',
    entity: 'invite',
    entityId: invite.id,
    changes: {
      email: { old: null, new: email },
      role: { old: null, new: role },
      expiresAt: { old: null, new: expiresAt.toISOString() },
    },
  })

  return NextResponse.json({
    data: {
      invite,
      emailSent: emailResult.ok,
      seats: await getSeatStatus(scope.organizationId),
    },
  }, { status: 201 })
}
