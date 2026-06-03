import { describe, it, expect } from 'vitest'
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  searchArticles,
  getArticle,
  getArticlesInCategory,
} from './articles'

describe('HELP_ARTICLES corpus integrity', () => {
  it('every article has a non-empty slug, title, summary, body, category', () => {
    for (const a of HELP_ARTICLES) {
      expect(a.slug).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.summary).toBeTruthy()
      expect(a.body).toBeTruthy()
      expect(a.category).toBeTruthy()
    }
  })

  it('slugs are unique (bookmarks must be stable)', () => {
    const slugs = new Set<string>()
    for (const a of HELP_ARTICLES) {
      expect(slugs.has(a.slug)).toBe(false)
      slugs.add(a.slug)
    }
  })

  it('every article belongs to a known category', () => {
    const known = new Set(HELP_CATEGORIES.map((c) => c.key))
    for (const a of HELP_ARTICLES) {
      expect(known.has(a.category)).toBe(true)
    }
  })

  it('summary fits in a list row (<= 140 chars)', () => {
    for (const a of HELP_ARTICLES) {
      expect(a.summary.length).toBeLessThanOrEqual(140)
    }
  })

  it('every category has at least one article', () => {
    for (const cat of HELP_CATEGORIES) {
      expect(getArticlesInCategory(cat.key).length).toBeGreaterThan(0)
    }
  })

  it('the corpus covers the launch must-haves', () => {
    // If any of these get renamed, the marketing site / onboarding email
    // links break — keep the assertion red until they're updated.
    const required = [
      'connect-google-calendar',
      'connect-outlook-calendar',
      'export-my-data',
      'delete-my-account',
      'start-free-trial',
      'still-stuck',
    ]
    for (const slug of required) {
      expect(getArticle(slug)).toBeDefined()
    }
  })
})

describe('searchArticles ranking', () => {
  it('returns the full corpus on empty query', () => {
    expect(searchArticles('').length).toBe(HELP_ARTICLES.length)
  })

  it('a title-match outranks a body-only match', () => {
    // "Calendar" appears as a title word in connect-google-calendar
    // and also inside many bodies.
    const results = searchArticles('calendar')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title.toLowerCase()).toContain('calendar')
  })

  it('a tag-match outranks a body-only match', () => {
    // "stripe" appears as a tag on manage-billing-portal but only
    // in the body of a few others.
    const results = searchArticles('stripe')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].tags ?? []).toContain('stripe')
  })

  it('returns an empty array when nothing matches', () => {
    expect(searchArticles('xyzzy-nothing-matches-this')).toEqual([])
  })

  it('is case-insensitive', () => {
    const lower = searchArticles('calendar')
    const upper = searchArticles('CALENDAR')
    expect(upper.map((a) => a.slug)).toEqual(lower.map((a) => a.slug))
  })
})

describe('getArticle / getArticlesInCategory', () => {
  it('returns undefined for an unknown slug', () => {
    expect(getArticle('does-not-exist')).toBeUndefined()
  })

  it('returns the right category subset', () => {
    const billing = getArticlesInCategory('billing')
    expect(billing.length).toBeGreaterThan(0)
    for (const a of billing) {
      expect(a.category).toBe('billing')
    }
  })
})
