/* Hermetic tests — automation engine (lib/philly/automation/engine.ts).
   ──────────────────────────────────────────────────────────────────
   Pin down behavior across three layers:

   1. triggerMatches — pure function. Cheap to test, high coverage value.
   2. runAction — side-effectful per action type. Mocks at module
      boundaries (sendEmail, sendSms, dispatchWebhookEvent, prisma).
      Tests cover both success and validation-failure paths for the
      6 action types.
   3. evaluateRules — orchestrator. Walks rules, matches, runs, logs.
      Tests cover rule selection, log success/failure, and the outer
      error catch.

   The engine is fire-and-forget (publishers don't await its result),
   so the tests verify side effects on the mocks rather than return
   values where possible. */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ── Mocks (hoisted) ──

const mocks = vi.hoisted(() => ({
  // Prisma surfaces used by the engine
  automationRuleFindManyMock: vi.fn(),
  automationLogCreateMock: vi.fn(),
  dealUpdateMock: vi.fn(),
  contactUpdateMock: vi.fn(),
  userFindManyMock: vi.fn(),
  notificationCreateMock: vi.fn(),

  // External services
  sendEmailMock: vi.fn(),
  sendSmsMock: vi.fn(),
  dispatchWebhookEventMock: vi.fn(),
  publishNotificationMock: vi.fn(),
}))

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    automationRule: { findMany: (...a: unknown[]) => mocks.automationRuleFindManyMock(...a) },
    automationLog:  { create:   (...a: unknown[]) => mocks.automationLogCreateMock(...a) },
    deal:           { update:   (...a: unknown[]) => mocks.dealUpdateMock(...a) },
    contact:        { update:   (...a: unknown[]) => mocks.contactUpdateMock(...a) },
    user:           { findMany: (...a: unknown[]) => mocks.userFindManyMock(...a) },
    notification:   { create:   (...a: unknown[]) => mocks.notificationCreateMock(...a) },
  }),
}))

vi.mock('@/lib/philly/email/send', () => ({
  sendEmail: (...args: unknown[]) => mocks.sendEmailMock(...args),
}))

vi.mock('@/lib/philly/sms/send', () => ({
  sendSms: (...args: unknown[]) => mocks.sendSmsMock(...args),
}))

vi.mock('@/lib/philly/webhooks/dispatcher', () => ({
  dispatchWebhookEvent: (...args: unknown[]) => mocks.dispatchWebhookEventMock(...args),
}))

vi.mock('@/lib/philly/realtime/publish', () => ({
  publishNotification: (...args: unknown[]) => mocks.publishNotificationMock(...args),
}))

// renderTemplate is pure and re-exported; using the real implementation
// keeps the tests honest about template substitution.
vi.mock('@/lib/philly/templates/renderer', async () => {
  const actual = await vi.importActual<typeof import('@/lib/philly/templates/renderer')>(
    '@/lib/philly/templates/renderer',
  )
  return actual
})

// ── Import under test (after mocks registered) ──

import type { AutomationEvent } from './engine'
import { evaluateRules, fireAutomationEvent } from './engine'

// engine.ts doesn't export triggerMatches or runAction directly, but their
// behavior is observable through evaluateRules. We exercise them indirectly
// by constructing matching/non-matching events + rules and asserting on the
// mocks.

// ── Helpers ──

const ORG = 'org_1'

function rule(overrides: Partial<{
  id: string
  trigger: string
  actionType: string
  triggerConfig: Record<string, unknown>
  actionConfig: Record<string, unknown>
}> = {}) {
  return {
    id: overrides.id ?? 'rule_1',
    organizationId: ORG,
    enabled: true,
    trigger: overrides.trigger ?? 'onEntityCreate',
    actionType: overrides.actionType ?? 'sendEmail',
    triggerConfig: JSON.stringify(overrides.triggerConfig ?? {}),
    actionConfig: JSON.stringify(overrides.actionConfig ?? {}),
  }
}

function event(overrides: Partial<AutomationEvent> = {}): AutomationEvent {
  return {
    organizationId: ORG,
    type: 'entity.created',
    entity: 'deal',
    entityId: 'deal_1',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.automationRuleFindManyMock.mockResolvedValue([])
  mocks.automationLogCreateMock.mockResolvedValue(undefined)
  mocks.dealUpdateMock.mockResolvedValue({ id: 'deal_1' })
  mocks.contactUpdateMock.mockResolvedValue({ id: 'c_1' })
  mocks.userFindManyMock.mockResolvedValue([])
  mocks.notificationCreateMock.mockResolvedValue(undefined)
  mocks.sendEmailMock.mockResolvedValue({ ok: true, emailId: 'em_1' })
  mocks.sendSmsMock.mockResolvedValue({ ok: true, id: 'sms_1' })
  mocks.dispatchWebhookEventMock.mockResolvedValue(undefined)
})

