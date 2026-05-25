/* Feature-toggle precedence resolver — TDD-pinned matrix.
   ─────────────────────────────────────────────────────────────────
   Written BEFORE the implementation (in the cross-org.test.ts /
   webhook-test.ts pattern). Each test pins one precedence rule of
   the 9-rule decision tree that resolve() implements:

     1.  superAdminOverride='FORCED_OFF'             → off (terminal, highest)
     2a. superAdminOverride='FORCED_ON' + in-plan    → on  (bypass global+org+default)
     2b. superAdminOverride='FORCED_ON' + out-of-plan→ on  (preview-feature, distinct source)
     3.  !planAllowsFeature                          → off (terminal, client can't override)
     4.  globalFlag=false                            → off (global kill-switch)
     5.  orgFlag=false                               → off (client-admin opted out)
     6.  orgFlag=true                                → on
     7.  globalFlag=true                             → on
     8.  defaultEnabled=true                         → on
     9.  defaultEnabled=false                        → off

   The `source` field on ResolveResult IS the UX contract — UIs read
   it to show users WHY a feature is off. Don't rename source enum
   values without a coordinated UI update.

   These tests run hermetically (no Prisma, no DB) because resolve()
   is a pure function: input → output, no side-effects. Run in <5ms.
   ──────────────────────────────────────────────────────────────── */

import { describe, it, expect } from 'vitest'
import { resolve, type ResolveInput, type ResolveReason } from './resolve'

// Helper — most tests start from a "happy path" baseline and override
// just the one input under test.
function baseline(overrides: Partial<ResolveInput> = {}): ResolveInput {
  return {
    feature: 'ai-contact-enrichment',
    planAllowsFeature: true,
    globalFlag: undefined,
    orgFlag: undefined,
    superAdminOverride: 'INHERIT',
    defaultEnabled: true,
    ...overrides,
  }
}

