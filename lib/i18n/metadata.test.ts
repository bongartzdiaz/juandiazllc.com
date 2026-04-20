import { describe, it, expect } from 'vitest'
import {
  buildAlternates,
  ogLocale,
  alternateOgLocales,
  assertLocale,
} from './metadata'
import { LOCALES } from './dict'

describe('buildAlternates', () => {
  it('emits canonical locale + languages map for a non-root path', () => {
    const a = buildAlternates('en', '/about')
    expect(a.canonical).toBe('/en/about')
    expect(a.languages).toEqual({
      en: '/en/about',
      nl: '/nl/about',
      de: '/de/about',
      es: '/es/about',
      'x-default': '/en/about',
    })
  })

  it('treats "/" as the root (no trailing path segment)', () => {
    const a = buildAlternates('nl', '/')
    expect(a.canonical).toBe('/nl')
    expect(a.languages!.en).toBe('/en')
    expect(a.languages!['x-default']).toBe('/en')
  })

  it('treats "" (empty path) the same as root', () => {
    const a = buildAlternates('de', '')
    expect(a.canonical).toBe('/de')
  })

  it('adds the leading slash when omitted', () => {
    const a = buildAlternates('es', 'work/voltafy')
    expect(a.canonical).toBe('/es/work/voltafy')
  })

  it('covers every supported locale in languages', () => {
    const a = buildAlternates('en', '/insights')
    for (const l of LOCALES) {
      expect(a.languages![l]).toBe(`/${l}/insights`)
    }
    expect(a.languages!['x-default']).toBe('/en/insights')
  })
})

describe('ogLocale', () => {
  it('maps every locale to the correct OG format', () => {
    expect(ogLocale('en')).toBe('en_US')
    expect(ogLocale('nl')).toBe('nl_NL')
    expect(ogLocale('de')).toBe('de_DE')
    expect(ogLocale('es')).toBe('es_ES')
  })
})

describe('alternateOgLocales', () => {
  it('returns OG locales for every locale except the current one', () => {
    expect(alternateOgLocales('en').sort()).toEqual(['de_DE', 'es_ES', 'nl_NL'])
    expect(alternateOgLocales('nl').sort()).toEqual(['de_DE', 'en_US', 'es_ES'])
    expect(alternateOgLocales('de').sort()).toEqual(['en_US', 'es_ES', 'nl_NL'])
    expect(alternateOgLocales('es').sort()).toEqual(['de_DE', 'en_US', 'nl_NL'])
  })

  it('always returns LOCALES.length - 1 entries', () => {
    for (const l of LOCALES) {
      expect(alternateOgLocales(l)).toHaveLength(LOCALES.length - 1)
    }
  })
})

describe('assertLocale', () => {
  it('returns the locale when it is supported', () => {
    for (const l of LOCALES) {
      expect(assertLocale(l)).toBe(l)
    }
  })

  it('defaults to "en" for unknown input', () => {
    expect(assertLocale('fr')).toBe('en')
    expect(assertLocale('')).toBe('en')
    expect(assertLocale('xx')).toBe('en')
  })
})
