/* POST /api/ai/query — natural language query */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireScope } from '@/lib/philly/auth-helpers'
import { runNLQuery } from '@/lib/philly/ai/nl-query'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  question: z.string().trim().min(1, 'question is required').max(500, 'question too long'),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // AI calls cost real money. Strict per-user limit: 30/min, ~1/2s sustained.
  const limited = enforceRateLimit(`ai:query:${scope.userId}`, { capacity: 30, refillPerSec: 0.5 })
  if (limited) return limited

  const body = await parseBody(req, bodySchema)
  if (body instanceof NextResponse) return body

  const question = body.question

  try {
    const result = await runNLQuery(scope.organizationId, question)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[ai/query] failed', err)
    return NextResponse.json({ error: 'Failed to run query' }, { status: 500 })
  }
}
