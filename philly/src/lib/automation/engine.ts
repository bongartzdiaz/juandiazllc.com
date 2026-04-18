/* ---------------------------------------------------------------
   Automation rule engine
   - Listens for domain events (entity.created/updated/deleted + schedule)
   - Evaluates enabled AutomationRules whose trigger matches
   - Executes the configured action
   - Records an AutomationLog for each execution
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/auth'
import { renderTemplate } from '@/lib/templates/renderer'
import { publishNotification } from '@/lib/realtime/publish'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/sms/send'
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatcher'

export interface AutomationEvent {
  organizationId: string
  type: 'entity.created' | 'entity.updated' | 'entity.deleted' | 'schedule'
  entity?: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  userId?: string
}

type TriggerConfig = {
  entity?: string
  field?: string
  from?: unknown
  to?: unknown
  cron?: string
}

type ActionConfig = {
  // sendEmail
  accountId?: string
  to?: string
  templateId?: string
  subject?: string
  body?: string
  // sendSMS
  toNumber?: string
  channel?: 'sms' | 'whatsapp'
  // createNotification
  title?: string
  link?: string
  // updateField
  field?: string
  value?: unknown
  // moveStage
  stageId?: string
  // callWebhook
  url?: string
  payload?: Record<string, unknown>
}

function triggerMatches(event: AutomationEvent, trigger: string, cfg: TriggerConfig): boolean {
  switch (trigger) {
    case 'onEntityCreate':
      return event.type === 'entity.created' && (!cfg.entity || cfg.entity === event.entity)
    case 'onEntityDelete':
      return event.type === 'entity.deleted' && (!cfg.entity || cfg.entity === event.entity)
    case 'onFieldChange': {
      if (event.type !== 'entity.updated') return false
      if (cfg.entity && cfg.entity !== event.entity) return false
      if (!cfg.field) return false
      const before = event.before?.[cfg.field]
      const after = event.after?.[cfg.field]
      if (JSON.stringify(before) === JSON.stringify(after)) return false
      if (cfg.from !== undefined && JSON.stringify(before) !== JSON.stringify(cfg.from)) return false
      if (cfg.to !== undefined && JSON.stringify(after) !== JSON.stringify(cfg.to)) return false
      return true
    }
    case 'onStageChange': {
      if (event.type !== 'entity.updated' || event.entity !== 'deal') return false
      return event.before?.stageId !== event.after?.stageId
    }
    case 'onSchedule':
      return event.type === 'schedule'
    default:
      return false
  }
}

async function runAction(
  organizationId: string,
  actionType: string,
  cfg: ActionConfig,
  ctx: Record<string, unknown>,
): Promise<{ ok: boolean; output?: unknown; error?: string }> {
  const prisma = getAuthPrisma()

  try {
    switch (actionType) {
      case 'sendEmail': {
        if (!cfg.accountId || !cfg.to) return { ok: false, error: 'accountId and to required' }
        const result = await sendEmail(organizationId, {
          accountId: cfg.accountId,
          to: renderTemplate(cfg.to, ctx),
          subject: cfg.subject ? renderTemplate(cfg.subject, ctx) : undefined,
          bodyHtml: cfg.body ? renderTemplate(cfg.body, ctx) : null,
          templateId: cfg.templateId ?? null,
          templateContext: ctx,
        })
        return { ok: result.ok, output: { emailId: result.emailId }, error: result.error }
      }
      case 'sendSMS': {
        if (!cfg.toNumber) return { ok: false, error: 'toNumber required' }
        const result = await sendSms(organizationId, {
          toNumber: renderTemplate(cfg.toNumber, ctx),
          body: cfg.body ? renderTemplate(cfg.body, ctx) : undefined,
          channel: cfg.channel ?? 'sms',
          templateId: cfg.templateId ?? null,
          templateContext: ctx,
        })
        return { ok: result.ok, output: { id: result.id }, error: result.error }
      }
      case 'createNotification': {
        if (!cfg.title) return { ok: false, error: 'title required' }
        const title = renderTemplate(cfg.title, ctx)
        const bodyText = cfg.body ? renderTemplate(cfg.body, ctx) : ''
        const link = cfg.link ? renderTemplate(cfg.link, ctx) : undefined

        // Notifications require a userId. Fan out to all admin/manager users in the org.
        const users = await prisma.user.findMany({
          where: { organizationId, role: { in: ['admin', 'manager'] } },
          select: { id: true },
        }).catch(() => [])

        for (const u of users) {
          await prisma.notification.create({
            data: {
              organizationId,
              userId: u.id,
              title,
              message: bodyText,
              link: link ?? null,
              type: 'info',
            },
          }).catch(() => {})
        }
        publishNotification(organizationId, { title, body: bodyText, link })
        return { ok: true, output: { recipients: users.length } }
      }
      case 'updateField': {
        if (!cfg.field || !('value' in cfg)) return { ok: false, error: 'field + value required' }
        // Only supports Deal and Contact via entity ctx
        const entity = ctx.__entity as string | undefined
        const entityId = ctx.__entityId as string | undefined
        if (!entity || !entityId) return { ok: false, error: 'no entity in context' }
        if (entity === 'deal') {
          await prisma.deal.update({ where: { id: entityId }, data: { [cfg.field]: cfg.value as never } })
        } else if (entity === 'contact') {
          await prisma.contact.update({ where: { id: entityId }, data: { [cfg.field]: cfg.value as never } })
        } else {
          return { ok: false, error: `updateField not supported for ${entity}` }
        }
        return { ok: true, output: { field: cfg.field, value: cfg.value } }
      }
      case 'moveStage': {
        if (!cfg.stageId) return { ok: false, error: 'stageId required' }
        const entityId = ctx.__entityId as string | undefined
        if (!entityId) return { ok: false, error: 'no deal id in context' }
        await prisma.deal.update({ where: { id: entityId }, data: { stageId: cfg.stageId } })
        return { ok: true, output: { stageId: cfg.stageId } }
      }
      case 'callWebhook': {
        if (!cfg.url) return { ok: false, error: 'url required' }
        const payload = cfg.payload ?? ctx
        await dispatchWebhookEvent(organizationId, 'automation.action', { url: cfg.url, payload })
        return { ok: true, output: { url: cfg.url } }
      }
      default:
        return { ok: false, error: `Unknown action: ${actionType}` }
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'action failed' }
  }
}

/** Evaluate all enabled rules for an org against an event. Fire-and-forget. */
export async function evaluateRules(event: AutomationEvent): Promise<void> {
  try {
    const prisma = getAuthPrisma()
    const rules = await prisma.automationRule.findMany({
      where: { organizationId: event.organizationId, enabled: true },
    })

    await Promise.all(rules.map(async rule => {
      let triggerCfg: TriggerConfig = {}
      let actionCfg: ActionConfig = {}
      try { triggerCfg = JSON.parse(rule.triggerConfig || '{}') } catch {}
      try { actionCfg = JSON.parse(rule.actionConfig || '{}') } catch {}

      if (!triggerMatches(event, rule.trigger, triggerCfg)) return

      const ctx = {
        ...event.after,
        __entity: event.entity,
        __entityId: event.entityId,
        event: { type: event.type, entity: event.entity, entityId: event.entityId },
      }

      const result = await runAction(event.organizationId, rule.actionType, actionCfg, ctx)
      await prisma.automationLog.create({
        data: {
          ruleId: rule.id,
          status: result.ok ? 'success' : 'failure',
          input: JSON.stringify({ event: { type: event.type, entity: event.entity, entityId: event.entityId } }).slice(0, 10000),
          output: JSON.stringify(result.output ?? {}).slice(0, 10000),
          error: result.error ?? null,
        },
      }).catch(() => {})
    }))
  } catch (err) {
    console.error('[automation] evaluateRules failed:', err)
  }
}

/** Fire an automation event (non-blocking). */
export function fireAutomationEvent(event: AutomationEvent): void {
  // Fire and forget; do not await
  void evaluateRules(event)
}
