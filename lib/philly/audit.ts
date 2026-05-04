/* ---------------------------------------------------------------
   Audit logging helper
   - Records create / update / delete actions across all entities
   - Call after every successful mutation in API routes
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'
import type { AuthScope } from '@/lib/philly/auth-helpers'

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
  | 'auditLog'
  | 'activity'

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
    await prisma.auditLog.create({
      data: {
        organizationId: scope.organizationId,
        userId: scope.userId,
        action,
        entity,
        entityId: entityId ?? null,
        changes: changes ? JSON.stringify(changes) : '{}',
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
export function diffChanges(
  oldRecord: Record<string, unknown>,
  newInput: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | undefined {
  // Bundle CP — prototype-pollution defence. `newInput` can ultimately
  // originate from request bodies; refusing to copy `__proto__` /
  // `constructor` / `prototype` keys removes the only path by which
  // a hostile payload could mutate Object.prototype through the
  // downstream JSON serialiser.
  const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
  const diff: Record<string, { old: unknown; new: unknown }> = Object.create(null)

  for (const key of Object.keys(newInput)) {
    if (FORBIDDEN_KEYS.has(key)) continue
    const oldVal = oldRecord[key]
    const newVal = newInput[key]

    // Skip if values are identical (simple comparison)
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue

    diff[key] = { old: oldVal, new: newVal }
  }

  return Object.keys(diff).length > 0 ? diff : undefined
}
