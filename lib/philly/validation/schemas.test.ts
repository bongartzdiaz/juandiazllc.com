import { describe, it, expect } from 'vitest'
import {
  createProjectSchema,
  updateProjectSchema,
  createContactSchema,
  updateContactSchema,
  createKanbanCardSchema,
  createImpactMetricSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  createDealSchema,
  updateDealSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
  createGrantSchema,
  updateGrantSchema,
  createPropertySchema,
  createCalendarEventSchema,
} from './schemas'

// Schema coverage smoke tests. Every API route in /philly/api validates
// untrusted input through one of these — if a schema silently accepts
// bad input, the DB gets corrupted. These tests are the defensive
// perimeter.

describe('createProjectSchema', () => {
  const valid = { title: 'Solar rooftop program', startDate: '2026-04-01' }

  it('accepts the minimum valid payload with defaults', () => {
    const p = createProjectSchema.parse(valid)
    expect(p.status).toBe('planned')
    expect(p.category).toBe('general')
    expect(p.endDate).toBe(null)
    expect(p.budgetCents).toBe(0)
    expect(p.sdgGoals).toEqual([])
  })

  it('trims the title', () => {
    expect(createProjectSchema.parse({ ...valid, title: '   Solar   ' }).title).toBe('Solar')
  })

  it('rejects an empty title after trim', () => {
    expect(() => createProjectSchema.parse({ ...valid, title: '   ' })).toThrow(/Required/)
  })

  it('rejects an invalid startDate', () => {
    expect(() => createProjectSchema.parse({ ...valid, startDate: 'not a date' })).toThrow()
  })

  it('rejects an invalid status enum', () => {
    expect(() => createProjectSchema.parse({ ...valid, status: 'archived' })).toThrow()
  })

  it('rejects SDG goals outside 1-17', () => {
    expect(() => createProjectSchema.parse({ ...valid, sdgGoals: [0] })).toThrow()
    expect(() => createProjectSchema.parse({ ...valid, sdgGoals: [18] })).toThrow()
  })

  it('rejects negative budgetCents', () => {
    expect(() => createProjectSchema.parse({ ...valid, budgetCents: -100 })).toThrow()
  })
})

describe('updateProjectSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateProjectSchema.parse({})).toThrow(/At least one field/)
  })

  it('accepts a single-field update', () => {
    expect(updateProjectSchema.parse({ status: 'active' }).status).toBe('active')
  })
})

describe('createContactSchema', () => {
  it('accepts the minimum payload', () => {
    const c = createContactSchema.parse({ name: 'Jane' })
    expect(c.name).toBe('Jane')
    expect(c.type).toBe('stakeholder')
    expect(c.email).toBe('')
    expect(c.avatarUrl).toBe(null)
  })

  it('rejects an invalid email', () => {
    expect(() => createContactSchema.parse({ name: 'Jane', email: 'not-an-email' })).toThrow()
  })

  it('rejects an invalid avatarUrl', () => {
    expect(() => createContactSchema.parse({ name: 'Jane', avatarUrl: 'not a url' })).toThrow()
  })

  it('accepts null avatarUrl', () => {
    expect(createContactSchema.parse({ name: 'Jane', avatarUrl: null }).avatarUrl).toBe(null)
  })

  it('rejects invalid contact type enum', () => {
    expect(() => createContactSchema.parse({ name: 'Jane', type: 'prospect' })).toThrow()
  })

  it('rejects invalid leadStatus enum', () => {
    expect(() => createContactSchema.parse({ name: 'Jane', leadStatus: 'closed' })).toThrow()
  })

  it('rejects negative buyerPriceMin', () => {
    expect(() => createContactSchema.parse({ name: 'Jane', buyerPriceMin: -1 })).toThrow()
  })
})

describe('updateContactSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateContactSchema.parse({})).toThrow(/At least one field/)
  })
})