describe('resolve() — precedence rules', () => {
  describe('Rule 1: super-admin FORCED_OFF is terminal (beats everything below)', () => {
    it('FORCED_OFF beats planAllows=true', () => {
      const r = resolve(baseline({ superAdminOverride: 'FORCED_OFF', planAllowsFeature: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })

    it('FORCED_OFF beats globalFlag=true', () => {
      const r = resolve(baseline({ superAdminOverride: 'FORCED_OFF', globalFlag: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })

    it('FORCED_OFF beats orgFlag=true', () => {
      const r = resolve(baseline({ superAdminOverride: 'FORCED_OFF', orgFlag: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })

    it('FORCED_OFF beats defaultEnabled=true', () => {
      const r = resolve(baseline({ superAdminOverride: 'FORCED_OFF', defaultEnabled: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })

    it('FORCED_OFF beats EVERYTHING-on simultaneously', () => {
      const r = resolve({
        feature: 'webhooks',
        planAllowsFeature: true,
        globalFlag: true,
        orgFlag: true,
        superAdminOverride: 'FORCED_OFF',
        defaultEnabled: true,
      })
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })
  })

  describe('Rule 2: super-admin FORCED_ON has TWO sub-cases (in-plan vs out-of-plan)', () => {
    it('FORCED_ON + in-plan → enabled with source "super-admin-forced-on"', () => {
      const r = resolve(baseline({ superAdminOverride: 'FORCED_ON', planAllowsFeature: true }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-on')
    })

    it('FORCED_ON + out-of-plan → enabled with distinct source (preview-feature)', () => {
      // Juan wants to enable Business-tier feature for Operator-tier customer
      // — a preview/early-access activation. Allow it but mark source so
      // billing/audit can see this row is anomalous.
      const r = resolve(baseline({ superAdminOverride: 'FORCED_ON', planAllowsFeature: false }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-on-out-of-plan')
    })

    it('FORCED_ON + in-plan bypasses globalFlag=false (super-admin > global kill-switch)', () => {
      const r = resolve(baseline({
        superAdminOverride: 'FORCED_ON',
        planAllowsFeature: true,
        globalFlag: false,
      }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-on')
    })

    it('FORCED_ON + in-plan bypasses orgFlag=false (client opt-out)', () => {
      // Edge case: client-admin disabled the feature locally, but super-admin
      // forces it back on. Super-admin wins; the client-side toggle is
      // ignored. This is by design — super-admin override means it.
      const r = resolve(baseline({
        superAdminOverride: 'FORCED_ON',
        planAllowsFeature: true,
        orgFlag: false,
      }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-on')
    })
  })

  describe('Rule 3: plan-not-included is terminal-off for non-super-admin paths', () => {
    it('Plan does not include feature → disabled regardless of other flags', () => {
      const r = resolve(baseline({
        planAllowsFeature: false,
        globalFlag: true,
        orgFlag: true,
        defaultEnabled: true,
      }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('plan-not-included')
    })

    it('Client cannot enable a not-in-plan feature even by setting orgFlag=true', () => {
      // Defense against the case: client somehow inserts a FeatureFlag row
      // with enabled=true for a feature their plan doesn't unlock.
      // (Shouldn't happen via the UI, but the resolver must defend against it.)
      const r = resolve(baseline({ planAllowsFeature: false, orgFlag: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('plan-not-included')
    })
  })

  describe('Rule 4: globalFlag=false is the global kill-switch', () => {
    it('globalFlag=false → disabled (when no super-admin override)', () => {
      const r = resolve(baseline({ globalFlag: false }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('global-disabled')
    })

    it('globalFlag=false beats orgFlag=true (global is the higher kill-switch)', () => {
      // Reasoning: when the platform owner globally disables a feature
      // (e.g., third-party API outage), client-admin "enable" should not
      // override. Otherwise the client's request fails confusingly.
      const r = resolve(baseline({ globalFlag: false, orgFlag: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('global-disabled')
    })

    it('globalFlag=false beats defaultEnabled=true', () => {
      const r = resolve(baseline({ globalFlag: false, defaultEnabled: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('global-disabled')
    })
  })

  describe('Rule 5: orgFlag=false is client-admin opt-out', () => {
    it('orgFlag=false → disabled with source "client-admin-disabled"', () => {
      const r = resolve(baseline({ orgFlag: false }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('client-admin-disabled')
    })

    it('orgFlag=false beats defaultEnabled=true', () => {
      const r = resolve(baseline({ orgFlag: false, defaultEnabled: true }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('client-admin-disabled')
    })

    it('orgFlag=false beats globalFlag=undefined (default global = on does not save)', () => {
      const r = resolve(baseline({ orgFlag: false, globalFlag: undefined }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('client-admin-disabled')
    })
  })

  describe('Rule 6 + 7: explicit enable propagates', () => {
    it('orgFlag=true → enabled', () => {
      const r = resolve(baseline({ orgFlag: true, defaultEnabled: false }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('enabled')
    })

    it('globalFlag=true with no orgFlag → enabled', () => {
      const r = resolve(baseline({ globalFlag: true, orgFlag: undefined, defaultEnabled: false }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('enabled')
    })
  })

  describe('Rule 8 + 9: code-side default fallback (no flags set)', () => {
    it('defaultEnabled=true with no flags → enabled', () => {
      const r = resolve(baseline({
        globalFlag: undefined,
        orgFlag: undefined,
        defaultEnabled: true,
      }))
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('enabled')
    })

    it('defaultEnabled=false with no flags → disabled with source "default-disabled"', () => {
      const r = resolve(baseline({
        globalFlag: undefined,
        orgFlag: undefined,
        defaultEnabled: false,
      }))
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('default-disabled')
    })
  })

  describe('Real-world scenarios', () => {
    it('Juan early-activates Business-tier "scim_users" for an Operator-tier customer', () => {
      // Operator plan doesn't unlock scim; Juan FORCED_ON for preview.
      const r = resolve({
        feature: 'scim',
        planAllowsFeature: false,
        superAdminOverride: 'FORCED_ON',
        defaultEnabled: true,
      })
      expect(r.enabled).toBe(true)
      // out-of-plan source so audit + billing can flag it
      expect(r.source).toBe<ResolveReason>('super-admin-forced-on-out-of-plan')
    })

    it('Client-admin disables drip-campaigns during data migration', () => {
      const r = resolve({
        feature: 'drip-campaigns',
        planAllowsFeature: true,         // Team-plan includes drip
        orgFlag: false,                   // client paused
        defaultEnabled: true,
        superAdminOverride: 'INHERIT',
      })
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('client-admin-disabled')
    })

    it('Global kill-switch during Anthropic API outage disables AI everywhere', () => {
      const r = resolve({
        feature: 'ai-contact-enrichment',
        planAllowsFeature: true,
        globalFlag: false,
        orgFlag: true,                    // some client had opted in
        defaultEnabled: true,
        superAdminOverride: 'INHERIT',
      })
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('global-disabled')
    })

    it('Super-admin FORCED_OFF for compliance during a security incident', () => {
      const r = resolve({
        feature: 'webhooks',
        planAllowsFeature: true,
        globalFlag: true,
        orgFlag: true,
        defaultEnabled: true,
        superAdminOverride: 'FORCED_OFF',  // Juan paused this org's webhooks pending audit
      })
      expect(r.enabled).toBe(false)
      expect(r.source).toBe<ResolveReason>('super-admin-forced-off')
    })

    it('Happy-path default: feature in plan, no overrides, default-on', () => {
      const r = resolve(baseline())
      expect(r.enabled).toBe(true)
      expect(r.source).toBe<ResolveReason>('enabled')
    })
  })

  describe('Determinism + purity', () => {
    it('Same input twice returns identical output (no side effects)', () => {
      const input = baseline({ orgFlag: false })
      const r1 = resolve(input)
      const r2 = resolve(input)
      expect(r1).toEqual(r2)
    })

    it('Input object is not mutated', () => {
      const input = baseline({ orgFlag: false, globalFlag: true })
      const snapshot = JSON.stringify(input)
      resolve(input)
      expect(JSON.stringify(input)).toBe(snapshot)
    })

    it('Returns a fresh object each call (caller can mutate result without polluting future calls)', () => {
      const input = baseline()
      const r1 = resolve(input)
      r1.enabled = false
      r1.source = 'super-admin-forced-off'
      const r2 = resolve(input)
      expect(r2.enabled).toBe(true)
      expect(r2.source).toBe<ResolveReason>('enabled')
    })
  })
})
