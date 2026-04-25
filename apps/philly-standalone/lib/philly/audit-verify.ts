/* ---------------------------------------------------------------
   AuditLog hash-chain verifier — walks the chain in createdAt order
   ---------------------------------------------------------------
   Returns a structured report:

     {
       totalRows, hashedRows, unhashed, broken[], forked[],
       lastHash, ok
     }

   - `unhashed` counts rows pre-dating the hash-chain rollout.
   - `broken[]` lists rows whose stored hash does NOT equal
     recompute(prevHash || canonical content) → real tampering.
   - `forked[]` lists rows whose stored prevHash matches no other
     row's hash → either a fork from concurrent writes (benign) or
     a deletion of a predecessor (suspicious).
   - `ok` is true iff broken.length === 0. Forks are informational.
   --------------------------------------------------------------- */

import { computeAuditHash, type AuditChainRow } from './audit-chain'

export interface VerifyReport {
  organizationId: string
  totalRows: number
  hashedRows: number
  unhashedRows: number
  broken: Array<{ id: string; reason: 'hash-mismatch' }>
  forked: Array<{ id: string; reason: 'orphan-prev' }>
  lastHash: string | null
  ok: boolean
}

interface AuditRowForVerify extends AuditChainRow {
  id: string
  hash: string | null
  prevHash: string | null
}

export interface PrismaForVerify {
  auditLog: {
    findMany: (args: {
      where: { organizationId: string }
      orderBy: { createdAt: 'asc' }
    }) => Promise<AuditRowForVerify[]>
  }
}

export async function verifyAuditChain(
  prisma: PrismaForVerify,
  organizationId: string,
): Promise<VerifyReport> {
  const rows = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  })

  const knownHashes = new Set<string>()
  const broken: VerifyReport['broken'] = []
  const forked: VerifyReport['forked'] = []
  let unhashedRows = 0
  let hashedRows = 0
  let lastHash: string | null = null

  for (const row of rows) {
    if (row.hash == null) {
      unhashedRows += 1
      continue
    }
    hashedRows += 1
    const expected = computeAuditHash(row.prevHash, {
      organizationId: row.organizationId,
      userId: row.userId,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      changes: row.changes,
      createdAt: row.createdAt,
    })
    if (expected !== row.hash) {
      broken.push({ id: row.id, reason: 'hash-mismatch' })
    }
    if (row.prevHash != null && !knownHashes.has(row.prevHash)) {
      forked.push({ id: row.id, reason: 'orphan-prev' })
    }
    knownHashes.add(row.hash)
    lastHash = row.hash
  }

  return {
    organizationId,
    totalRows: rows.length,
    hashedRows,
    unhashedRows,
    broken,
    forked,
    lastHash,
    ok: broken.length === 0,
  }
}