describe('createKanbanCardSchema', () => {
  const valid = { columnId: 'col_1', title: 'Write tests' }

  it('accepts the minimum payload', () => {
    const c = createKanbanCardSchema.parse(valid)
    expect(c.priority).toBe('medium')
    expect(c.dueDate).toBe(null)
    expect(c.assigneeId).toBe(null)
  })

  it('rejects a missing columnId', () => {
    expect(() => createKanbanCardSchema.parse({ title: 'x' })).toThrow()
  })

  it('rejects an invalid priority enum', () => {
    expect(() => createKanbanCardSchema.parse({ ...valid, priority: 'blocker' })).toThrow()
  })
})

describe('createImpactMetricSchema', () => {
  const valid = { projectId: 'p1', metricType: 'co2_kg' as const, value: 100 }

  it('accepts the minimum payload with defaults', () => {
    const m = createImpactMetricSchema.parse(valid)
    expect(m.unit).toBe('')
    expect(m.notes).toBe('')
  })

  it('rejects unknown metricType', () => {
    expect(() => createImpactMetricSchema.parse({ ...valid, metricType: 'bananas' })).toThrow()
  })

  it('accepts negative value (values may legitimately be negative)', () => {
    expect(createImpactMetricSchema.parse({ ...valid, value: -50 }).value).toBe(-50)
  })
})

describe('createMilestoneSchema + updateMilestoneSchema', () => {
  it('create requires title + valid dueDate', () => {
    expect(() => createMilestoneSchema.parse({ projectId: 'p1', title: 'x', dueDate: 'nope' })).toThrow()
    expect(() => createMilestoneSchema.parse({ projectId: 'p1', dueDate: '2026-05-01' })).toThrow()
  })

  it('update rejects invalid status enum', () => {
    expect(() => updateMilestoneSchema.parse({ status: 'in-progress' })).toThrow()
  })
})

describe('createDealSchema', () => {
  const valid = { pipelineId: 'pipe_1', stageId: 'stage_1', title: 'New deal' }

  it('accepts the minimum payload with defaults', () => {
    const d = createDealSchema.parse(valid)
    expect(d.valueCents).toBe(0)
    expect(d.probability).toBe(50)
    expect(d.status).toBe('open')
    expect(d.expectedClose).toBe(null)
  })

  it('rejects probability above 100', () => {
    expect(() => createDealSchema.parse({ ...valid, probability: 101 })).toThrow()
  })

  it('rejects probability below 0', () => {
    expect(() => createDealSchema.parse({ ...valid, probability: -1 })).toThrow()
  })

  it('rejects invalid status enum', () => {
    expect(() => createDealSchema.parse({ ...valid, status: 'pending' })).toThrow()
  })
})

describe('updateDealSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateDealSchema.parse({})).toThrow(/At least one field/)
  })

  it('accepts commission splits within 0-100', () => {
    const u = updateDealSchema.parse({ commissionPct: 3.5 })
    expect(u.commissionPct).toBe(3.5)
  })

  it('rejects commission above 100', () => {
    expect(() => updateDealSchema.parse({ commissionPct: 150 })).toThrow()
  })
})

describe('createTemplateSchema + updateTemplateSchema', () => {
  it('create accepts minimum payload with default type', () => {
    const t = createTemplateSchema.parse({ name: 'Welcome', body: 'Hello' })
    expect(t.type).toBe('email')
    expect(t.variables).toEqual([])
  })

  it('create rejects empty body', () => {
    expect(() => createTemplateSchema.parse({ name: 'x', body: '' })).toThrow()
  })

  it('update requires at least one field', () => {
    expect(() => updateTemplateSchema.parse({})).toThrow(/At least one field/)
  })
})

