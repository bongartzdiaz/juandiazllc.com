/* GET   /api/admin/security — read the org's enterprise access controls
   PATCH /api/admin/security — update them (admin-only)

   Configures two per-org policies introduced in Bundle M:

     - ipAllowlist: comma-separated CIDR ranges. NULL/empty = no
       restriction. requireScope() rejects with 403 / IP_NOT_ALLOWED
       when the request's client IP is not in any range.
     - sessionIdleTimeoutMinutes: integer minutes. NULL = no idle
       timeout. requireScope() rejects with 401 / IDLE_REAUTH_REQUIRED
       when the user's lastActivityAt is older than this.

   Both updates are audit-logged. The admin can lock themselves out
   if they enter a bad allowlist — that's intentional. The recovery
   path is a database update by the operator. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { checkIpAllowlist } from '@/lib/philly/ip-allowlist'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateSchema = z.object({
  ipAllowlist: z.string().nullable().optional(),
  sessionIdleTimeoutMinutes: z.number().int().min(5).max(1440).nullable().optional(),
})

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { ipAllowlist: true, sessionIdleTimeoutMinutes: true },
  })
  if (!org) return jsonError('Organization not found', 404)
  return NextResponse.json({ data: org })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const json = await req.json().catch(() => null)
  const parsed = updateSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', issues: parsed.error.format() },
      { status: 400 },
    )
  }

  // Validate the allowlist parses. We do not require the admin's own
  // IP to be in it — they can lock themselves out if they want.
  if (parsed.data.ipAllowlist != null && parsed.data.ipAllowlist.trim() !== '') {
    const verdict = checkIpAllowlist('0.0.0.0', parsed.data.ipAllowlist)
    if (verdict.invalid.length > 0) {
      return NextResponse.json(
        {
          error: 'Allowlist contains invalid CIDR entries',
          invalid: verdict.invalid,
        },
        { status: 400 },
      )
    }
  }

  const prisma = getAuthPrisma()
  const before = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { ipAllowlist: true, sessionIdleTimeoutMinutes: true },
  })
  if (!before) return jsonError('Organization not found', 404)

  const data: { ipAllowlist?: string | null; sessionIdleTimeoutMinutes?: number | null } = {}
  if ('ipAllowlist' in parsed.data) {
    const raw = parsed.data.ipAllowlist
    data.ipAllowlist = raw == null || raw.trim() === '' ? null : raw.trim()
  }
  if ('sessionIdleTimeoutMinutes' in parsed.data) {
    data.sessionIdleTimeoutMinutes = parsed.data.sessionIdleTimeoutMinutes ?? null
  }

  const updated = await prisma.organization.update({
    where: { id: scope.organizationId },
    data,
    select: { ipAllowlist: true, sessionIdleTimeoutMinutes: true },
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'organization',
    entityId: scope.organizationId,
    changes: diffChanges(
      before as unknown as Record<string, unknown>,
      data as Record<string, unknown>,
    ),
  })

  return NextResponse.json({ data: updated })
}
