/* Feature-toggle precedence resolver — pure function, no side effects.
   ─────────────────────────────────────────────────────────────────────
   This file is the SINGLE source of truth for "is feature X enabled for
   org Y right now?" — every API route, every page-load gating decision,
   every super-admin override badge in the UI reads from `resolve()`.

   Spec (mirrors resolve.test.ts, kept in lockstep):

     1.  superAdminOverride='FORCED_OFF'              → off (terminal, highest)
     2a. superAdminOverride='FORCED_ON' + in-plan     → on  (bypasses global+org+default)
     2b. superAdminOverride='FORCED_ON' + out-of-plan → on  (preview-feature, distinct source)
     3.  !planAllowsFeature                           → off (terminal, client cannot override)
     4.  globalFlag=false                             → off (global kill-switch)
     5.  orgFlag=false                                → off (client-admin opted out)
     6.  orgFlag=true                                 → on
     7.  globalFlag=true                              → on
     8.  defaultEnabled=true                          → on
     9.  defaultEnabled=false                         → off

   The `source` field IS the UX contract — UIs read it to show users WHY
   a feature is off ("Disabled by your administrator" vs. "Not included
   in your plan — upgrade to enable"). Don't rename source enum values
   without a coordinated UI + i18n update.

   Purity guarantees the tests pin (and downstream callers rely on):
     - No DB reads, no env-var reads, no Date.now()
     - Input object is never mutated
     - Same input → same output, every call
     - Fresh result object per call (caller may mutate freely)
   ──────────────────────────────────────────────────────────────────── */

/**
 * Super-admin override state stored on `OrgFeatureOverride` (PR-2 schema).
 *   - 'INHERIT': no override — fall through to global/org/default
 *   - 'FORCED_ON': Juan enabled this feature for this org (may bypass plan)
 *   - 'FORCED_OFF': Juan disabled this feature for this org (terminal)
 */
export type SuperAdminOverride = 'INHERIT' | 'FORCED_ON' | 'FORCED_OFF'

/**
 * Why a feature ended up in its enabled/disabled state. UI reads this to
 * render the right badge + i18n message. Order matches the 9-rule spec.
 */
export type ResolveReason =
  | 'super-admin-forced-off'
  | 'super-admin-forced-on'
  | 'super-admin-forced-on-out-of-plan'
  | 'plan-not-included'
  | 'global-disabled'
  | 'client-admin-disabled'
  | 'enabled'
  | 'default-disabled'

export interface ResolveInput {
  /** Feature key (for logging/audit; doesn't affect resolution). */
  feature: string
  /** True iff the org's current plan tier includes this feature. */
  planAllowsFeature: boolean
  /** Global FeatureFlag row's `enabled` value, or undefined if no row. */
  globalFlag?: boolean
  /** Org-scoped FeatureFlag row's `enabled` value, or undefined if no row. */
  orgFlag?: boolean
  /** Super-admin override stored on OrgFeatureOverride; 'INHERIT' if none. */
  superAdminOverride: SuperAdminOverride
  /** FEATURES[key].enabledByDefault — code-side fallback when no flags set. */
  defaultEnabled: boolean
}

export interface ResolveResult {
  enabled: boolean
  source: ResolveReason
}

/**
 * Resolve a feature's effective enabled-state for one org, given the
 * inputs the caller has already loaded (plan, flag rows, override row,
 * code-side default). Pure — see file header for guarantees.
 */
export function resolve(input: ResolveInput): ResolveResult {
  // Rule 1: super-admin FORCED_OFF is terminal (highest precedence).
  // Beats plan, global, org, default — even all-on simultaneously.
  if (input.superAdminOverride === 'FORCED_OFF') {
    return { enabled: false, source: 'super-admin-forced-off' }
  }

  // Rule 2: super-admin FORCED_ON has two sub-cases.
  // 2a: in-plan → standard force-on.
  // 2b: out-of-plan → still on, but distinct source so audit/billing can
  //     flag the row as preview/early-access (e.g., Juan giving an
  //     Operator-tier customer a Business-tier feature pre-upgrade).
  if (input.superAdminOverride === 'FORCED_ON') {
    return input.planAllowsFeature
      ? { enabled: true, source: 'super-admin-forced-on' }
      : { enabled: true, source: 'super-admin-forced-on-out-of-plan' }
  }

  // From here on, superAdminOverride === 'INHERIT' — fall through the
  // normal plan/global/org/default cascade.

  // Rule 3: plan does not include feature → terminal off.
  // Defends against the case where an orgFlag row somehow exists with
  // enabled=true for a feature the org's plan doesn't unlock (shouldn't
  // happen via UI, but the resolver is the last line of defense).
  if (!input.planAllowsFeature) {
    return { enabled: false, source: 'plan-not-included' }
  }

  // Rule 4: global kill-switch (e.g., upstream API outage).
  // Beats org-level enable — when platform owner says "off", clients
  // should not get a confusing partial-failure UX.
  if (input.globalFlag === false) {
    return { enabled: false, source: 'global-disabled' }
  }

  // Rule 5: client-admin explicitly disabled (opt-out within their org).
  if (input.orgFlag === false) {
    return { enabled: false, source: 'client-admin-disabled' }
  }

  // Rule 6: client-admin explicitly enabled.
  if (input.orgFlag === true) {
    return { enabled: true, source: 'enabled' }
  }

  // Rule 7: global explicitly enabled (and no org-level row to defer to).
  if (input.globalFlag === true) {
    return { enabled: true, source: 'enabled' }
  }

  // Rule 8 + 9: no flags set anywhere — fall back to code-side default.
  return input.defaultEnabled
    ? { enabled: true, source: 'enabled' }
    : { enabled: false, source: 'default-disabled' }
}
