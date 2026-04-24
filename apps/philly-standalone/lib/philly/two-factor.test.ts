import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// DB-backed helpers (rotateRecoveryCodes / consumeRecoveryCode /
// getPlaintextSecret) touch `getAuthPrisma()`. We stand up a minimal
// in-memory fake here so we can exercise their full logic without a
// live MariaDB. vi.mock is hoisted above the imports by vitest.
type RecoveryRow = { id: string; userId: string; codeHash: string; usedAt: Date | null }
type UserRow = { id: string; twoFactorSecret: string | null; twoFactorEnabled: boolean }

const db = {
  recovery: [] as RecoveryRow[],
  users: [] as UserRow[],
  nextId: 1,
}

vi.mock('./auth', () => ({
  getAuthPrisma: () => ({
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        db.users.find(u => u.id === where.id) ?? null,
    },
    twoFactorRecoveryCode: {
      deleteMany: async ({ where }: { where: { userId: string } }) => {
        const before = db.recovery.length
        db.recovery = db.recovery.filter(r => r.userId !== where.userId)
        return { count: before - db.recovery.length }
      },
      createMany: async ({ data }: { data: Array<{ userId: string; codeHash: string }> }) => {
        for (const d of data) {
          db.recovery.push({ id: `rec_${db.nextId++}`, userId: d.userId, codeHash: d.codeHash, usedAt: null })
        }
        return { count: data.length }
      },
      findMany: async ({ where }: { where: { userId: string; usedAt: null } }) =>
        db.recovery
          .filter(r => r.userId === where.userId && r.usedAt === null)
          .map(r => ({ id: r.id, codeHash: r.codeHash })),
      update: async ({ where, data }: { where: { id: string }; data: { usedAt: Date } }) => {
        const row = db.recovery.find(r => r.id === where.id)
        if (row) row.usedAt = data.usedAt
        return row
      },
    },
    // two-factor calls prisma.$transaction([...]) with the two plain
    // Promises above; the fake runs them sequentially.
    $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
  }),
}))

import {
  generateTwoFactorSecret,
  buildProvisioningUri,
  verifyTotp,
  generateRecoveryCodes,
  rotateRecoveryCodes,
  consumeRecoveryCode,
  getPlaintextSecret,
  TWO_FACTOR_ISSUER,
} from './two-factor'
import { encryptSecret } from './crypto'
import { generateSync } from 'otplib'

beforeEach(() => {
  db.recovery = []
  db.users = []
  db.nextId = 1
})

describe('two-factor — TOTP helpers', () => {
  it('generateTwoFactorSecret produces a base32-looking string', () => {
    const s = generateTwoFactorSecret()
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThanOrEqual(16)
    expect(/^[A-Z2-7]+=*$/.test(s)).toBe(true)
  })

  it('buildProvisioningUri includes issuer and email', () => {
    const uri = buildProvisioningUri('user@example.com', 'JBSWY3DPEHPK3PXP')
    expect(uri.startsWith('otpauth://totp/')).toBe(true)
    expect(uri).toContain(encodeURIComponent(TWO_FACTOR_ISSUER))
    expect(uri).toContain('user%40example.com')
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
  })

  it('verifyTotp accepts the current token from the same secret', () => {
    const secret = generateTwoFactorSecret()
    const token = generateSync({ secret })
    expect(verifyTotp(token, secret)).toBe(true)
  })

  it('verifyTotp rejects obviously wrong tokens', () => {
    const secret = generateTwoFactorSecret()
    expect(verifyTotp('000000', secret)).toBe(false)
    expect(verifyTotp('abcdef', secret)).toBe(false)
    expect(verifyTotp('', secret)).toBe(false)
    expect(verifyTotp('1234', secret)).toBe(false) // wrong length
  })

  it('verifyTotp strips whitespace before validating', () => {
    const secret = generateTwoFactorSecret()
    const token = generateSync({ secret })
    const spaced = token.slice(0, 3) + ' ' + token.slice(3)
    expect(verifyTotp(spaced, secret)).toBe(true)
  })

  it('verifyTotp fails gracefully on a malformed secret', () => {
    // Not base32 — should not throw
    expect(verifyTotp('123456', 'not-a-valid-secret!!')).toBe(false)
  })
})

describe('two-factor — recovery codes', () => {
  it('generates the requested count of uniquely-formatted codes', () => {
    const codes = generateRecoveryCodes(10)
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10) // all unique
    for (const c of codes) {
      expect(/^[0-9A-F]{6}-[0-9A-F]{6}$/.test(c)).toBe(true)
    }
  })

  it('respects a custom count', () => {
    expect(generateRecoveryCodes(3)).toHaveLength(3)
    expect(generateRecoveryCodes(1)).toHaveLength(1)
  })
})

