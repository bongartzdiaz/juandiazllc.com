/* GET /api/integrations/catalog — list all known connectors + their metadata */

import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/auth-helpers'
import { listConnectors } from '@/lib/integrations/registry'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  return NextResponse.json({ data: listConnectors() })
}
