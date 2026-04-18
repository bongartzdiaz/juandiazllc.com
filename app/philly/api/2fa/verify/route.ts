/* POST /api/2fa/verify — confirm enrollment by proving possession of the secret
   Body: { code: "123456" }

   On success:
     - Sets twoFactorEnabled=true, twoFactorVerifiedAt=now
     - Rotates + returns 10 recovery codes (show ONCE to the user)
     - Bumps tokensInvalidAfter so any prior sessions are forced to re-login
       with 2FA enforced. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { getPlaintextSecret, verifyTotp, rotateRecoveryCodes } from '@/lib/philly/two-factor'
import { rateLimit } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Tight rate limit to slow brute-forcing the 6-digit code
  const { ok } = rateLimit(`2fa-verify:${scope.userId}`, { capacity: 8, refillPerSec: 0.1 })
  if (!ok) return jsonError('Too many attempts — try again in a minute', 429)

  let body: { code?: string } = {}
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  const code = (body.code ?? '').trim()
  if (!/^\d{6}$/.test(code)) return jsonError('code must be 6 digits', 400)

  const secret = await getPlaintextSecret(scope.userId)
  if (!secret) return jsonError('No pending 2FA enrollment — call /api/2fa/enroll first', 400)

  if (!verifyTotp(code, secret)) {
    return jsonError('Invalid code', 400)
  }

  const prisma = getAuthPrisma()
  await prisma.user.update({
    where: { id: scope.userId },
    data: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: new Date(),
      tokensInvalidAfter: new Date(),
    },
  })

  const recoveryCodes = await rotateRecoveryCodes(scope.userId)

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: {
      twoFactorEnabled: { old: false, new: true },
    },
  })

  return NextResponse.json({
    data: {
      enabled: true,
      recoveryCodes, // show once, never returned again
    },
  })
}
