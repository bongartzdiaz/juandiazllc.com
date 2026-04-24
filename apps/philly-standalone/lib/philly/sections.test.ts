import { describe, it, expect } from 'vitest'
import {
  SECTIONS,
  isValidSectionSlug,
  parseDashboardSections,
  hasSection,
  sectionForPath,
} from './sections'

describe('isValidSectionSlug', () => {
  it('accepts every slug defined in the catalog', () => {
    for (const s of SECTIONS) expect(isValidSectionSlug(s.slug)).toBe(true)
  })

  it('rejects unknown slugs', () => {
    expect(isValidSectionSlug('totally-made-up')).toBe(false)
    expect(isValidSectionSlug('')).toBe(false)
  })
})

describe('parseDashboardSections', () => {
  it('returns null for null / undefined', () => {
    expect(parseDashboardSections(null)).toBeNull()
    expect(parseDashboardSections(undefined)).toBeNull()
  })

  it('returns null for non-array values (string, number, object)', () => {
    expect(parseDashboardSections('deals')).toBeNull()
    expect(parseDashboardSections(42)).toBeNull()
    expect(parseDashboardSections({ deals: true })).toBeNull()
  })

  it('filters out unknown slugs and non-strings', () => {
    const result = parseDashboardSections([
      'dashboard',
      'totally-made-up',
      42,
      'deals',
      null,
    ])
    expect(result).toEqual(['dashboard', 'deals'])
  })

  it('returns null for an array that resolves to zero valid slugs', () => {
    // Matches the documented behaviour: empty / malformed → null (full
    // access), so admins can't accidentally lock a user out by passing
    // a list of typos.
    expect(parseDashboardSections(['not-a-slug', 123])).toBeNull()
    expect(parseDashboardSections([])).toBeNull()
  })

  it('preserves a valid list verbatim', () => {
    const input = ['dashboard', 'contacts', 'deals']
    expect(parseDashboardSections(input)).toEqual(input)
  })
})

describe('hasSection', () => {
  it('returns true for any admin regardless of allow-list', () => {
    expect(hasSection({ role: 'admin', dashboardSections: [] }, 'deals')).toBe(true)
    expect(hasSection({ role: 'admin', dashboardSections: ['dashboard'] }, 'deals')).toBe(true)
    expect(hasSection({ role: 'admin', dashboardSections: null }, 'deals')).toBe(true)
  })

  it('returns true when dashboardSections is null (full access)', () => {
    expect(hasSection({ role: 'viewer', dashboardSections: null }, 'deals')).toBe(true)
    expect(hasSection({ role: 'manager', dashboardSections: null }, 'settings')).toBe(true)
  })

  it('returns true only when the slug is in the allow-list', () => {
    const user = { role: 'viewer', dashboardSections: ['dashboard', 'contacts'] }
    expect(hasSection(user, 'dashboard')).toBe(true)
    expect(hasSection(user, 'contacts')).toBe(true)
    expect(hasSection(user, 'deals')).toBe(false)
  })

  it('fails closed on unknown slugs even for admins', () => {
    // Guards against a typo in a requireSection() call silently granting
    // access (since admins bypass the allow-list, we need the slug to
    // still validate).
    expect(hasSection({ role: 'admin', dashboardSections: null }, 'not-a-section')).toBe(false)
  })

  it('fails closed when dashboardSections is an empty list', () => {
    expect(hasSection({ role: 'viewer', dashboardSections: [] }, 'dashboard')).toBe(false)
  })
})

describe('sectionForPath', () => {
  it('returns null for an unknown path', () => {
    expect(sectionForPath('/marketing/landing')).toBeNull()
    expect(sectionForPath('/')).toBeNull()
  })

  it('matches the canonical landing path exactly', () => {
    expect(sectionForPath('/deals')?.slug).toBe('deals')
    expect(sectionForPath('/contacts')?.slug).toBe('contacts')
  })

  it('inherits parent section for nested routes', () => {
    expect(sectionForPath('/deals/123/edit')?.slug).toBe('deals')
    expect(sectionForPath('/projects/abc')?.slug).toBe('projects')
  })

  it('picks the longest matching prefix so /philly/settings/webhooks stays in settings', () => {
    // `/` (dashboard) is also a prefix of `/settings/*`,
    // but /philly/settings is longer so it wins.
    const match = sectionForPath('/settings/webhooks')
    expect(match?.slug).toBe('settings')
  })

  it('maps /philly root exactly to the dashboard section', () => {
    expect(sectionForPath('/')?.slug).toBe('dashboard')
  })

  it('does not match sibling prefixes that only share a leading segment', () => {
    // `/open-houses` must not match `/` when a more
    // specific section exists. Also verifies `startsWith` uses a slash
    // boundary — `/openhouseX` should not collide with `open-houses`.
    expect(sectionForPath('/open-houses')?.slug).toBe('openHouses')
    expect(sectionForPath('/open-houses/feb-3')?.slug).toBe('openHouses')
  })
})
