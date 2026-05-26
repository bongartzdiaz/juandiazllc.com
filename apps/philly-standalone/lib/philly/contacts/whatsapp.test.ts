/* Phone-normalization tests — pin the regex behavior so future
   changes don't accidentally start accepting local-only numbers
   (which would produce broken wa.me links). */

import { describe, it, expect } from 'vitest'
import { normalizePhoneForWhatsApp, buildWhatsAppLink, WHATSAPP_TEMPLATES } from './whatsapp'

describe('normalizePhoneForWhatsApp', () => {
  describe('accepts international format variants', () => {
    it('handles "+" prefix with spaces', () => {
      expect(normalizePhoneForWhatsApp('+32 475 12 34 56')).toBe('32475123456')
    })

    it('handles "+" prefix with dashes', () => {
      expect(normalizePhoneForWhatsApp('+32-475-12-34-56')).toBe('32475123456')
    })

    it('handles "00" international prefix', () => {
      expect(normalizePhoneForWhatsApp('0032 475 12 34 56')).toBe('32475123456')
    })

    it('handles already-clean digits-only with country code', () => {
      expect(normalizePhoneForWhatsApp('32475123456')).toBe('32475123456')
    })

    it('handles parens + spaces (US-style international)', () => {
      expect(normalizePhoneForWhatsApp('+1 (212) 555-0100')).toBe('12125550100')
    })

    it('handles French international format', () => {
      expect(normalizePhoneForWhatsApp('+33 6 12 34 56 78')).toBe('33612345678')
    })

    it('handles Dutch international format', () => {
      expect(normalizePhoneForWhatsApp('+31 6 12345678')).toBe('31612345678')
    })

    it('handles German international format', () => {
      expect(normalizePhoneForWhatsApp('+49 151 12345678')).toBe('4915112345678')
    })
  })

  describe('rejects ambiguous local-only numbers', () => {
    it('rejects BE local format (starts with 0, no country code)', () => {
      expect(normalizePhoneForWhatsApp('0475 12 34 56')).toBeNull()
    })

    it('rejects US local format with parens', () => {
      expect(normalizePhoneForWhatsApp('(212) 555-0100')).toBeNull()
    })

    it('rejects bare 10-digit number starting with 0', () => {
      expect(normalizePhoneForWhatsApp('0612345678')).toBeNull()
    })
  })

  describe('rejects empty / malformed input', () => {
    it('null input → null output', () => {
      expect(normalizePhoneForWhatsApp(null)).toBeNull()
    })

    it('undefined input → null output', () => {
      expect(normalizePhoneForWhatsApp(undefined)).toBeNull()
    })

    it('empty string → null output', () => {
      expect(normalizePhoneForWhatsApp('')).toBeNull()
    })

    it('whitespace-only → null output', () => {
      expect(normalizePhoneForWhatsApp('   ')).toBeNull()
    })

    it('too short (<7 digits) → null output', () => {
      expect(normalizePhoneForWhatsApp('+32 12')).toBeNull()
    })

    it('too long (>15 digits) → null output', () => {
      expect(normalizePhoneForWhatsApp('+99 1234567890123456')).toBeNull()
    })

    it('letters in input → strips them, validates remainder', () => {
      expect(normalizePhoneForWhatsApp('+32abc475123456')).toBe('32475123456')
    })
  })
})

describe('buildWhatsAppLink', () => {
  it('builds a valid wa.me URL with URL-encoded message', () => {
    const url = buildWhatsAppLink('+32 475 12 34 56', 'Hi Jan, hope you are well!')
    expect(url).toBe('https://wa.me/32475123456?text=Hi%20Jan%2C%20hope%20you%20are%20well!')
  })

  it('handles multi-line messages (encodes newlines)', () => {
    const url = buildWhatsAppLink('+32 475 12 34 56', 'Line one\nLine two')
    expect(url).toContain('Line%20one%0ALine%20two')
  })

  it('handles emoji in messages', () => {
    const url = buildWhatsAppLink('+32 475 12 34 56', 'Hi 👋')
    expect(url).toContain('Hi%20%F0%9F%91%8B')
  })

  it('returns null when phone is unnormalizable (UI must disable button)', () => {
    expect(buildWhatsAppLink('0475 12 34 56', 'hello')).toBeNull()
  })

  it('returns null when phone is null', () => {
    expect(buildWhatsAppLink(null, 'hello')).toBeNull()
  })
})

describe('WHATSAPP_TEMPLATES registry', () => {
  it('exposes exactly 5 templates (no scope creep)', () => {
    expect(WHATSAPP_TEMPLATES).toHaveLength(5)
  })

  it('every template has a unique id', () => {
    const ids = new Set(WHATSAPP_TEMPLATES.map(t => t.id))
    expect(ids.size).toBe(WHATSAPP_TEMPLATES.length)
  })

  it('every template has an i18nKey under whatsapp.templates.*', () => {
    for (const t of WHATSAPP_TEMPLATES) {
      expect(t.i18nKey).toMatch(/^whatsapp\.templates\./)
    }
  })
})
