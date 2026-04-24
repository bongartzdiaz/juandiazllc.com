/* POST /api/ai/command-plan — turn natural language into a plan of tool calls.
   Read-only. Does not execute anything. */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { planCommand } from '@/lib/philly/ai/command-planner'
import { enforceRateLimit } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type IndustryHint = 'realestate' | 'hospitality' | 'philanthropy'
const VALID_INDUSTRIES: readonly IndustryHint[] = ['realestate', 'hospitality', 'philanthropy']

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Planning costs a model call. Per-user: 20/min sustained, short bursts ok.
  const limited = enforceRateLimit(`ai:plan:${scope.userId}`, { capacity: 20, refillPerSec: 0.33 })
  if (limited) return limited

  let body: { input?: string; industry?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const input = (body.input ?? '').trim()
  if (!input) return NextResponse.json({ error: 'input is required' }, { status: 400 })
  if (input.length > 500) return NextResponse.json({ error: 'input too long' }, { status: 400 })

  const industry = VALID_INDUSTRIES.includes(body.industry as IndustryHint)
    ? (body.industry as IndustryHint)
    : null

  const result = await planCommand({ input, industry })
  if (!result.ok || !result.plan) {
    return NextResponse.json({ error: result.error ?? 'Plan failed' }, { status: 500 })
  }

  return NextResponse.json({ data: result.plan })
}
