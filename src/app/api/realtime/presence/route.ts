/* GET /api/realtime/presence — list currently-active users in this org */

import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/auth-helpers'
import { presence } from '@/lib/realtime/event-bus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const users = presence.list(scope.organizationId)
  return NextResponse.json({ data: users })
}
