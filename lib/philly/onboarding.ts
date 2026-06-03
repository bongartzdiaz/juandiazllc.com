/* ---------------------------------------------------------------
   Onboarding wizard — state machine.

   The wizard is 6 steps with a strict forward order; the cursor
   lives on `Organization.onboardingStep`. Step transitions are
   server-validated so a tab refresh after a deploy can't drop a
   user into an invalid state.

   See `_drafts/specs/onboarding-wizard-prd.md` for the spec.
   --------------------------------------------------------------- */

export const ONBOARDING_STEPS = [
  'welcome',
  'org',
  'team',
  'contacts',
  'calendar',
  'done',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

const STEP_ORDER: Record<OnboardingStep, number> = {
  welcome: 0,
  org: 1,
  team: 2,
  contacts: 3,
  calendar: 4,
  done: 5,
}

/** Returns true when `next` is a legal forward transition from `current`,
 *  or when it's the same step (idempotent re-saves). The only legal backward
 *  move is going from `done` back to a step — used by the resume-banner
 *  flow when an admin wants to redo something. */
export function canAdvanceTo(current: OnboardingStep, next: OnboardingStep): boolean {
  if (current === next) return true
  if (current === 'done') return true // can revisit any step from done
  return STEP_ORDER[next] >= STEP_ORDER[current]
}

/** Return the URL path for a given step. */
export function stepHref(step: OnboardingStep): string {
  return `/philly/onboarding/${step}`
}

/** Progress fraction for the indicator UI. `done` reports 1.0. */
export function stepProgress(step: OnboardingStep): { current: number; total: number } {
  // Total is 5 user-visible steps (welcome..calendar); `done` is the celebration.
  const total = 5
  if (step === 'done') return { current: total, total }
  return { current: STEP_ORDER[step] + 1, total }
}

/** Compute "is the org in a state that can complete onboarding?" — used by
 *  the resume-banner to decide if it should be shown. */
export function isOnboardingActive(state: {
  onboardingStep: string
  onboardingCompletedAt: Date | null
  onboardingSkippedAt: Date | null
}): boolean {
  if (state.onboardingCompletedAt) return false
  if (state.onboardingStep === 'done') return false
  // If skipped < 24h ago, hide the banner so the user gets a reprieve.
  if (state.onboardingSkippedAt) {
    const ageMs = Date.now() - state.onboardingSkippedAt.getTime()
    if (ageMs < 24 * 60 * 60 * 1000) return false
  }
  return true
}
