/* POST /api/2fa/setup — start TOTP enrollment.

   Generates a fresh secret + provisioning URI. Stores the secret
   encrypted on the User row but leaves twoFactorEnabled = false
   until the user successfully verifies a code via /api/2fa/verify.

   Returns:
     - secret: the plaintext secret (the user can manually type it
       into their authenticator if they can't scan)
     - otpauthUri: the otpauth:// URI
     - qrDataUrl: a PNG data: URL the client can render directly

   Tenant-scoped via requireScope — the user enrolls their own
   account; admins cannot enroll someone else's. */

import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import {
  generateTwoFactorSecret,
  buildProvisioningUri,
  encryptTwoFactorSecret,
} from '@/lib/philly/two-factor'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Setup churn per user — generous enough for genuine retries
// (ran out of time, wrong app, lost camera focus) but tight enough
// that an attacker can't grind for predictable QR images.
const SETUP_LIMIT = { capacity: 8, refillPerSec: 8 / 3600 } as const

export async function POST() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`2fa:setup:${scope.userId}`, SETUP_LIMIT)
  if (limited) return limited

  const prisma = getAuthPrisma()

  const secret = generateTwoFactorSecret()
  const encrypted = encryptTwoFactorSecret(secret)
  if (!encrypted) {
    return NextResponse.json({ error: 'Failed to encrypt 2FA secret' }, { status: 500 })
  }

  // Persist the secret unverified. twoFactorEnabled stays false until
  // /api/2fa/verify succeeds — protects against an attacker who hits
  // /setup but never proves they hold the device.
  await prisma.user.update({
    where: { id: scope.userId },
    data: {
      twoFactorSecret: encrypted,
      twoFactorEnabled: false,
      twoFactorVerifiedAt: null,
    },
  })

  const otpauthUri = buildProvisioningUri(scope.email ?? 'user', secret)
  const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
    margin: 1,
    width: 240,
    errorCorrectionLevel: 'M',
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: scope.userId,
    changes: { twoFactor: { old: 'unenrolled', new: 'pending' } },
  })

  return NextResponse.json({
    secret,
    otpauthUri,
    qrDataUrl,
  })
}
