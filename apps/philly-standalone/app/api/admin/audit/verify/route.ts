/* GET /api/admin/audit/verify — walk the AuditLog hash chain for
   the caller's organization and report any tampering. Admin-only. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { verifyAuditChain } from '@/lib/philly/audit-verify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const report = await verifyAuditChain(prisma, scope.organizationId)
  return NextResponse.json(report, {
    status: report.ok ? 200 : 409,
    headers: { 'Cache-Control': 'no-store' },
  })
}
