/* ---------------------------------------------------------------
   Auth helpers for Philly API routes — Supabase-backed.

   Single-sign-on: the brand site authenticates users via Supabase
   (juandiazllc.com/login). This helper reads that Supabase session
   server-side and maps the Supabase user to a Philly User row in
   MariaDB (auto-provisioned on first sight so brand users can enter
   the CRM without a separate signup).

   Every Philly API route calls requireScope() / requireRole() and
   gets back { userId, organizationId, role, email } — exactly the
   same contract we had under NextAuth, so ~85 route handlers keep
   working unchanged.
   --------------------------------------------------------------- */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { hasSection, parseDashboardSections } from '@/lib/philly/sections'

/**
 * Cookie name carrying the user's active-org id (Bundle G).
 * Set by POST /api/me/active-org when they switch in the topbar.
 * Empty / unset → fall back to User.organizationId (home org).
 * Pointing at an org the user is no longer a member of → fall back
 * to home (cookie left in place; the next switch will clear it).
 */
export const ACTIVE_ORG_COOKIE = 'philly-active-org'

export type AuthScope = {
  userId: string
  organizationId: string
  role: string
  email: string | null
  // Null = full access (admins + legacy users).
  // Array = strict allow-list of section slugs.
  dashboardSections: string[] | null
  // True if this user has finished TOTP enrollment (twoFactorEnabled
  // is true AND a TOTP secret exists). Used by `requireRole(['admin'])`
  // for mandatory-2FA enforcement on admins.
  mfaEnrolled: boolean
}

/**
 * Whether mandatory-2FA enforcement on admins is active. Defaults to
 * `true` in production and `false` everywhere else so dev / test
 * environments don't trip it before the operator has gone through
 * setup. Override via env: `ADMIN_MFA_ENFORCED=true` or `=false`.
 */
export function isAdminMfaEnforced(): boolean {
  const raw = process.env.ADMIN_MFA_ENFORCED?.trim().toLowerCase()
  if (raw === 'true' || raw === '1') return true
  if (raw === 'false' || raw === '0') return false
  return process.env.NODE_ENV === 'production'
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Find the Philly user that belongs to this Supabase email.
 *
 * Returns `null` when no row exists — the caller must redirect the
 * Supabase-authenticated user to the onboarding flow so they can
 * either create a new organization (and become its admin) or wait
 * for an admin to invite them.
 *
 * The previous auto-provisioning behavior (drop everyone into a
 * single shared 'Volitfy' org) was a multi-tenancy break: two
 * unrelated companies signing up would share a tenant. Onboarding
 * is the deliberate fix.
 */
async function resolvePhillyUser(email: string) {
  const prisma = getAuthPrisma()

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      dashboardSections: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  })
  return user
}

/**
 * Resolves the current session from Supabase cookies and returns a
 * strongly typed AuthScope, or a NextResponse with:
 *   401 — not signed in to Supabase
 *   409 — signed in but no Philly User row yet → must complete
 *         onboarding at /onboarding (create org or accept an invite).
 *         Body: { error, code: 'NEEDS_ONBOARDING' } so clients can
 *         distinguish from a generic 403.
 *
 * Routes that participate in onboarding (POST /api/onboarding/*)
 * MUST use `requireSupabaseUser()` instead, since the caller has no
 * Philly User row yet.
 */
export async function requireScope(): Promise<AuthScope | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser?.email) {
    return jsonError('Unauthorized', 401)
  }

  try {
    const phillyUser = await resolvePhillyUser(supabaseUser.email)
    if (!phillyUser) {
      return NextResponse.json(
        { error: 'Onboarding required', code: 'NEEDS_ONBOARDING' },
        { status: 409 },
      )
    }
    if (!phillyUser.organizationId) {
      return jsonError('User has no organization scope', 403)
    }

    // Sync role back to Supabase app_metadata so the client hook
    // (useSupabaseUser) matches what the server enforces from MariaDB.
    // This is best-effort: a failure here should not block the request.
    const authoritativeRole = phillyUser.role ?? 'viewer'
    const currentMetaRole = (supabaseUser.app_metadata as Record<string, unknown> | null)?.role
    if (currentMetaRole !== authoritativeRole) {
      try {
        // updateUser on app_metadata requires service-role; this call
        // is a no-op when running with anon key, which is fine — it
        // just means the drift will persist until a service-role job
        // (e.g. a nightly sync) catches it.
        await supabase.auth.updateUser({
          data: { role: authoritativeRole },
        })
      } catch {
        /* best-effort */
      }
    }

    // Multi-org resolution (Bundle G):
    // 1. Read the active-org cookie. If unset, the active org IS the
    //    user's home org (User.organizationId).
    // 2. If the cookie points at an org the user has a Membership in,
    //    use that as the active org and read role + sections from
    //    the Membership row (per-org, not the home-org cached values
    //    on User).
    // 3. If the cookie points at an org with no Membership for this
    //    user — they were removed, or the cookie is forged — fall
    //    back silently to home org. We don't clear the cookie here
    //    (that would race with the org-switcher); the next switch
    //    will overwrite it cleanly.
    const cookieJar = await cookies()
    const requestedOrgId = cookieJar.get(ACTIVE_ORG_COOKIE)?.value || null

    let activeOrgId = phillyUser.organizationId
    let activeRole = authoritativeRole
    let activeSections = parseDashboardSections(phillyUser.dashboardSections)

    if (requestedOrgId && requestedOrgId !== phillyUser.organizationId) {
      const prisma = getAuthPrisma()
      const membership = await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: phillyUser.id, organizationId: requestedOrgId } },
        select: { role: true, dashboardSections: true },
      })
      if (membership) {
        activeOrgId = requestedOrgId
        activeRole = membership.role
        activeSections = parseDashboardSections(membership.dashboardSections)
      }
      // Otherwise: silent fall-through to home org. Audit could log
      // this if it became operationally relevant.
    }

    return {
      userId: phillyUser.id,
      organizationId: activeOrgId,
      role: activeRole,
      email: phillyUser.email,
      dashboardSections: activeSections,
      mfaEnrolled: Boolean(phillyUser.twoFactorEnabled && phillyUser.twoFactorSecret),
    }
  } catch (err) {
    console.error('[requireScope] failed to resolve philly user', err)
    return jsonError('Auth provisioning failed', 500)
  }
}

