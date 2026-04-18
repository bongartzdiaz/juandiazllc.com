import { describe, it, expect } from 'vitest'
import {
  generateTwoFactorSecret,
  buildProvisioningUri,
  verifyTotp,
  generateRecoveryCodes,
  TWO_FACTOR_ISSUER,
} from './two-factor'
import { generateSync } from 'otplib'

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