describe('triggerMatches — via evaluateRules', () => {
  it('onEntityCreate fires on entity.created when entity matches', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', triggerConfig: { entity: 'deal' }, actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event({ type: 'entity.created', entity: 'deal' }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onEntityCreate skips when entity does not match cfg', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', triggerConfig: { entity: 'contact' } }),
    ])
    await evaluateRules(event({ entity: 'deal' }))
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
    // No action run → no log either (engine only logs when triggerMatches succeeds)
    expect(mocks.automationLogCreateMock).not.toHaveBeenCalled()
  })

  it('onEntityCreate ignores entity.updated', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate' }),
    ])
    await evaluateRules(event({ type: 'entity.updated' }))
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })

  it('onEntityDelete fires on entity.deleted', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityDelete', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event({ type: 'entity.deleted' }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onFieldChange fires when field value changes', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onFieldChange',
        triggerConfig: { entity: 'deal', field: 'status' },
        actionConfig: { accountId: 'a1', to: 'x@y.com' },
      }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      before: { status: 'new' },
      after:  { status: 'qualified' },
    }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onFieldChange skips when value did not change', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onFieldChange', triggerConfig: { field: 'status' } }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      before: { status: 'qualified' },
      after:  { status: 'qualified' },
    }))
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })

  it('onFieldChange respects cfg.from filter', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onFieldChange',
        triggerConfig: { field: 'status', from: 'new' },
        actionConfig: { accountId: 'a1', to: 'x@y.com' },
      }),
    ])
    // before=new, after=qualified → matches
    await evaluateRules(event({
      type: 'entity.updated',
      before: { status: 'new' },
      after:  { status: 'qualified' },
    }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
    vi.clearAllMocks()

    // before=qualified, after=hot → does NOT match (from filter)
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onFieldChange',
        triggerConfig: { field: 'status', from: 'new' },
      }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      before: { status: 'qualified' },
      after:  { status: 'hot' },
    }))
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })

  it('onFieldChange respects cfg.to filter', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onFieldChange',
        triggerConfig: { field: 'status', to: 'hot' },
        actionConfig: { accountId: 'a1', to: 'x@y.com' },
      }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      before: { status: 'qualified' },
      after:  { status: 'hot' },
    }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onStageChange fires only for deal entity with changed stageId', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onStageChange', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      entity: 'deal',
      before: { stageId: 's1' },
      after:  { stageId: 's2' },
    }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('onStageChange skips non-deal entities', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onStageChange' }),
    ])
    await evaluateRules(event({
      type: 'entity.updated',
      entity: 'contact',
      before: { stageId: 's1' },
      after:  { stageId: 's2' },
    }))
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })

  it('onSchedule fires on type=schedule', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onSchedule', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event({ type: 'schedule', entity: undefined, entityId: undefined }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('unknown trigger string never fires', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'totallyMadeUp' }),
    ])
    await evaluateRules(event())
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
  })
})

describe('runAction — sendEmail', () => {
  it('returns error when accountId is missing', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendEmail', actionConfig: { to: 'x@y.com' } }),
    ])
    await evaluateRules(event())
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
    expect(log.error).toMatch(/accountId/i)
  })

  it('returns error when `to` is missing', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendEmail', actionConfig: { accountId: 'a1' } }),
    ])
    await evaluateRules(event())
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
  })

  it('renders subject + body templates with event.after context', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onEntityCreate',
        actionType: 'sendEmail',
        actionConfig: {
          accountId: 'a1',
          to: 'x@y.com',
          subject: 'New deal: {{title}}',
          body: 'Hello {{contactName}}',
        },
      }),
    ])
    await evaluateRules(event({
      after: { title: 'Atrium Loft', contactName: 'Alice' },
    }))
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
    const call = mocks.sendEmailMock.mock.calls[0][1]
    expect(call.subject).toBe('New deal: Atrium Loft')
    expect(call.bodyHtml).toBe('Hello Alice')
  })

  it('propagates sendEmail failure into the AutomationLog', async () => {
    mocks.sendEmailMock.mockResolvedValueOnce({ ok: false, error: 'SMTP down' })
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendEmail', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event())
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
    expect(log.error).toBe('SMTP down')
  })
})

