import { describe, it, expect } from 'vitest'
import en from '../../messages/en.json'
import nl from '../../messages/nl.json'
import de from '../../messages/de.json'
import es from '../../messages/es.json'

// next-intl messages parity (the CRM i18n corpus, messages/*.json). Mirrors
// the marketing dict.test.ts gate: a key present in en but missing in another
// locale would silently fall back to English at runtime. This makes that a
// build-time CI failure instead (LOC-13).

type Json = Record<string, unknown>

function flatten(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? flatten(v as Json, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )
}

describe('messages parity (next-intl en/nl/de/es)', () => {
  const baseKeys = new Set(flatten(en as Json))

  for (const [name, msgs] of [
    ['nl', nl],
    ['de', de],
    ['es', es],
  ] as const) {
    const keys = new Set(flatten(msgs as Json))

    it(`${name} contains every en key`, () => {
      const missing = [...baseKeys].filter((k) => !keys.has(k))
      expect(missing).toEqual([])
    })

    it(`${name} has no extra keys vs en`, () => {
      const extra = [...keys].filter((k) => !baseKeys.has(k))
      expect(extra).toEqual([])
    })
  }
})
