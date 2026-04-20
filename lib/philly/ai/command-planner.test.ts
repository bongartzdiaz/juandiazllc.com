import { describe, it, expect } from 'vitest'
import { planStepSchema, planSchema, WRITE_TOOLS, isWriteTool } from './command-planner'

describe('command-planner schema', () => {
  it('accepts a valid list_contacts step with defaults applied', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'list_contacts',
      args: { limit: 5 },
      rationale: 'User asked for the 5 newest contacts.',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success && parsed.data.tool === 'list_contacts') {
      expect(parsed.data.args.limit).toBe(5)
    }
  })

  it('accepts list_deals with topByValue', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'list_deals',
      args: { limit: 5, topByValue: true },
      rationale: 'Top-by-value requested.',
    })
    expect(parsed.success).toBe(true)
  })

  it('list_deals accepts omitted topByValue (optional)', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'list_deals',
      args: { limit: 3 },
      rationale: 'default path',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success && parsed.data.tool === 'list_deals') {
      expect(parsed.data.args.topByValue ?? false).toBe(false)
    }
  })

  it('rejects unknown tool names', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'delete_everything',
      args: {},
      rationale: 'no',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects navigate_to paths outside /philly', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'navigate_to',
      args: { path: '/admin' },
      rationale: 'open admin',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts navigate_to paths under /philly', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'navigate_to',
      args: { path: '/philly/settings/pipelines' },
      rationale: 'open pipelines',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects limit > 50 on list_contacts', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'list_contacts',
      args: { limit: 9999 },
      rationale: 'too many',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects search_entities with empty query', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'search_entities',
      args: { entity: 'contact', query: '', limit: 5 },
      rationale: 'search',
    })
    expect(parsed.success).toBe(false)
  })

  it('accepts count_entities with a time window', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'count_entities',
      args: { entity: 'deal', createdSince: 'week' },
      rationale: 'how many deals this week',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects invalid time window', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'count_entities',
      args: { entity: 'deal', createdSince: 'decade' },
      rationale: 'how many',
    })
    expect(parsed.success).toBe(false)
  })

  it('draft_followup_email requires identifier + angle', () => {
    const ok = planStepSchema.safeParse({
      tool: 'draft_followup_email',
      args: { identifier: 'marco@example.com', angle: 'ref Q3 energy pain' },
      rationale: 'user asked for a draft',
    })
    expect(ok.success).toBe(true)

    const bad = planStepSchema.safeParse({
      tool: 'draft_followup_email',
      args: { identifier: 'marco@example.com', angle: 'ab' },
      rationale: 'x',
    })
    expect(bad.success).toBe(false)
  })
})

