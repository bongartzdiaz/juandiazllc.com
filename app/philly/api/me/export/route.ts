import { NextRequest, NextResponse } from 'next/server'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_READ } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'
import { buildDsarArchive, dsarScopeFromQuery } from '@/lib/philly/dsar-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/me/export
 *   ?scope=user|org   (default: user)
 *
 * AVG/GDPR Art. 15 + Art. 20 — right of access + data portability.
 *
 * - scope=user : returns the requesting user's own data + the metadata
 *                of their organization. Any authenticated user can call.
 * - scope=org  : returns all data in the user's organization. Admin or
 *                manager only — typical use is a customer-side admin
 *                producing a DSAR for one of their own users.
 *
 * Response is a JSON file (Content-Disposition: attachment) with the
 * shape defined in lib/philly/dsar.ts. Sensitive credentials never
 * appear in the export.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const scopeParam = dsarScopeFromQuery(url.searchParams.get('scope'))

  // org-scope requires admin/manager; user-scope only requires auth
  const scope =
    scopeParam === 'org'
      ? await requireRole(['admin', 'manager'])
      : await requireScope()

  if (scope instanceof NextResponse) return scope

  // DSAR is heavier than a regular read but still a read — use READ preset
  const limited = enforceRateLimit(`dsar:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  const prisma = getAuthPrisma()

  let archive
  try {
    archive = await buildDsarArchive({
      prisma,
      userId: scope.userId,
      organizationId: scope.organizationId,
      scope: scopeParam,
    })
  } catch (err) {
    logger.error('[dsar] export build failed', {
      userId: scope.userId,
      orgId: scope.organizationId,
      scope: scopeParam,
      err: err instanceof Error ? err.message : 'unknown',
    })
    return jsonError('Could not build export', 500)
  }

  // Audit row — DSAR exports are privileged reads worth logging
  await logAudit({
    scope,
    action: 'create',
    entity: 'auditLog', // closest existing entity; consider adding 'dsar' later
    changes: {
      kind: { old: null, new: 'dsar_export' },
      scope_param: { old: null, new: scopeParam },
      contact_count: { old: null, new: archive.manifest.contact_count },
      deal_count: { old: null, new: archive.manifest.deal_count },
    },
  }).catch(() => { /* audit best-effort */ })

  const body = JSON.stringify(archive, null, 2)
  const filename = `deus-export-${scopeParam}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Prevent any caching of PII archives
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
    },
  })
}
