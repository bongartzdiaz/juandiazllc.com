import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { acceptInviteSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/invites/accept
 *   PUBLIC endpoint. Body: { token, name, password }
 *
 *   Validates the token, creates a User in the inviting org with the
 *   role recorded on the Invite, marks the Invite accepted, and
 *   returns 201 with the user id. The client redirects to /login.
 *
 *   Rate-limited by IP since this is unauthenticated.
 */
export async function POST(req: NextRequest) {
  // Use the requesting IP as the rate-limit key. Behind a CDN this
  // ends up being the cdn-edge IP for the same edge — acceptable
  // for an MVP; tighter later via X-Forwarded-For parsing.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limited = enforceRateLimit(`invite-accept:${ip}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, acceptInviteSchema)
  if (!parsed.success) return parsed.response
  const { token, name, password } = parsed.data

  const prisma = getAuthPrisma()
  const now = new Date()

  // Look up the invite. The unique index on token makes this O(1).
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
    },
  })

  // We use the same generic error for "no such token" / "expired" /
  // "revoked" / "already accepted" — never confirm token validity
  // beyond accept-or-fail to a public caller.
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt <= now) {
    logger.info('[invite] accept rejected', {
      inviteId: invite?.id,
      reason: !invite ? 'unknown' : invite.acceptedAt ? 'accepted' : invite.revokedAt ? 'revoked' : 'expired',
    })
    return jsonError('This invite link is invalid or has expired.', 410)
  }

  // Make sure the org still exists and isn't soft-deleted
  const org = await prisma.organization.findUnique({
    where: { id: invite.organizationId },
    select: { id: true, deletedAt: true, seatLimit: true },
  })
  if (!org || org.deletedAt) {
    return jsonError('This organization is no longer available.', 410)
  }

  // Last-mile seat check: a flurry of accepts in parallel could each pass
  // the issue-time check. Re-check at accept-time too.
  const userCount = await prisma.user.count({ where: { organizationId: org.id, deletedAt: null } })
  // Subscription seat limit (if present, otherwise org.seatLimit)
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: org.id },
    select: { seatCount: true, status: true },
  })
  const limit =
    sub && (sub.status === 'active' || sub.status === 'trialing')
      ? sub.seatCount
      : org.seatLimit
  if (userCount >= limit) {
    return jsonError('Your organization has reached its seat limit. Ask an admin to upgrade.', 409)
  }

  // Reject if a User with this email already exists somewhere — avoids
  // hijacking another org's user record.
  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true, organizationId: true },
  })
  if (existing) {
    return jsonError('An account with this email already exists. Sign in instead.', 409)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // Atomicity matters: create user + mark invite accepted in one transaction
  // so we never end up with a half-accepted invite.
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: invite.email,
        name,
        passwordHash,
        role: invite.role,
        organizationId: invite.organizationId,
      },
      select: { id: true, email: true, role: true },
    })
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedByUserId: user.id },
    })
    return user
  })

  logger.info('[invite] accepted', {
    inviteId: invite.id,
    userId: result.id,
    organizationId: invite.organizationId,
  })

  return NextResponse.json({
    data: {
      userId: result.id,
      email: result.email,
      role: result.role,
      organizationId: invite.organizationId,
    },
  }, { status: 201 })
}
