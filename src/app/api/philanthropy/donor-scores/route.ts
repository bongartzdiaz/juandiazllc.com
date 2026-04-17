/* GET /api/philanthropy/donor-scores — RFM scoring for the current org */

import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/auth-helpers'
import { generateDonorScores } from '@/lib/philanthropy/donor-scoring'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const report = await generateDonorScores(scope.organizationId)
  return NextResponse.json({ data: report })
}