describe('two-factor — rotateRecoveryCodes', () => {
  it('persists 10 freshly-hashed codes and returns the plaintext once', async () => {
    const codes = await rotateRecoveryCodes('user_1')
    expect(codes).toHaveLength(10)
    expect(db.recovery).toHaveLength(10)
    // Stored values are bcrypt hashes, NOT the plaintext codes.
    for (const row of db.recovery) {
      expect(row.codeHash).not.toBe(codes[0])
      expect(row.codeHash.startsWith('$2')).toBe(true)
      expect(row.usedAt).toBeNull()
    }
  })

  it('replaces any existing codes (doesn\'t stack them)', async () => {
    await rotateRecoveryCodes('user_1', 3)
    expect(db.recovery.filter(r => r.userId === 'user_1')).toHaveLength(3)

    await rotateRecoveryCodes('user_1', 5)
    expect(db.recovery.filter(r => r.userId === 'user_1')).toHaveLength(5)
  })

  it('only rotates codes for the scoped user', async () => {
    await rotateRecoveryCodes('user_1', 2)
    await rotateRecoveryCodes('user_2', 3)
    expect(db.recovery.filter(r => r.userId === 'user_1')).toHaveLength(2)
    expect(db.recovery.filter(r => r.userId === 'user_2')).toHaveLength(3)

    // Rotating user_1 again must not touch user_2's codes.
    await rotateRecoveryCodes('user_1', 1)
    expect(db.recovery.filter(r => r.userId === 'user_1')).toHaveLength(1)
    expect(db.recovery.filter(r => r.userId === 'user_2')).toHaveLength(3)
  })
})

describe('two-factor — consumeRecoveryCode', () => {
  it('consumes a valid code and marks it used, returning true', async () => {
    const codes = await rotateRecoveryCodes('user_1', 3)
    const target = codes[1]

    expect(await consumeRecoveryCode('user_1', target)).toBe(true)

    const matching = db.recovery.filter(r => r.userId === 'user_1' && r.usedAt !== null)
    expect(matching).toHaveLength(1)
  })

  it('accepts codes entered in lowercase / with whitespace', async () => {
    const [first] = await rotateRecoveryCodes('user_1', 1)
    expect(await consumeRecoveryCode('user_1', `  ${first.toLowerCase()}  `)).toBe(true)
  })

  it('rejects a code that was already used', async () => {
    const [first] = await rotateRecoveryCodes('user_1', 1)
    expect(await consumeRecoveryCode('user_1', first)).toBe(true)
    expect(await consumeRecoveryCode('user_1', first)).toBe(false)
  })

  it('rejects a code belonging to a different user', async () => {
    await rotateRecoveryCodes('user_1', 2)
    const [otherCode] = await rotateRecoveryCodes('user_2', 1)
    expect(await consumeRecoveryCode('user_1', otherCode)).toBe(false)
  })

  it('rejects arbitrary garbage that was never issued', async () => {
    await rotateRecoveryCodes('user_1', 3)
    expect(await consumeRecoveryCode('user_1', 'AAAAAA-BBBBBB')).toBe(false)
    expect(await consumeRecoveryCode('user_1', '')).toBe(false)
  })

  it('returns false (not throws) when the user has no codes at all', async () => {
    expect(await consumeRecoveryCode('nobody', 'AAAAAA-BBBBBB')).toBe(false)
  })

  it('scans every candidate regardless of match position (constant-ish time)', async () => {
    // Plant 5 codes; verify that consuming the LAST one still works
    // (loop must not short-circuit on first match).
    const codes = await rotateRecoveryCodes('user_1', 5)
    const last = codes[codes.length - 1]
    expect(await consumeRecoveryCode('user_1', last)).toBe(true)
  })
})

describe('two-factor — getPlaintextSecret', () => {
  it('returns null when the user has no 2FA secret stored', async () => {
    db.users.push({ id: 'user_1', twoFactorSecret: null, twoFactorEnabled: false })
    expect(await getPlaintextSecret('user_1')).toBeNull()
  })

  it('returns null when the user row is missing entirely', async () => {
    expect(await getPlaintextSecret('missing_user')).toBeNull()
  })

  it('decrypts and returns the stored secret when present', async () => {
    const plaintext = 'JBSWY3DPEHPK3PXP'
    // Need ENCRYPTION_KEY for encryptSecret; set a throwaway 32-byte hex
    // key just for this test so crypto.ts has something to derive from.
    process.env.ENCRYPTION_KEY = 'a'.repeat(64)
    const stored = encryptSecret(plaintext)
    db.users.push({ id: 'user_1', twoFactorSecret: stored, twoFactorEnabled: true })

    expect(await getPlaintextSecret('user_1')).toBe(plaintext)
  })
})

describe('two-factor — recovery-code round-trip against real bcrypt', () => {
  it('a freshly rotated code bcrypt-verifies against its stored hash', async () => {
    const codes = await rotateRecoveryCodes('user_1', 1)
    const row = db.recovery[0]
    expect(await bcrypt.compare(codes[0], row.codeHash)).toBe(true)
  })
})