export interface SupabaseSubject {
  email: string
  supabaseUserId: string
}

/**
 * For routes that must run BEFORE a Philly User row exists — i.e. the
 * onboarding flow. Returns just the Supabase identity. Anything that
 * needs an organization must use requireScope() instead.
 */
export async function requireSupabaseUser(): Promise<SupabaseSubject | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return jsonError('Unauthorized', 401)
  return { email: user.email, supabaseUserId: user.id }
}

/**
 * Same as requireScope but additionally verifies the role is in the
 * allowed list.
 *
 * Returns a NextResponse with:
 *   403 — role not allowed
 *   409 + { code: 'NEEDS_2FA' } — admin without 2FA enrolled, when
 *         mandatory-admin-2FA enforcement is active. The operator
 *         must complete /setup-2fa before reaching admin-gated
 *         endpoints. This adds the bank-grade requirement that
 *         high-privilege accounts must hold a second factor.
 *
 * Routes that participate in 2FA setup (POST /api/2fa/*) MUST use
 * `requireScope()` directly so an admin who hasn't enrolled yet
 * can still reach the setup endpoints.
 */
export async function requireRole(
  allowed: ReadonlyArray<'admin' | 'manager' | 'viewer'>,
): Promise<AuthScope | NextResponse> {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  if (!allowed.includes(scope.role as 'admin' | 'manager' | 'viewer')) {
    return jsonError('Forbidden', 403)
  }

  if (scope.role === 'admin' && !scope.mfaEnrolled && isAdminMfaEnforced()) {
    return NextResponse.json(
      { error: 'Admin must enroll TOTP 2FA before using admin endpoints', code: 'NEEDS_2FA' },
      { status: 409 },
    )
  }

  return scope
}

/**
 * Guards an API route by dashboard-section. Returns the scope on
 * success, or a 403 NextResponse if this user's `dashboardSections`
 * allow-list doesn't include `slug`. Admins always pass; users with
 * `dashboardSections === null` also pass (legacy/superadmin).
 *
 * Pass `allowedRoles` to additionally require the user's role is in
 * the list — same contract as `requireRole()` but folded in so a
 * mutation route only needs one call instead of two.
 *
 * Unknown slugs fail closed — defensive against typos introducing
 * unintended public access.
 */
export async function requireSection(
  slug: string,
  allowedRoles?: ReadonlyArray<'admin' | 'manager' | 'viewer'>,
): Promise<AuthScope | NextResponse> {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  if (!hasSection({ role: scope.role, dashboardSections: scope.dashboardSections }, slug)) {
    return jsonError('Forbidden', 403)
  }
  if (allowedRoles && !allowedRoles.includes(scope.role as 'admin' | 'manager' | 'viewer')) {
    return jsonError('Forbidden', 403)
  }
  if (
    allowedRoles &&
    allowedRoles.includes('admin') &&
    !allowedRoles.includes('manager') &&
    !allowedRoles.includes('viewer') &&
    scope.role === 'admin' &&
    !scope.mfaEnrolled &&
    isAdminMfaEnforced()
  ) {
    // Same NEEDS_2FA contract as requireRole — only fires when this
    // section is admin-only AND the admin hasn't enrolled.
    return NextResponse.json(
      { error: 'Admin must enroll TOTP 2FA before using admin endpoints', code: 'NEEDS_2FA' },
      { status: 409 },
    )
  }
  return scope
}
