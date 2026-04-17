/* GET /api/properties/[id]/valuation — automated valuation + comparables */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/auth-helpers'
import { valuateProperty } from '@/lib/realestate/comps'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const report = await valuateProperty(scope.organizationId, id)
  if (!report) return jsonError('Property not found', 404)
  return NextResponse.json({ data: report })
}
