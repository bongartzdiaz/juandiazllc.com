/* GET   /api/me — current user + organization summary
   PATCH /api/me — update own profile (name, email, locale, avatarUrl)

   GET is used by the client to bootstrap the session-aware UI without
   re-fetching from /api/auth/session (which only carries JWT claims). */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { serverError } from '@/lib/philly/safe-error'
import { validateBody } from '@/lib/philly/validation'
import { deleteAccountSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ME_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  locale: true,
  avatarUrl: true,
  createdAt: true,
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      logoUrl: true,
    },
  },
} as const

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()

  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: ME_SELECT,
  })

  if (!user) return jsonError('User not found', 404)

  return NextResponse.json({ data: user })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Rate-limit profile mutations — same posture as DELETE below.
  // Without this, an authenticated attacker (or a buggy client loop)
  // could thrash the user's email/locale/avatarUrl without bound.
  const rateLimit = enforceRateLimit(`me-patch:${scope.userId}`, PRESET_MUTATION)
  if (rateLimit) return rateLimit

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Invalid email', 400)
    data.email = email
  }
  if (typeof body.locale === 'string' && ['en', 'nl'].includes(body.locale)) data.locale = body.locale
  if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl.trim() || null

  if (Object.keys(data).length === 0) return jsonError('No valid fields to update', 400)

  try {
    const prisma = getAuthPrisma()
    const before = await prisma.user.findUnique({
      where: { id: scope.userId },
      select: { name: true, email: true, locale: true, avatarUrl: true },
    })
    const user = await prisma.user.update({
      where: { id: scope.userId },
      data,
      select: ME_SELECT,
    })
    await logAudit({
      scope, action: 'update', entity: 'user', entityId: user.id,
      changes: diffChanges((before ?? {}) as Record<string, unknown>, data),
    })
    return NextResponse.json({ data: user })
  } catch (err) {
    return serverError(err, 'Failed to update profile', 400)
  }
}

/**
 * DELETE /api/me
 *   Body: { confirmation: "DELETE" }
 *
 * AVG/GDPR Art. 17 — right to erasure (self-initiated).
 *
 * Soft-delete: marks User.deletedAt + invalidates all sessions. The
 * row stays for 30 days (audit + accidental-undo window), then a
 * scheduled job hard-purges it. Audit log entry is permanent.
 *
 * Last-admin guardrail: an admin who is the only admin in their org
 * cannot self-delete — they would orphan the org. UI must surface a
 * "promote someone else first" message.
 */
export async function DELETE(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`me-delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, deleteAccountSchema)
  if (!parsed.success) return parsed.response

  const prisma = getAuthPrisma()

  const target = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { id: true, role: true, organizationId: true, deletedAt: true },
  })
  if (!target) return jsonError('User not found', 404)
  if (target.deletedAt) return jsonError('Account already scheduled for deletion', 410)

  // Last-admin guardrail
  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: {
        organizationId: target.organizationId,
        role: 'admin',
        deletedAt: null,
      },
    })
    if (adminCount <= 1) {
      return jsonError(
        'You are the last admin. Promote another teammate to admin before deleting your account.',
        409,
      )
    }
  }

  const now = new Date()

  // Soft-delete + invalidate sessions atomically. tokensInvalidAfter
  // bumps to now so any JWT minted before this point is rejected.
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: scope.userId },
      data: {
        deletedAt: now,
        deletedByUserId: scope.userId, // self-delete
        tokensInvalidAfter: now,
      },
    })
    await tx.session.deleteMany({ where: { userId: scope.userId } })
  })

  await logAudit({
    scope,
    action: 'delete',
    entity: 'user',
    entityId: scope.userId,
    changes: {
      kind: { old: null, new: 'self_erasure' },
      deletedAt: { old: null, new: now.toISOString() },
    },
  }).catch(() => { /* audit best-effort */ })

  logger.info('[me] self-erasure', {
    userId: scope.userId,
    organizationId: scope.organizationId,
  })

  return NextResponse.json({
    data: {
      deleted: true,
      deletedAt: now.toISOString(),
      hardPurgeAfter: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
}
