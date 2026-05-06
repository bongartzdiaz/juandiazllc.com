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

export type AuthScope = {
  userId: string
  organizationId: string
  role: string
  email: string | null
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Find the Philly user that belongs to this Supabase email, or
 * auto-provision one on first sign-in. The first user onboarded lands
 * in a default 'Volitfy' org as admin; later users join the same org
 * as viewer (upgrade via admin UI).
 */
/**
 * Sentinel thrown when a soft-deleted user tries to sign in. Caught by
 * requireScope and turned into a 410 Gone — never auto-resurrected.
 */
class UserDeletedError extends Error {
  constructor(public readonly deletedAt: Date) {
    super('User account is in the deletion window')
    this.name = 'UserDeletedError'
  }
}

interface ResolvedUser {
  id: string
  email: string
  role: string
  organizationId: string
}

async function resolvePhillyUser(email: string): Promise<ResolvedUser> {
  const prisma = getAuthPrisma()

  // Look up by email — including soft-deleted rows — so we can give a
  // distinct error for "deleted within last 30 days" vs "never seen".
  // We do NOT auto-resurrect: a deleted account must be re-invited by
  // an admin to come back online.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, organizationId: true, deletedAt: true },
  })
  if (existing?.deletedAt) {
    throw new UserDeletedError(existing.deletedAt)
  }
  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      role: existing.role,
      organizationId: existing.organizationId,
    }
  }

  // Auto-provision: look up or create the default org.
  let org = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Volitfy', slug: 'volitfy' },
      select: { id: true },
    })
  }

  // First user onboarded is admin, subsequent users viewer.
  const userCount = await prisma.user.count()
  const role = userCount === 0 ? 'admin' : 'viewer'

  const created = await prisma.user.create({
    data: {
      email,
      name: email.split('@')[0],
      role,
      organizationId: org.id,
      // Legacy required field — auth now lives in Supabase, so this
      // hash is intentionally never a valid bcrypt hash. No local
      // credentials login path exists to check against it.
      passwordHash: '__supabase_auth__',
    },
    select: { id: true, email: true, role: true, organizationId: true },
  })

  return created
}

/**
 * Resolves the current session from Supabase cookies and returns a
 * strongly typed AuthScope, or a NextResponse with 401 if the user
 * isn't signed in.
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
    }
  } catch (err) {
    if (err instanceof UserDeletedError) {
      // 410 Gone — the resource (user account) existed but was deleted.
      // Sign the Supabase session out client-side via the standard 401
      // wouldn't be accurate; 410 is the AVG-correct answer.
      return jsonError('Account deleted', 410)
    }
    console.error('[requireScope] failed to resolve philly user', err)
    return jsonError('Auth provisioning failed', 500)
  }
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
