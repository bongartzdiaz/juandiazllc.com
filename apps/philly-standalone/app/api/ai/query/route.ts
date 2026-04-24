/* POST /api/ai/query — natural language query */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { runNLQuery } from '@/lib/philly/ai/nl-query'
import { enforceRateLimit } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // AI calls cost real money. Strict per-user limit: 30/min, ~1/2s sustained.
  const limited = enforceRateLimit(`ai:query:${scope.userId}`, { capacity: 30, refillPerSec: 0.5 })
  if (limited) return limited

  let body: { question?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const question = (body.question ?? '').trim()
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 })
  if (question.length > 500) return NextResponse.json({ error: 'question too long' }, { status: 400 })

  try {
    const result = await runNLQuery(scope.organizationId, question)
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('[ai/query] failed', err)
    return NextResponse.json({ error: 'Failed to run query' }, { status: 500 })
  }
}
