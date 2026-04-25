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
import { createClient } from '@/lib/supabase/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { hasSection, parseDashboardSections } from '@/lib/philly/sections'

export type AuthScope = {
  userId: string
  organizationId: string
  role: string
  email: string | null
  // Null = full access (admins + legacy users).
  // Array = strict allow-list of section slugs.
  dashboardSections: string[] | null
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
    select: { id: true, email: true, role: true, organizationId: true, dashboardSections: true },
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

    return {
      userId: phillyUser.id,
      organizationId: phillyUser.organizationId,
      role: authoritativeRole,
      email: phillyUser.email,
      dashboardSections: parseDashboardSections(phillyUser.dashboardSections),
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
 * allowed list. Returns a 403 NextResponse if the user lacks permission.
 */
export async function requireRole(
  allowed: ReadonlyArray<'admin' | 'manager' | 'viewer'>,
): Promise<AuthScope | NextResponse> {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  if (!allowed.includes(scope.role as 'admin' | 'manager' | 'viewer')) {
    return jsonError('Forbidden', 403)
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
  return scope
}
