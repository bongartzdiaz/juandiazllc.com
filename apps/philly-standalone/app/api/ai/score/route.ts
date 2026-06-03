/* GET /api/ai/score — predictive lead scores for org */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parseQuery } from '@/lib/philly/api/validate'
import { generateLeadScores } from '@/lib/philly/ai/scoring'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { SLO, withSpan } from '@/lib/philly/observability'
import { isFeatureEnabled, FEATURES } from '@/lib/philly/features'
import { getAuthPrisma } from '@/lib/philly/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Model runs are expensive — cap at 10 reports/min per user.
  const limited = enforceRateLimit(`ai:score:${scope.userId}`, { capacity: 10, refillPerSec: 0.166 })
  if (limited) return limited

  // Kill-switch — admins can pause AI deal-scoring org-wide via
  // /api/admin/features without redeploy. Bundle BJ audit fix.
  if (!(await isFeatureEnabled(getAuthPrisma(), scope.organizationId, FEATURES.AI_DEAL_SCORING.key))) {
    return jsonError('AI deal-scoring is disabled for this organization', 403)
  }

  const q = parseQuery(req.nextUrl.searchParams, querySchema)
  if (q instanceof NextResponse) return q
  const { limit } = q

  return withSpan(
    {
      name: 'ai.score',
      slo: SLO.AI_ACTION,
      op: 'ai.generate',
      attrs: { organizationId: scope.organizationId, limit },
    },
    async () => {
      try {
        const report = await generateLeadScores(scope.organizationId, limit)
        return NextResponse.json({ data: report })
      } catch (err) {
        console.error('[ai/score] generation failed', err)
        return NextResponse.json({ error: 'Failed to generate lead scores' }, { status: 500 })
      }
    },
  )
}
