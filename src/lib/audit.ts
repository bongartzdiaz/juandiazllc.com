/* ---------------------------------------------------------------
   Audit logging helper
   - Records create / update / delete actions across all entities
   - Call after every successful mutation in API routes
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/auth'
import type { AuthScope } from '@/lib/auth-helpers'

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
  const diff: Record<string, { old: unknown; new: unknown }> = {}

  for (const key of Object.keys(newInput)) {
    const oldVal = oldRecord[key]
    const newVal = newInput[key]

    // Skip if values are identical (simple comparison)
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue

    diff[key] = { old: oldVal, new: newVal }
  }

  return Object.keys(diff).length > 0 ? diff : undefined
}
