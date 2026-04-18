/* DELETE /api/api-keys/[id] — revoke an API key */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const existing = await prisma.apiKey.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('API key not found', 404)

  await prisma.apiKey.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'apiKey', entityId: id })
  return NextResponse.json({ data: { id } })
}
