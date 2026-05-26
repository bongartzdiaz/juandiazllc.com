/* ---------------------------------------------------------------
   TOTP two-factor auth helpers — Philly Dashboard
   ---------------------------------------------------------------
   - Generate a new secret + provisioning URI for an authenticator app
   - Verify a 6-digit code with a ±1 window (handles clock skew)
   - Generate + hash recovery codes (bcrypt)
   - Consume a recovery code exactly once

   The secret itself is encrypted at rest via src/lib/crypto.ts.
   --------------------------------------------------------------- */

import { generateSecret, generateURI, verifySync } from 'otplib'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { encryptSecret, decryptSecret } from './crypto'
import { getAuthPrisma } from './auth'

// RFC 6238 defaults: 30s step, 6 digits. epochTolerance=30 tolerates ±30s clock drift.
const TOTP_EPOCH_TOLERANCE = 30

// Brand shown in authenticator apps (Google Authenticator, Authy, 1Password) when
// users enroll TOTP. Customer-visible — keep aligned with the public DEUS brand.
// 2026-05-26: rebranded from "Philly Dashboard" to "DEUS".
//
// Caveat: users who previously enrolled under "Philly Dashboard" will keep that
// name in their authenticator app until they re-enroll. Pre-launch this affects
// only the dev/seed user; production rollout doesn't need a forced re-enroll.
export const TWO_FACTOR_ISSUER = 'DEUS'

/** Generate a new TOTP secret (base32, stored encrypted). */
export function generateTwoFactorSecret(): string {
  return generateSecret()
}

/** Build the otpauth URI that the user's authenticator app scans. */
export function buildProvisioningUri(email: string, secret: string, issuer = TWO_FACTOR_ISSUER): string {
  return generateURI({ issuer, label: email, secret })
}

/** Verify a 6-digit token against a plaintext secret. Returns true on match. */
export function verifyTotp(token: string, plaintextSecret: string): boolean {
  const clean = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  try {
    const result = verifySync({
      token: clean,
      secret: plaintextSecret,
      epochTolerance: TOTP_EPOCH_TOLERANCE,
    })
    return result.valid
  } catch {
    return false
  }
}

/** Fetch + decrypt the stored TOTP secret for a user. Returns null if no 2FA. */
export async function getPlaintextSecret(userId: string): Promise<string | null> {
  const prisma = getAuthPrisma()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  })
  if (!user?.twoFactorSecret) return null
  return decryptSecret(user.twoFactorSecret)
}

/** Generate 10 human-friendly recovery codes (uppercase, with a hyphen). */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const left = crypto.randomBytes(3).toString('hex').toUpperCase()
    const right = crypto.randomBytes(3).toString('hex').toUpperCase()
    codes.push(`${left}-${right}`)
  }
  return codes
}

/** Replace a user's recovery codes with freshly-generated ones. Returns the plaintext list (show once). */
export async function rotateRecoveryCodes(userId: string, count = 10): Promise<string[]> {
  const prisma = getAuthPrisma()
  const codes = generateRecoveryCodes(count)

  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: await Promise.all(
        codes.map(async (code) => ({
          userId,
          codeHash: await bcrypt.hash(code, 10),
        })),
      ),
    }),
  ])

  return codes
}

/**
 * Consume a recovery code. Returns true on success (code matched + marked used),
 * false if no match. Constant-time-ish: we check every unused code so timing
 * doesn't leak which position the match was at.
 */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const prisma = getAuthPrisma()
  const normalized = code.trim().toUpperCase()

  const candidates = await prisma.twoFactorRecoveryCode.findMany({
    where: { userId, usedAt: null },
    select: { id: true, codeHash: true },
  })

  let matchedId: string | null = null
  for (const c of candidates) {
    // bcrypt.compare is constant-time within itself; looping all candidates
    // means total time ~= candidate count × per-compare.
    if (await bcrypt.compare(normalized, c.codeHash)) {
      matchedId = c.id
      // Don't break — keep looping so timing is uniform regardless of position.
    }
  }

  if (!matchedId) return false

  await prisma.twoFactorRecoveryCode.update({
    where: { id: matchedId },
    data: { usedAt: new Date() },
  })
  return true
}

/** Encrypt a secret for storage. Re-exported for API routes. */
export const encryptTwoFactorSecret = encryptSecret