describe('createAutomationRuleSchema', () => {
  it('accepts a string triggerConfig', () => {
    const r = createAutomationRuleSchema.parse({
      name: 'Auto reply',
      trigger: 'contact.created',
      triggerConfig: '{"x":1}',
      actionType: 'email.send',
    })
    expect(r.enabled).toBe(true)
  })

  it('accepts an object triggerConfig', () => {
    const r = createAutomationRuleSchema.parse({
      name: 'Auto reply',
      trigger: 'contact.created',
      triggerConfig: { x: 1 },
      actionType: 'email.send',
    })
    expect(r.triggerConfig).toEqual({ x: 1 })
  })

  it('accepts an array triggerConfig', () => {
    const r = createAutomationRuleSchema.parse({
      name: 'Auto reply',
      trigger: 'contact.created',
      triggerConfig: ['a', 'b'],
      actionType: 'email.send',
    })
    expect(r.triggerConfig).toEqual(['a', 'b'])
  })
})

describe('updateAutomationRuleSchema', () => {
  it('requires at least one field', () => {
    expect(() => updateAutomationRuleSchema.parse({})).toThrow(/At least one field/)
  })
})

describe('createGrantSchema + updateGrantSchema', () => {
  it('create accepts minimum payload', () => {
    const g = createGrantSchema.parse({ title: 'NSF grant' })
    expect(g.status).toBe('prospect')
    expect(g.amountCents).toBe(0)
  })

  it('create rejects invalid status enum', () => {
    expect(() => createGrantSchema.parse({ title: 'x', status: 'in-review' })).toThrow()
  })

  it('update requires at least one field', () => {
    expect(() => updateGrantSchema.parse({})).toThrow(/At least one field/)
  })
})

describe('createPropertySchema', () => {
  const valid = { title: '21 Roof Lane' }

  it('accepts the minimum payload with defaults', () => {
    const p = createPropertySchema.parse(valid)
    expect(p.type).toBe('residential')
    expect(p.listingType).toBe('sale')
    expect(p.status).toBe('available')
    expect(p.priceCents).toBe(0)
  })

  it('rejects yearBuilt before 1800 or after 2100', () => {
    expect(() => createPropertySchema.parse({ ...valid, yearBuilt: 1700 })).toThrow()
    expect(() => createPropertySchema.parse({ ...valid, yearBuilt: 2200 })).toThrow()
  })

  it('accepts null lat/lng/bedrooms', () => {
    const p = createPropertySchema.parse({ ...valid, lat: null, lng: null, bedrooms: null })
    expect(p.lat).toBe(null)
    expect(p.bedrooms).toBe(null)
  })

  it('rejects invalid type enum', () => {
    expect(() => createPropertySchema.parse({ ...valid, type: 'barn' })).toThrow()
  })
})

describe('createCalendarEventSchema', () => {
  const valid = {
    title: 'Blueprint call',
    startTime: '2026-05-01T10:00:00Z',
    endTime: '2026-05-01T11:00:00Z',
  }

  it('accepts the minimum valid event', () => {
    const e = createCalendarEventSchema.parse(valid)
    expect(e.allDay).toBe(false)
    expect(e.color).toBe('#3B82F6')
    expect(e.attendeeIds).toEqual([])
  })

  it('accepts endTime equal to startTime (zero-duration events)', () => {
    const same = '2026-05-01T10:00:00Z'
    expect(() =>
      createCalendarEventSchema.parse({ title: 'x', startTime: same, endTime: same }),
    ).not.toThrow()
  })

  it('rejects endTime before startTime', () => {
    expect(() =>
      createCalendarEventSchema.parse({
        ...valid,
        endTime: '2026-05-01T09:00:00Z',
      }),
    ).toThrow(/endTime must be on or after startTime/)
  })

  it('rejects non-ISO timestamps', () => {
    expect(() =>
      createCalendarEventSchema.parse({ ...valid, startTime: 'tomorrow' }),
    ).toThrow()
  })

  it('rejects empty attendee ids', () => {
    expect(() =>
      createCalendarEventSchema.parse({ ...valid, attendeeIds: [''] }),
    ).toThrow()
  })
})
