/* GET /api/ai/insights — generate an insights report for the current org.
   Pure rule-based analytics. Any signed-in user can view. */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { generateInsights } from '@/lib/philly/ai/insights'
import { enforceRateLimit, PRESET_READ } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`ai:insights:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  try {
    const report = await generateInsights(scope.organizationId)
    return NextResponse.json({ data: report })
  } catch (err) {
    console.error('[ai/insights] generation failed', err)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
