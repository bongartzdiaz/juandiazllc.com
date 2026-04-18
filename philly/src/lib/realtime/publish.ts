/* Convenience publisher for entity mutation events.
   Call from API route handlers after a successful create/update/delete.
   Also fans out to:
     - Automation engine (evaluateRules)
     - Webhook dispatcher (dispatchWebhookEvent) */

import { eventBus } from './event-bus'
import { fireAutomationEvent } from '@/lib/automation/engine'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher'

export function publishEntityCreated(orgId: string, entity: string, entityId: string, userId?: string, data?: unknown) {
  eventBus.publish({ type: 'entity.created', orgId, entity, entityId, userId, data })
  fireAutomationEvent({
    organizationId: orgId,
    type: 'entity.created',
    entity,
    entityId,
    after: data as Record<string, unknown> | undefined,
    userId,
  })
  void dispatchWebhookEvent(orgId, `${entity}.created`, { id: entityId, data })
}

export function publishEntityUpdated(orgId: string, entity: string, entityId: string, userId?: string, data?: unknown, before?: unknown) {
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
  void dispatchWebhookEvent(orgId, `${entity}.updated`, { id: entityId, data, before })
}

export function publishEntityDeleted(orgId: string, entity: string, entityId: string, userId?: string) {
  eventBus.publish({ type: 'entity.deleted', orgId, entity, entityId, userId })
  fireAutomationEvent({
    organizationId: orgId,
    type: 'entity.deleted',
    entity,
    entityId,
    userId,
  })
  void dispatchWebhookEvent(orgId, `${entity}.deleted`, { id: entityId })
}

export function publishNotification(orgId: string, data: { title: string; body?: string; link?: string }, userId?: string) {
  eventBus.publish({ type: 'notification', orgId, userId, data })
}
