/* POST /api/ai/command-execute — run a single plan step after user confirmation.
   Body: { step: PlanStep } where PlanStep is the schema from command-planner.
   Returns an ExecuteResult. Read-only + draft-only in this version. */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { planStepSchema, isWriteTool } from '@/lib/philly/ai/command-planner'
import { executeStep } from '@/lib/philly/ai/command-executor'
import { enforceRateLimit, PRESET_READ, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  // Execution is cheap for most tools (DB reads). draft_followup_email
  // spends a model call, but PRESET_READ (300/min) is still tight enough
  // to keep per-user cost bounded.
  const limited = enforceRateLimit(`ai:exec:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = planStepSchema.safeParse((body as { step?: unknown })?.step)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid step', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // Bundle BN security hotfix — write tools (update_deal_stage,
  // add_contact_note, set_lead_status, create_task, schedule_followup,
  // link_deal_to_contact) must be gated by the same role/section
  // checks as the conventional PATCH/POST routes. Without this,
  // requireScope() let any logged-in user (including viewers + section-
  // restricted accounts) mutate any contact / deal in their org via
  // the AI command bar. The "user confirms each step" comment in the
  // executor relied on the UI; the API never enforced it.
  if (isWriteTool(parsed.data.tool)) {
    const elevated = await requireRole(['admin', 'manager'])
    if (elevated instanceof NextResponse) return elevated
    // Re-rate-limit writes against the mutation bucket so the cheaper
    // PRESET_READ ceiling above can't be used to amortise expensive
    // write paths.
    const writeLimited = enforceRateLimit(`ai:exec:write:${scope.userId}`, PRESET_MUTATION)
    if (writeLimited) return writeLimited
  }

  try {
    const result = await executeStep(scope, parsed.data)
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[ai/command-execute] failed', message)
    return NextResponse.json({ error: 'Execution failed', message }, { status: 500 })
  }
}
