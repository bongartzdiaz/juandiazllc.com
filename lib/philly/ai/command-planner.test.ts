import { describe, it, expect } from 'vitest'
import { planStepSchema, planSchema } from './command-planner'

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
