/* GET /api/admin/gdpr/ropa — Records of Processing Activities,
   serialized for the admin UI or for export to a regulator. */

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/philly/auth-helpers'
import { PROCESSING_ACTIVITIES } from '@/lib/gdpr/ropa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  return NextResponse.json({
    organizationId: scope.organizationId,
    generatedAt: new Date().toISOString(),
    activities: PROCESSING_ACTIVITIES,
  })
}
