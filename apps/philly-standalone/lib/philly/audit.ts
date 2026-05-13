/* ---------------------------------------------------------------
   Audit logging helper
   - Records create / update / delete actions across all entities
   - Call after every successful mutation in API routes
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'
import type { AuthScope } from '@/lib/philly/auth-helpers'
import { computeAuditHash } from '@/lib/philly/audit-chain'

export type AuditAction = 'create' | 'update' | 'delete'

export type AuditEntity =
  | 'project'
  | 'contact'
  | 'kanbanBoard'
  | 'kanbanColumn'
  | 'kanbanCard'
  | 'impactMetric'
  | 'milestone'
  | 'customPage'
  | 'pageBlock'
  | 'calendarEvent'
  | 'deal'
  | 'automationRule'
  | 'commissionRecord'
  | 'template'
  | 'savedView'
  | 'volunteer'
  | 'webhook'
  | 'marketSnapshot'
  | 'dripCampaign'
  | 'agentGoal'
  | 'property'
  | 'transaction'
  | 'offer'
  | 'grant'
  | 'room'
  | 'reservation'
  | 'showing'
  | 'document'
  | 'integration'
  | 'apiKey'
  | 'clientPortalAccess'
  | 'email'
  | 'sms'
  | 'call'
  | 'cmaReport'
  | 'actionPlan'
  | 'dialerList'
  | 'eSignature'
  | 'emailAccount'
  | 'leadRoutingRule'
  | 'leadScore'
  | 'listingAlert'
  | 'mlsFeed'
  | 'inboxConversation'
  | 'inboxMessage'
  | 'referral'
  | 'scoringRule'
  | 'soiCategory'
  | 'propertyTaxonomy'
  | 'openHouse'
  | 'openHouseVisit'
  | 'pipeline'
  | 'pipelineStage'
  | 'user'
  | 'organization'
  | 'membership'
  | 'auditLog'
  | 'activity'
  | 'housekeepingTask'
  | 'featureFlag'
  | 'scimGroup'
  | 'dripEnrollment'
  | 'subscription'

interface LogAuditParams {
  scope: AuthScope
  action: AuditAction
  entity: AuditEntity
  entityId?: string | null
  changes?: Record<string, { old: unknown; new: unknown }>
}

/**
 * Logs an audit entry. Fire-and-forget — errors are caught silently
 * so audit failures never block the main mutation response.
 *
 * Each row commits to its predecessor via SHA-256 (lib/philly/audit-chain.ts);
 * a verifier (lib/philly/audit-verify.ts) walks the chain to detect
 * tampering. Concurrent inserts may produce two rows with the same
 * prevHash (chain fork); per-row integrity is still verifiable, the
 * verifier reports forks as informational rather than as breakages.
 */
export async function logAudit({
  scope,
  action,
  entity,
  entityId,
  changes,
}: LogAuditParams): Promise<void> {
  try {
    const prisma = getAuthPrisma()

    // Read the most recently written row for this org to anchor the chain.
    // A small race window exists when two requests log simultaneously; both
    // see the same prevHash and produce a fork. That is acceptable — see
    // the doc comment in lib/philly/audit-chain.ts.
    const tip = await prisma.auditLog.findFirst({
      where: { organizationId: scope.organizationId, hash: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    })
    const prevHash = tip?.hash ?? null

    const createdAt = new Date()
    const changesJson = changes ? JSON.stringify(changes) : '{}'
    const hash = computeAuditHash(prevHash, {
      organizationId: scope.organizationId,
      userId: scope.userId,
      action,
      entity,
      entityId: entityId ?? null,
      changes: changesJson,
      createdAt,
    })

    await prisma.auditLog.create({
      data: {
        organizationId: scope.organizationId,
        userId: scope.userId,
        action,
        entity,
        entityId: entityId ?? null,
        changes: changesJson,
        createdAt,
        prevHash,
        hash,
      },
    })
  } catch (err) {
    // Audit must never break the main flow
    console.error('[audit] Failed to log:', err)
  }
}

/**
 * Computes a JSON diff between an old and new record.
 * Only includes fields that actually changed.
 */
// Bundle CR — build the diff in a Map keyed by user-controlled string,
// then convert with Object.fromEntries. The Map.set path doesn't carry
// CodeQL's "remote property injection" taint (Maps don't have
// Object.prototype to pollute), and Object.fromEntries is a recognized
// sanitizer for the residual flow. The forbidden-keys filter still
// runs as defence-in-depth for the JSON serializer downstream.
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function diffChanges(
  oldRecord: Record<string, unknown>,
  newInput: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | undefined {
  const diff = new Map<string, { old: unknown; new: unknown }>()

  for (const key of Object.keys(newInput)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    const oldVal = oldRecord[key]
    const newVal = newInput[key]

    // Skip if values are identical (simple comparison)
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue

    diff.set(key, { old: oldVal, new: newVal })
  }

  return diff.size > 0 ? Object.fromEntries(diff) : undefined
}
