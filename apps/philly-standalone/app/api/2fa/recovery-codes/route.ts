/* POST /api/2fa/recovery-codes — regenerate the 10 single-use
   recovery codes. Useful when the user thinks their previous list
   has leaked, or when they used several and want a fresh batch.

   Body: { code: "123456" } — current TOTP (proof-of-possession).

   Returns the new plaintext codes once; the previous list is
   wiped in the same transaction. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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

const ROTATE_LIMIT = { capacity: 5, refillPerSec: 5 / 3600 } as const

const rotateSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`2fa:recovery:${scope.userId}`, ROTATE_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, rotateSchema)
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

  const recoveryCodes = await rotateRecoveryCodes(scope.userId, 10)

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { recoveryCodes: { old: 'rotated', new: 'fresh' } },
  })

  return NextResponse.json({ recoveryCodes })
}
