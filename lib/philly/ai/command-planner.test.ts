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
  it('WRITE_TOOLS contains exactly the three mutating tools', () => {
    expect(WRITE_TOOLS.size).toBe(3)
    expect(WRITE_TOOLS.has('update_deal_stage')).toBe(true)
    expect(WRITE_TOOLS.has('add_contact_note')).toBe(true)
    expect(WRITE_TOOLS.has('set_lead_status')).toBe(true)
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
