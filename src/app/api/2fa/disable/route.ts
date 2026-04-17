/* POST /api/2fa/disable — turn off 2FA
   Body: { code: "123456" }  (a current TOTP code OR a recovery code)
   Requires proof of current possession so a stolen session can't disable it. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'
import { getPlaintextSecret, verifyTotp, consumeRecoveryCode } from '@/lib/two-factor'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { ok } = rateLimit(`2fa-disable:${scope.userId}`, { capacity: 5, refillPerSec: 0.05 })
  if (!ok) return jsonError('Too many attempts — try again later', 429)

  let body: { code?: string } = {}
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }

  const code = (body.code ?? '').trim()
  if (!code) return jsonError('code is required', 400)

  const prisma = getAuthPrisma()
  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { twoFactorEnabled: true },
  })
  if (!user?.twoFactorEnabled) return jsonError('2FA is not enabled', 400)

  // Accept either a 6-digit TOTP or an 8-char recovery code (hex-hex)
  let verified = false
  if (/^\d{6}$/.test(code)) {
    const secret = await getPlaintextSecret(scope.userId)
    if (secret && verifyTotp(code, secret)) verified = true
  } else {
    verified = await consumeRecoveryCode(scope.userId, code)
  }

  if (!verified) return jsonError('Invalid code', 400)

  await prisma.user.update({
    where: { id: scope.userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorVerifiedAt: null,
      tokensInvalidAfter: new Date(),
    },
  })
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: scope.userId } })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { twoFactorEnabled: { old: true, new: false } },
  })

  return NextResponse.json({ data: { enabled: false } })
}
