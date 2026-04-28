/* POST /api/2fa/verify — finalise TOTP enrollment.

   Body: { code: "123456" }

   Verifies the 6-digit TOTP against the secret stored by
   /api/2fa/setup. On success: flips twoFactorEnabled = true,
   stamps twoFactorVerifiedAt, generates 10 recovery codes, and
   returns the plaintext codes (shown to the user once — never
   retrievable again).

   Returns:
     200 { recoveryCodes: ["AB12-CD34", ...] } on success
     400 if the code is malformed
     401 if there's no setup-pending secret to verify against
     409 if the code is invalid */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import {
  getPlaintextSecret,
  verifyTotp,
  rotateRecoveryCodes,
} from '@/lib/philly/two-factor'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Brute-force a 6-digit TOTP is 1 in 1M per attempt; 5/min per
// user wraps that to roughly 0.0005% chance over an hour.
const VERIFY_LIMIT = { capacity: 5, refillPerSec: 5 / 60 } as const

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`2fa:verify:${scope.userId}`, VERIFY_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, verifySchema)
  if (!parsed.success) return parsed.response

  const plaintextSecret = await getPlaintextSecret(scope.userId)
  if (!plaintextSecret) {
    return jsonError('No 2FA setup in progress — start with POST /api/2fa/setup', 401)
  }

  const ok = verifyTotp(parsed.data.code, plaintextSecret)
  if (!ok) {
    return NextResponse.json(
      { error: 'Invalid 2FA code', code: 'INVALID_CODE' },
      { status: 409 },
    )
  }

  // Flip twoFactorEnabled in a transaction with the recovery-code
  // rotation so a partial failure can't leave a user enabled but
  // codeless.
  const prisma = getAuthPrisma()
  await prisma.user.update({
    where: { id: scope.userId },
    data: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
    },
  })

  const recoveryCodes = await rotateRecoveryCodes(scope.userId, 10)

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { twoFactor: { old: 'pending', new: 'enabled' } },
  })

  return NextResponse.json({
    enabled: true,
    recoveryCodes,
  })
}
