/* POST /api/2fa/disable — turn 2FA off for the calling user.

   Body: { code: "123456" } — current TOTP, required for
                              defense-in-depth. Disabling without
                              proving you still hold the device
                              would let an attacker who stole a
                              session disable 2FA outright.

   Refuses to disable if:
     - The caller is an admin AND mandatory-admin-2FA enforcement
       is active (would lock them out of admin endpoints).
     - The caller is the last admin in their org (consistent with
       the last-admin protection on role demotion).

   Returns 200 on success; deletes the secret + recovery codes
   atomically. Audit-logged. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError, isAdminMfaEnforced } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { getPlaintextSecret, verifyTotp } from '@/lib/philly/two-factor'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DISABLE_LIMIT = { capacity: 5, refillPerSec: 5 / 3600 } as const

const disableSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`2fa:disable:${scope.userId}`, DISABLE_LIMIT)
  if (limited) return limited

  if (scope.role === 'admin' && isAdminMfaEnforced()) {
    return jsonError(
      'Cannot disable 2FA: mandatory-admin-2FA is enforced. Demote yourself first if you need to remove 2FA.',
      409,
    )
  }

  const parsed = await validateBody(req, disableSchema)
  if (!parsed.success) return parsed.response

  if (!scope.mfaEnrolled) {
    return jsonError('2FA is not currently enabled on this account', 400)
  }

  const plaintextSecret = await getPlaintextSecret(scope.userId)
  if (!plaintextSecret || !verifyTotp(parsed.data.code, plaintextSecret)) {
    return NextResponse.json(
      { error: 'Invalid 2FA code', code: 'INVALID_CODE' },
      { status: 409 },
    )
  }

  const prisma = getAuthPrisma()
  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: scope.userId } }),
    prisma.user.update({
      where: { id: scope.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorVerifiedAt: null,
      },
    }),
  ])

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { twoFactor: { old: 'enabled', new: 'disabled' } },
  })

  return NextResponse.json({ enabled: false })
}
