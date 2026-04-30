/* POST /api/integrations/[id]/test — verify connection by hitting the provider's ping endpoint */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getConnector } from '@/lib/philly/integrations/registry'
import { decryptIntegration } from '@/lib/philly/integrations/secrets'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`integrations.test:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  const prisma = getAuthPrisma()
  const integration = await prisma.integration.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!integration) return jsonError('Integration not found', 404)

  const conn = getConnector(integration.provider)
  if (!conn) return jsonError('Unknown connector', 400)

  let metadata: Record<string, unknown> = {}
  try { metadata = JSON.parse(integration.metadata || '{}') } catch {}

  // Decrypt the stored token — connectors need plaintext
  const decrypted = decryptIntegration(integration)

  const result = await conn.test({
    accessToken: decrypted.accessToken ?? undefined,
    apiKey: decrypted.accessToken ?? undefined, // API-key connectors store the key in accessToken
    metadata,
  })

  // Update status
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      status: result.ok ? 'connected' : 'error',
      lastSyncAt: result.ok ? new Date() : integration.lastSyncAt,
    },
  })

  return NextResponse.json({ data: result })
}
