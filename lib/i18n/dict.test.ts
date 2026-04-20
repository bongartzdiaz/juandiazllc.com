import { describe, it, expect } from 'vitest'
import { DICT, LOCALES, DEFAULT_LOCALE, translate, type Locale } from './dict'

// Dict parity test. The translate() helper silently falls back to
// English when a key is missing in a non-EN locale, so a missing key
// in nl/de/es shows up to users as English copy — not a crash. That
// makes it a landmine: easy to introduce, invisible until someone
// notices. This test makes parity a CI gate instead.

describe('dict parity', () => {
  const nonEnLocales: Locale[] = LOCALES.filter((l) => l !== DEFAULT_LOCALE) as Locale[]
  const enKeys = new Set(Object.keys(DICT.en))

  it('English is the canonical key set (non-empty)', () => {
    expect(enKeys.size).toBeGreaterThan(100)
  })

  for (const locale of nonEnLocales) {
    describe(`locale=${locale}`, () => {
      const localeKeys = new Set(Object.keys(DICT[locale]))

      it('contains every English key', () => {
        const missing = [...enKeys].filter((k) => !localeKeys.has(k))
        if (missing.length > 0) {
          throw new Error(
            `${locale} is missing ${missing.length} key(s) that exist in en: ` +
              missing.slice(0, 10).join(', ') +
              (missing.length > 10 ? `, …and ${missing.length - 10} more` : ''),
          )
        }
      })

      it('does not add orphan keys that English lacks', () => {
        const orphan = [...localeKeys].filter((k) => !enKeys.has(k))
        if (orphan.length > 0) {
          throw new Error(
            `${locale} has ${orphan.length} orphan key(s) not in en: ` +
              orphan.slice(0, 10).join(', '),
          )
        }
      })

      it('has non-empty string values for every key', () => {
        const empty: string[] = []
        for (const [k, v] of Object.entries(DICT[locale])) {
          if (typeof v !== 'string' || v.trim().length === 0) empty.push(k)
        }
        if (empty.length > 0) {
          throw new Error(`${locale} has empty values for: ${empty.join(', ')}`)
        }
      })
    })
  }
})

describe('translate()', () => {
  it('returns the requested locale string when present', () => {
    const key = 'nav.story'
    expect(translate('en', key)).toBe(DICT.en[key])
    expect(translate('nl', key)).toBe(DICT.nl[key])
    expect(translate('de', key)).toBe(DICT.de[key])
    expect(translate('es', key)).toBe(DICT.es[key])
  })

  it('falls back to English when a key is missing in the locale', () => {
    // We temporarily remove a key from DICT.nl to simulate a gap, then restore.
    const key = 'nav.story'
    const backup = DICT.nl[key]
    try {
      delete (DICT.nl as Record<string, string>)[key]
      expect(translate('nl', key)).toBe(DICT.en[key])
    } finally {
      DICT.nl[key] = backup
    }
  })

  it('falls back to the key itself when unknown in every locale', () => {
    const unknown = '__does_not_exist_anywhere__'
    expect(translate('en', unknown)).toBe(unknown)
    expect(translate('nl', unknown)).toBe(unknown)
  })
})