describe('write tools', () => {
  it('WRITE_TOOLS contains all six mutating tools', () => {
    expect(WRITE_TOOLS.size).toBe(6)
    expect(WRITE_TOOLS.has('update_deal_stage')).toBe(true)
    expect(WRITE_TOOLS.has('add_contact_note')).toBe(true)
    expect(WRITE_TOOLS.has('set_lead_status')).toBe(true)
    expect(WRITE_TOOLS.has('create_task')).toBe(true)
    expect(WRITE_TOOLS.has('schedule_followup')).toBe(true)
    expect(WRITE_TOOLS.has('link_deal_to_contact')).toBe(true)
  })

  it('isWriteTool returns false for read-only tools', () => {
    expect(isWriteTool('list_contacts')).toBe(false)
    expect(isWriteTool('count_entities')).toBe(false)
    expect(isWriteTool('navigate_to')).toBe(false)
    expect(isWriteTool('draft_followup_email')).toBe(false)
  })

  it('isWriteTool returns true for mutating tools', () => {
    expect(isWriteTool('update_deal_stage')).toBe(true)
    expect(isWriteTool('add_contact_note')).toBe(true)
    expect(isWriteTool('set_lead_status')).toBe(true)
  })

  it('update_deal_stage requires both dealIdentifier and stageName', () => {
    const ok = planStepSchema.safeParse({
      tool: 'update_deal_stage',
      args: { dealIdentifier: 'Acme solar rooftop', stageName: 'Negotiation' },
      rationale: 'user asked to move the deal',
    })
    expect(ok.success).toBe(true)

    const missing = planStepSchema.safeParse({
      tool: 'update_deal_stage',
      args: { dealIdentifier: 'Acme solar rooftop' },
      rationale: 'user asked',
    })
    expect(missing.success).toBe(false)
  })

  it('set_lead_status rejects invalid status values', () => {
    const good = planStepSchema.safeParse({
      tool: 'set_lead_status',
      args: { identifier: 'marco@example.com', leadStatus: 'qualified' },
      rationale: 'qualify the lead',
    })
    expect(good.success).toBe(true)

    const bad = planStepSchema.safeParse({
      tool: 'set_lead_status',
      args: { identifier: 'marco@example.com', leadStatus: 'red_hot' },
      rationale: 'bump',
    })
    expect(bad.success).toBe(false)
  })

  it('add_contact_note requires note length >= 3', () => {
    const bad = planStepSchema.safeParse({
      tool: 'add_contact_note',
      args: { identifier: 'Marco', note: 'ok' },
      rationale: 'add a note',
    })
    expect(bad.success).toBe(false)

    const good = planStepSchema.safeParse({
      tool: 'add_contact_note',
      args: { identifier: 'Marco', note: 'followed up on Q3 solar figures' },
      rationale: 'note the call outcome',
    })
    expect(good.success).toBe(true)
  })

  it('create_task applies default dueInDays=1 when omitted', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'create_task',
      args: { identifier: 'Marco', title: 'Send revised solar quote' },
      rationale: 'user asked to add a task',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success && parsed.data.tool === 'create_task') {
      expect(parsed.data.args.dueInDays).toBe(1)
    }
  })

  it('create_task rejects dueInDays > 90', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'create_task',
      args: { identifier: 'Marco', title: 'Do the thing', dueInDays: 365 },
      rationale: 'too far out',
    })
    expect(parsed.success).toBe(false)
  })

  it('create_task requires title length >= 3', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'create_task',
      args: { identifier: 'Marco', title: 'x', dueInDays: 2 },
      rationale: 'title too short',
    })
    expect(parsed.success).toBe(false)
  })

  it('schedule_followup accepts morning/afternoon and applies default duration', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'schedule_followup',
      args: { title: 'Call Marco re solar', daysOut: 3 },
      rationale: 'user asked to schedule',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success && parsed.data.tool === 'schedule_followup') {
      expect(parsed.data.args.timeOfDay).toBe('morning')
      expect(parsed.data.args.durationMinutes).toBe(30)
    }
  })

  it('schedule_followup rejects invalid timeOfDay', () => {
    const parsed = planStepSchema.safeParse({
      tool: 'schedule_followup',
      args: { title: 'Call Marco', daysOut: 1, timeOfDay: 'midnight' },
      rationale: 'bad time',
    })
    expect(parsed.success).toBe(false)
  })

  it('schedule_followup allows optional identifier', () => {
    const noIdent = planStepSchema.safeParse({
      tool: 'schedule_followup',
      args: { title: 'Internal sync', daysOut: 7 },
      rationale: 'no contact mentioned',
    })
    expect(noIdent.success).toBe(true)

    const withIdent = planStepSchema.safeParse({
      tool: 'schedule_followup',
      args: { identifier: 'marco@example.com', title: 'Solar debrief', daysOut: 2 },
      rationale: 'with contact',
    })
    expect(withIdent.success).toBe(true)
  })

  it('link_deal_to_contact requires both identifiers', () => {
    const ok = planStepSchema.safeParse({
      tool: 'link_deal_to_contact',
      args: { dealIdentifier: 'Acme rooftop', contactIdentifier: 'marco@example.com' },
      rationale: 'attach contact',
    })
    expect(ok.success).toBe(true)

    const missing = planStepSchema.safeParse({
      tool: 'link_deal_to_contact',
      args: { dealIdentifier: 'Acme rooftop' },
      rationale: 'incomplete',
    })
    expect(missing.success).toBe(false)
  })
})

describe('planSchema', () => {
  it('accepts a plan with multiple steps and understanding', () => {
    const parsed = planSchema.safeParse({
      understanding: 'User wants the top 5 deals by value.',
      steps: [
        { tool: 'list_deals', args: { limit: 5, topByValue: true }, rationale: 'top 5 by value' },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it('accepts a plan with clarification and no steps', () => {
    const parsed = planSchema.safeParse({
      understanding: 'Request is ambiguous about entity type.',
      steps: [],
      clarification: 'Do you want contacts or deals?',
    })
    expect(parsed.success).toBe(true)
  })

  it('rejects more than 4 steps', () => {
    const parsed = planSchema.safeParse({
      understanding: 'too many steps',
      steps: Array(5).fill({
        tool: 'list_contacts',
        args: { limit: 5 },
        rationale: 'ok',
      }),
    })
    expect(parsed.success).toBe(false)
  })
})
