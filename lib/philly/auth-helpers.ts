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
async function resolvePhillyUser(email: string) {
  const prisma = getAuthPrisma()

  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, organizationId: true },
  })
  if (user) return user

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

  user = await prisma.user.create({
    data: {
      email,
      name: email.split('@')[0],
      role,
      organizationId: org.id,
    },
    select: { id: true, email: true, role: true, organizationId: true },
  })

  return user
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
    return {
      userId: phillyUser.id,
      organizationId: phillyUser.organizationId,
      role: phillyUser.role ?? 'viewer',
      email: phillyUser.email,
    }
  } catch (err) {
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
