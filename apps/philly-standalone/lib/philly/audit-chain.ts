/* ---------------------------------------------------------------
   AuditLog hash chain — tamper-evidence for compliance forensics
   ---------------------------------------------------------------
   Each row commits to its predecessor via:

     hash = SHA-256(prevHash || canonicalJson({
       organizationId, userId, action, entity, entityId,
       changes, createdAt
     }))

   - prevHash is the `hash` of the most recently written row for the
     same organizationId at the moment this row is inserted, or null
     if this is the first row.
   - canonicalJson sorts keys deterministically so two equivalent
     payloads always hash the same.

   Tamper detection (lib/philly/audit-verify.ts walks the chain):
   - Modifying any row breaks `recompute(row) === stored row.hash`.
   - Deleting a row leaves orphan prevHash references on later rows.
   - Inserting a fake row would require also recomputing every later
     hash; the verifier can flag the chain head's freshness against
     an out-of-band timestamp anchor (out of scope for this bundle).
   --------------------------------------------------------------- */

import { createHash } from 'node:crypto'

export interface AuditChainRow {
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  changes: string // JSON-encoded
  createdAt: Date
}

/**
 * Stable JSON encoder — sorts keys at every level so hashing is
 * deterministic across Node versions and Prisma serialisation
 * variants.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map((v) => canonicalJson(v)).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return (
    '{' +
    keys
      .map((k) => JSON.stringify(k) + ':' + canonicalJson(obj[k]))
      .join(',') +
    '}'
  )
}

/**
 * Compute the SHA-256 hash for a single audit row given the previous
 * row's hash. `prevHash === null` for the first row in a chain.
 */
export function computeAuditHash(prevHash: string | null, row: AuditChainRow): string {
  const canonical = canonicalJson({
    organizationId: row.organizationId,
    userId: row.userId,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    changes: row.changes,
    createdAt: row.createdAt.toISOString(),
  })
  const input = (prevHash ?? '') + '|' + canonical
  // codeql[js/insufficient-password-hash] — chain integrity hash, not a
  // password. SHA-256 is the standard for tamper-evident logs.
  return createHash('sha256').update(input).digest('hex')
}
