import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { importContactsSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/contacts/import
 *   Body: { rows: [{ name, email?, phone?, company?, type?, notes?, leadSource?, leadStatus? }, ...], source? }
 *
 * Bulk-imports contacts into the caller's organization. Admin/manager only.
 * - Rate-limited per org (PRESET_MUTATION)
 * - Max 10,000 rows per request (Zod-enforced)
 * - Server-side dedupe by email within the org (skip duplicates, report count)
 * - Inserted in batches inside a transaction so a failure mid-import
 *   doesn't leave partial data
 * - Single audit row per import batch with totals
 */
export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contacts-import:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, importContactsSchema)
  if (!parsed.success) return parsed.response
  const { rows, source } = parsed.data

  const prisma = getAuthPrisma()

  // Dedupe by email within the request itself (caller may have sent dups)
  const seenEmails = new Set<string>()
  const dedupedRows: typeof rows = []
  let intraRequestDuplicates = 0
  for (const r of rows) {
    if (r.email) {
      if (seenEmails.has(r.email)) {
        intraRequestDuplicates++
        continue
      }
      seenEmails.add(r.email)
    }
    dedupedRows.push(r)
  }

  // Find existing emails in this org to skip — single round-trip
  const existingByEmail: Set<string> = new Set()
  if (seenEmails.size > 0) {
    const existing = await prisma.contact.findMany({
      where: {
        organizationId: scope.organizationId,
        email: { in: [...seenEmails] },
      },
      select: { email: true },
    })
    for (const c of existing) {
      if (c.email) existingByEmail.add(c.email.toLowerCase())
    }
  }

  const toInsert = dedupedRows.filter(
    (r) => !r.email || !existingByEmail.has(r.email),
  )
  const skippedExisting = dedupedRows.length - toInsert.length

  if (toInsert.length === 0) {
    return NextResponse.json({
      data: {
        inserted: 0,
        skipped_intra_request: intraRequestDuplicates,
        skipped_existing: skippedExisting,
        total: rows.length,
      },
    })
  }

  // Insert in batches — Prisma createMany handles up to a few thousand
  // comfortably on MariaDB; chunk to keep memory + lock window bounded.
  const BATCH = 500
  let inserted = 0
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH)
        const result = await tx.contact.createMany({
          data: batch.map((r) => ({
            organizationId: scope.organizationId,
            name: r.name,
            email: r.email ?? '',
            phone: r.phone ?? '',
            company: r.company ?? '',
            type: r.type ?? 'stakeholder',
            notes: r.notes ?? '',
            leadSource: r.leadSource ?? '',
            leadStatus: r.leadStatus ?? 'new',
          })),
        })
        inserted += result.count
      }
    }, { timeout: 60_000 })
  } catch (err) {
    logger.error('[contacts/import] batch insert failed', {
      orgId: scope.organizationId,
      by: scope.userId,
      err: err instanceof Error ? err.message : 'unknown',
    })
    return jsonError('Could not import contacts. The transaction was rolled back; no rows were saved.', 500)
  }

  await logAudit({
    scope,
    action: 'create',
    entity: 'contact',
    changes: {
      kind: { old: null, new: 'bulk_import' },
      source: { old: null, new: source },
      submitted: { old: null, new: rows.length },
      inserted: { old: null, new: inserted },
      skipped_existing: { old: null, new: skippedExisting },
      skipped_intra_request: { old: null, new: intraRequestDuplicates },
    },
  }).catch(() => { /* audit best-effort */ })

  logger.info('[contacts/import] success', {
    orgId: scope.organizationId,
    by: scope.userId,
    inserted,
    submitted: rows.length,
  })

  return NextResponse.json({
    data: {
      inserted,
      skipped_intra_request: intraRequestDuplicates,
      skipped_existing: skippedExisting,
      total: rows.length,
    },
  }, { status: 201 })
}