describe('runAction — sendSMS', () => {
  it('errors without toNumber', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendSMS', actionConfig: {} }),
    ])
    await evaluateRules(event())
    expect(mocks.sendSmsMock).not.toHaveBeenCalled()
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
  })

  it('defaults channel to sms when unset', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendSMS', actionConfig: { toNumber: '+31612345678', body: 'hi' } }),
    ])
    await evaluateRules(event())
    expect(mocks.sendSmsMock).toHaveBeenCalledTimes(1)
    const call = mocks.sendSmsMock.mock.calls[0][1]
    expect(call.channel).toBe('sms')
  })

  it('passes through channel=whatsapp', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendSMS', actionConfig: { toNumber: '+31612345678', channel: 'whatsapp' } }),
    ])
    await evaluateRules(event())
    expect(mocks.sendSmsMock.mock.calls[0][1].channel).toBe('whatsapp')
  })
})

describe('runAction — createNotification', () => {
  it('errors without title', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'createNotification', actionConfig: {} }),
    ])
    await evaluateRules(event())
    expect(mocks.notificationCreateMock).not.toHaveBeenCalled()
    expect(mocks.publishNotificationMock).not.toHaveBeenCalled()
  })

  it('fans out to all admin + manager users in the org', async () => {
    mocks.userFindManyMock.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }])
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'createNotification', actionConfig: { title: 'Hi {{name}}' } }),
    ])
    await evaluateRules(event({ after: { name: 'Alice' } }))
    expect(mocks.notificationCreateMock).toHaveBeenCalledTimes(3)
    expect(mocks.notificationCreateMock.mock.calls[0][0].data.title).toBe('Hi Alice')
    expect(mocks.publishNotificationMock).toHaveBeenCalledTimes(1)
  })

  it('only queries admin+manager (not viewer) users', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'createNotification', actionConfig: { title: 'x' } }),
    ])
    await evaluateRules(event())
    const where = mocks.userFindManyMock.mock.calls[0][0].where
    expect(where.role.in).toEqual(['admin', 'manager'])
    expect(where.organizationId).toBe(ORG)
  })
})

describe('runAction — updateField', () => {
  it('errors without field name', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'updateField', actionConfig: { value: 'hot' } }),
    ])
    await evaluateRules(event())
    expect(mocks.dealUpdateMock).not.toHaveBeenCalled()
  })

  it('errors without value', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'updateField', actionConfig: { field: 'status' } }),
    ])
    await evaluateRules(event())
    expect(mocks.dealUpdateMock).not.toHaveBeenCalled()
  })

  it('updates a Deal field', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onEntityCreate',
        actionType: 'updateField',
        actionConfig: { field: 'status', value: 'qualified' },
      }),
    ])
    await evaluateRules(event({ entity: 'deal', entityId: 'deal_42' }))
    expect(mocks.dealUpdateMock).toHaveBeenCalledTimes(1)
    expect(mocks.dealUpdateMock.mock.calls[0][0]).toEqual({
      where: { id: 'deal_42' },
      data: { status: 'qualified' },
    })
  })

  it('updates a Contact field', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onEntityCreate',
        actionType: 'updateField',
        actionConfig: { field: 'leadScore', value: 100 },
      }),
    ])
    await evaluateRules(event({ entity: 'contact', entityId: 'c_5' }))
    expect(mocks.contactUpdateMock).toHaveBeenCalledTimes(1)
    expect(mocks.contactUpdateMock.mock.calls[0][0].data).toEqual({ leadScore: 100 })
  })

  it('errors when entity is unsupported', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onEntityCreate',
        actionType: 'updateField',
        actionConfig: { field: 'foo', value: 'bar' },
      }),
    ])
    await evaluateRules(event({ entity: 'kanbanCard' }))
    expect(mocks.dealUpdateMock).not.toHaveBeenCalled()
    expect(mocks.contactUpdateMock).not.toHaveBeenCalled()
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
    expect(log.error).toMatch(/not supported/i)
  })
})

describe('runAction — moveStage', () => {
  it('errors without stageId', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'moveStage', actionConfig: {} }),
    ])
    await evaluateRules(event())
    expect(mocks.dealUpdateMock).not.toHaveBeenCalled()
  })

  it('updates the deal with new stageId', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'moveStage', actionConfig: { stageId: 'stage_xyz' } }),
    ])
    await evaluateRules(event({ entity: 'deal', entityId: 'deal_1' }))
    expect(mocks.dealUpdateMock.mock.calls[0][0]).toEqual({
      where: { id: 'deal_1' },
      data: { stageId: 'stage_xyz' },
    })
  })
})

