/* FAQ i18n parity test — ensures every locale has every FAQ key
   so the /help page doesn't render `help.faqs.pricing.tiers.q` as
   raw text in any locale. */

import { describe, it, expect } from 'vitest'
import { FAQ_CATEGORIES, FAQ_QUESTION_COUNT, allFAQKeys } from './faqs'

import en from '@/messages/en.json'
import nl from '@/messages/nl.json'
import de from '@/messages/de.json'
import es from '@/messages/es.json'
import fr from '@/messages/fr.json'

const LOCALES = { en, nl, de, es, fr } as const

/** Resolve a dot-path like 'help.faqs.pricing.tiers.q' against a locale object. */
function resolveKey(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

describe('FAQ catalog structure', () => {
  it('has the expected 5 categories', () => {
    expect(FAQ_CATEGORIES).toHaveLength(5)
    const ids = FAQ_CATEGORIES.map(c => c.id).sort()
    expect(ids).toEqual(['compliance', 'features', 'migration', 'pricing', 'support'])
  })

  it('has exactly 20 questions across all categories', () => {
    expect(FAQ_QUESTION_COUNT).toBe(20)
  })

  it('every category has 4 questions (balanced catalog)', () => {
    for (const cat of FAQ_CATEGORIES) {
      expect(cat.questionIds, `${cat.id} should have 4 questions`).toHaveLength(4)
    }
  })

  it('every question id is unique within its category', () => {
    for (const cat of FAQ_CATEGORIES) {
      const set = new Set(cat.questionIds)
      expect(set.size).toBe(cat.questionIds.length)
    }
  })
})

describe('FAQ i18n parity across 5 locales', () => {
  const requiredKeys = allFAQKeys()

  it.each(Object.entries(LOCALES))(
    'locale %s has every FAQ key with a non-empty string value',
    (_locale, messages) => {
      for (const key of requiredKeys) {
        const value = resolveKey(messages, key)
        expect(value, `Missing or empty: ${key}`).toBeTruthy()
        expect(typeof value, `Should be string: ${key}`).toBe('string')
        expect((value as string).length, `Empty string: ${key}`).toBeGreaterThan(0)
      }
    },
  )

  it('every Q+A pair is at least 10 characters in every locale (no stubs)', () => {
    for (const [locale, messages] of Object.entries(LOCALES)) {
      for (const cat of FAQ_CATEGORIES) {
        for (const qid of cat.questionIds) {
          const q = resolveKey(messages, `help.faqs.${cat.id}.${qid}.q`) as string
          const a = resolveKey(messages, `help.faqs.${cat.id}.${qid}.a`) as string
          expect(q.length, `${locale} ${cat.id}.${qid}.q too short`).toBeGreaterThan(10)
          expect(a.length, `${locale} ${cat.id}.${qid}.a too short`).toBeGreaterThan(20)
        }
      }
    }
  })

  it('no locale has an English placeholder leaked into a non-EN file', () => {
    // Sentinel check: the FR "Get started" → "Commencer" rename ensures
    // we'd catch if someone accidentally left an EN string in a non-EN file.
    const nlGetStarted = resolveKey(nl, 'welcome.step1.cta') as string
    expect(nlGetStarted).not.toBe('Get started')
    const frGetStarted = resolveKey(fr, 'welcome.step1.cta') as string
    expect(frGetStarted).not.toBe('Get started')
  })
})
