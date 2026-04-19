/* GET /api/ai/score — predictive lead scores for org */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { generateLeadScores } from '@/lib/philly/ai/scoring'
import { enforceRateLimit } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Model runs are expensive — cap at 10 reports/min per user.
  const limited = enforceRateLimit(`ai:score:${scope.userId}`, { capacity: 10, refillPerSec: 0.166 })
  if (limited) return limited

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '500', 10) || 500, 1000)

  try {
    const report = await generateLeadScores(scope.organizationId, limit)
    return NextResponse.json({ data: report })
  } catch (err) {
    console.error('[ai/score] generation failed', err)
    return NextResponse.json({ error: 'Failed to generate lead scores' }, { status: 500 })
  }
}