describe('runAction — callWebhook', () => {
  it('errors without url', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'callWebhook', actionConfig: {} }),
    ])
    await evaluateRules(event())
    expect(mocks.dispatchWebhookEventMock).not.toHaveBeenCalled()
  })

  it('dispatches with the supplied url and payload', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({
        trigger: 'onEntityCreate',
        actionType: 'callWebhook',
        actionConfig: { url: 'https://hooks.example.com/x', payload: { hello: 'world' } },
      }),
    ])
    await evaluateRules(event())
    expect(mocks.dispatchWebhookEventMock).toHaveBeenCalledTimes(1)
    const [orgId, eventName, data] = mocks.dispatchWebhookEventMock.mock.calls[0]
    expect(orgId).toBe(ORG)
    expect(eventName).toBe('automation.action')
    expect(data).toEqual({ url: 'https://hooks.example.com/x', payload: { hello: 'world' } })
  })
})

describe('runAction — unknown action', () => {
  it('logs a failure with the action name', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'wat' }),
    ])
    await evaluateRules(event())
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('failure')
    expect(log.error).toMatch(/Unknown action.*wat/i)
  })
})

describe('evaluateRules — orchestration', () => {
  it('writes a success AutomationLog on ok action', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendEmail', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event())
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.status).toBe('success')
    expect(log.ruleId).toBe('rule_1')
    expect(log.error).toBe(null)
  })

  it('skips disabled rules — Prisma already filters on enabled=true', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([])
    await evaluateRules(event())
    expect(mocks.sendEmailMock).not.toHaveBeenCalled()
    expect(mocks.automationLogCreateMock).not.toHaveBeenCalled()
    // Verify the where clause restricts to enabled=true
    const where = mocks.automationRuleFindManyMock.mock.calls[0][0].where
    expect(where.enabled).toBe(true)
    expect(where.organizationId).toBe(ORG)
  })

  it('parses corrupt triggerConfig JSON without throwing', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([{
      id: 'r',
      organizationId: ORG,
      enabled: true,
      trigger: 'onEntityCreate',
      actionType: 'sendEmail',
      triggerConfig: '{not valid json',
      actionConfig: '{"accountId":"a1","to":"x@y.com"}',
    }])
    // Should not throw — and since triggerConfig falls back to {}, the
    // trigger still matches and the action runs.
    await expect(evaluateRules(event())).resolves.toBeUndefined()
    expect(mocks.sendEmailMock).toHaveBeenCalled()
  })

  it('evaluates multiple rules in parallel for one event', async () => {
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ id: 'r1', actionType: 'sendEmail',  actionConfig: { accountId: 'a1', to: 'a@x.com' } }),
      rule({ id: 'r2', actionType: 'callWebhook', actionConfig: { url: 'https://x' } }),
    ])
    await evaluateRules(event())
    expect(mocks.sendEmailMock).toHaveBeenCalledTimes(1)
    expect(mocks.dispatchWebhookEventMock).toHaveBeenCalledTimes(1)
    expect(mocks.automationLogCreateMock).toHaveBeenCalledTimes(2)
  })

  it('continues when one action throws (other rules still run)', async () => {
    mocks.sendEmailMock.mockImplementationOnce(() => { throw new Error('boom') })
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ id: 'r1', actionType: 'sendEmail',  actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
      rule({ id: 'r2', actionType: 'callWebhook', actionConfig: { url: 'https://x' } }),
    ])
    await evaluateRules(event())
    expect(mocks.dispatchWebhookEventMock).toHaveBeenCalledTimes(1)
    expect(mocks.automationLogCreateMock).toHaveBeenCalledTimes(2)
    // r1 should log as failure
    const failureCall = mocks.automationLogCreateMock.mock.calls.find(
      c => c[0].data.ruleId === 'r1',
    )
    expect(failureCall![0].data.status).toBe('failure')
    expect(failureCall![0].data.error).toBe('boom')
  })

  it('truncates oversize input/output JSON to 10000 chars', async () => {
    mocks.sendEmailMock.mockResolvedValueOnce({ ok: true, emailId: 'x'.repeat(20000) })
    mocks.automationRuleFindManyMock.mockResolvedValueOnce([
      rule({ trigger: 'onEntityCreate', actionType: 'sendEmail', actionConfig: { accountId: 'a1', to: 'x@y.com' } }),
    ])
    await evaluateRules(event())
    const log = mocks.automationLogCreateMock.mock.calls[0][0].data
    expect(log.output.length).toBeLessThanOrEqual(10000)
  })
})

describe('fireAutomationEvent — non-blocking', () => {
  it('returns void synchronously without awaiting evaluateRules', () => {
    // Long-running findMany — would hang the test if awaited
    let resolveRules: ((value: unknown[]) => void) | undefined
    mocks.automationRuleFindManyMock.mockReturnValueOnce(new Promise(r => { resolveRules = r as never }))

    const before = Date.now()
    const ret = fireAutomationEvent(event())
    const after = Date.now()

    expect(ret).toBeUndefined()
    expect(after - before).toBeLessThan(50)
    resolveRules!([])
  })
})
