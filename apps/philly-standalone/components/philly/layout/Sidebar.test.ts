/* Sidebar nav active-state regression tests.
   ──────────────────────────────────────────────────────────────────
   Pins the 2026-05-26 bugfix Juan reported:
   "only highlight the tab you are on never highlight the dashboard
    if you are not on that specific page, in all languages and geos."

   Two failure modes the prior code had:

   1. The locale-strip regex only handled (en|nl). DE/ES/FR users on
      /de/contacts saw nothing highlighted in the sidebar.

   2. `path.startsWith(item.href)` had no slash-boundary, so in
      theory `/setting` would match `/settings/*` (no such routes
      exist today but the regression would be invisible until one was
      added).

   This suite pins the FIXED behavior: pure-function tests on
   isNavItemActive — no React rendering needed. */

import { describe, it, expect } from 'vitest'
import { isNavItemActive } from './Sidebar'

describe('isNavItemActive — sidebar nav highlight logic', () => {
  describe('Dashboard (href="/") — strict root-only active', () => {
    it('IS active on the literal "/" path', () => {
      expect(isNavItemActive('/', '/')).toBe(true)
    })

    it('is NOT active on /contacts', () => {
      // The bug Juan reported: dashboard highlighted on non-dashboard pages.
      expect(isNavItemActive('/contacts', '/')).toBe(false)
    })

    it('is NOT active on /settings', () => {
      expect(isNavItemActive('/settings', '/')).toBe(false)
    })

    it('is NOT active on /settings/features (deep route)', () => {
      expect(isNavItemActive('/settings/features', '/')).toBe(false)
    })

    it('is NOT active on /admin/orgs (PR-3 super-admin page)', () => {
      expect(isNavItemActive('/admin/orgs', '/')).toBe(false)
    })

    it('is NOT active on /help (PR-45 FAQ page)', () => {
      expect(isNavItemActive('/help', '/')).toBe(false)
    })
  })

  describe('Non-root items — exact match or sub-route', () => {
    it('exact match: /contacts highlights Contacts', () => {
      expect(isNavItemActive('/contacts', '/contacts')).toBe(true)
    })

    it('sub-route: /contacts/123 highlights Contacts', () => {
      expect(isNavItemActive('/contacts/123', '/contacts')).toBe(true)
    })

    it('deep sub-route: /contacts/123/edit highlights Contacts', () => {
      expect(isNavItemActive('/contacts/123/edit', '/contacts')).toBe(true)
    })

    it('different page: /contacts does NOT highlight /projects', () => {
      expect(isNavItemActive('/contacts', '/projects')).toBe(false)
    })

    it('boundary safety: hypothetical /contactsX does NOT highlight /contacts', () => {
      // This is the bug class `startsWith('/contacts')` had — no
      // slash boundary. Even though no /contactsX route exists today,
      // this test prevents the regression if one ever gets added
      // (e.g., /contacts-archive).
      expect(isNavItemActive('/contacts-archive', '/contacts')).toBe(false)
    })

    it('boundary safety: /settings-old does NOT highlight /settings', () => {
      expect(isNavItemActive('/settings-old', '/settings')).toBe(false)
    })
  })

  describe('Settings + sub-routes', () => {
    it('/settings highlights Settings', () => {
      expect(isNavItemActive('/settings', '/settings')).toBe(true)
    })

    it('/settings/features highlights Settings (sub-route)', () => {
      expect(isNavItemActive('/settings/features', '/settings')).toBe(true)
    })

    it('/settings/billing highlights Settings (sub-route)', () => {
      expect(isNavItemActive('/settings/billing', '/settings')).toBe(true)
    })
  })

  describe('Admin sub-routes (PR-3 super-admin)', () => {
    it('/admin/orgs highlights /admin/orgs (exact)', () => {
      expect(isNavItemActive('/admin/orgs', '/admin/orgs')).toBe(true)
    })

    it('/admin/orgs/[id]/features highlights /admin/orgs (sub-route)', () => {
      expect(isNavItemActive('/admin/orgs/cust_001/features', '/admin/orgs')).toBe(true)
    })
  })

  describe('Only ONE item active at a time (Juan\'s requirement)', () => {
    // Synthesize the NAV_PRIMARY catalog and check that exactly one
    // matches each test path. Pins the "never highlight multiple tabs"
    // invariant.
    const NAV_HREFS = [
      '/',
      '/projects',
      '/contacts',
      '/impact',
      '/reports',
      '/kanban',
      '/deals',
      '/calendar',
      '/timeline',
      '/documents',
      '/inbox',
      '/email',
      '/sms',
      '/templates',
      '/pages',
      '/settings',
      '/admin/orgs',
      '/help',
    ]

    function countActive(currentPath: string): number {
      return NAV_HREFS.filter(href => isNavItemActive(currentPath, href)).length
    }

    it.each([
      ['/', 1],
      ['/contacts', 1],
      ['/contacts/123', 1],
      ['/settings/features', 1],
      ['/admin/orgs/x/features', 1],
      ['/help', 1],
      ['/email', 1],
    ])('on %s, exactly %d nav item is active', (path, expected) => {
      expect(countActive(path)).toBe(expected)
    })
  })
})
