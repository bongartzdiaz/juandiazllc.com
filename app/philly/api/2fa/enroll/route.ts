/* POST /api/2fa/enroll — start TOTP enrollment
   - Generates a new secret (not yet enabled)
   - Stores it encrypted on the user row with twoFactorEnabled=false
   - Returns the otpauth:// URI + a QR-code data URL for the client to render
   User must POST /api/2fa/verify with a code before the secret becomes active. */

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import {
  generateTwoFactorSecret,
  buildProvisioningUri,
  encryptTwoFactorSecret,
} from '@/lib/philly/two-factor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { email: true, twoFactorEnabled: true },
  })
  if (!user) return jsonError('User not found', 404)
  if (user.twoFactorEnabled) return jsonError('2FA is already enabled — disable it first to re-enroll', 400)

  const secret = generateTwoFactorSecret()
  const otpauth = buildProvisioningUri(user.email, secret)
  const qrDataUrl = await QRCode.toDataURL(otpauth)

  await prisma.user.update({
    where: { id: scope.userId },
    data: {
      twoFactorSecret: encryptTwoFactorSecret(secret),
      twoFactorEnabled: false,
      twoFactorVerifiedAt: null,
    },
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { twoFactorEnrollmentStarted: { old: null, new: new Date().toISOString() } },
  })

  // Return the plaintext secret ONCE so the user can see it (e.g. for
  // manual entry into apps that don't scan QR codes). After verify it's
  // never returned again.
  return NextResponse.json({
    data: {
      secret,
      otpauth,
      qrDataUrl,
    },
  })
}
