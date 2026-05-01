/* Convenience publisher for entity mutation events.
   Call from API route handlers after a successful create/update/delete.
   Also fans out to:
     - Automation engine (evaluateRules)
     - Webhook dispatcher (dispatchWebhookEvent) */

import { eventBus } from './event-bus'
import { fireAutomationEvent } from '@/lib/philly/automation/engine'
import { dispatchWebhookEvent } from '@/lib/philly/webhooks/dispatcher'
import { isFeatureEnabledSync, FEATURES } from '@/lib/philly/features'
import { getAuthPrisma } from '@/lib/philly/auth'

/* Kill-switch fast-path — sync, fail-open on cache miss. The flag
   propagates within one request per process after a flip. We don't
   gate dispatchWebhookEvent here because that's gated separately
   inside the dispatcher (it has its own WEBHOOKS check) and we want
   webhooks even when the in-process realtime bus is paused. */
function realtimeOn(orgId: string): boolean {
  return isFeatureEnabledSync(getAuthPrisma(), orgId, FEATURES.REALTIME.key)
}

export function publishEntityCreated(orgId: string, entity: string, entityId: string, userId?: string, data?: unknown) {
  if (realtimeOn(orgId)) {
    eventBus.publish({ type: 'entity.created', orgId, entity, entityId, userId, data })
    fireAutomationEvent({
      organizationId: orgId,
      type: 'entity.created',
      entity,
      entityId,
      after: data as Record<string, unknown> | undefined,
      userId,
    })
  }
  // Webhook dispatcher has its own WEBHOOKS kill-switch — keep it
  // outside the REALTIME gate so webhooks survive a realtime pause.
  void dispatchWebhookEvent(orgId, `${entity}.created`, { id: entityId, data })
}

export function publishEntityUpdated(orgId: string, entity: string, entityId: string, userId?: string, data?: unknown, before?: unknown) {
  if (realtimeOn(orgId)) {
    eventBus.publish({ type: 'entity.updated', orgId, entity, entityId, userId, data })
    fireAutomationEvent({
      organizationId: orgId,
      type: 'entity.updated',
      entity,
      entityId,
      before: before as Record<string, unknown> | undefined,
      after: data as Record<string, unknown> | undefined,
      userId,
    })
  }
  void dispatchWebhookEvent(orgId, `${entity}.updated`, { id: entityId, data, before })
}

export function publishEntityDeleted(orgId: string, entity: string, entityId: string, userId?: string) {
  if (realtimeOn(orgId)) {
    eventBus.publish({ type: 'entity.deleted', orgId, entity, entityId, userId })
    fireAutomationEvent({
      organizationId: orgId,
      type: 'entity.deleted',
      entity,
      entityId,
      userId,
    })
  }
  void dispatchWebhookEvent(orgId, `${entity}.deleted`, { id: entityId })
}

export function publishNotification(orgId: string, data: { title: string; body?: string; link?: string }, userId?: string) {
  if (realtimeOn(orgId)) {
    eventBus.publish({ type: 'notification', orgId, userId, data })
  }
}
