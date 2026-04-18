/* ---------------------------------------------------------------
   Auth helpers for API routes
   - Resolves the current NextAuth session server-side
   - Returns a typed { userId, organizationId, role } scope or a 401/403
   - Use jsonError() for consistent error envelopes
   --------------------------------------------------------------- */

import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { getAuthOptions } from '@/lib/philly/auth'

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
 * Resolves the current session and returns a strongly typed AuthScope,
 * or a NextResponse with 401 if the user is not authenticated, or 403
 * if the session lacks an organizationId (corrupt/legacy session).
 *
 * Usage:
 *   const scope = await requireScope()
 *   if (scope instanceof NextResponse) return scope
 *   // ...use scope.organizationId, scope.userId, scope.role
 */
export async function requireScope(): Promise<AuthScope | NextResponse> {
  const session = await getServerSession(getAuthOptions())

  if (!session?.user?.id) {
    return jsonError('Unauthorized', 401)
  }

  if (!session.user.organizationId) {
    return jsonError('Session is missing organization scope', 403)
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role ?? 'viewer',
    email: session.user.email ?? null,
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
