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
  updateOutreachLeadSchema,
  updateOutreachMessageSchema,
  leadSearchQuery,
  leadSortFieldEnum,
  createInviteSchema,
  acceptInviteSchema,
  inviteRoleEnum,
  deleteAccountSchema,
  deleteUserSchema,
  dsarScopeEnum,
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

// ── Outreach (LinkedIn campaign pipeline) ──

describe('leadSearchQuery', () => {
  it('strips PostgREST filter delimiters that could break out of or()', () => {
    // The injection vector: a `,` in the search string would terminate
    // the current ilike clause and let an attacker append their own filters.
    const out = leadSearchQuery.parse('x),status.eq.partner_signed,first_name.ilike.%(y')
    expect(out).not.toContain(',')
    expect(out).not.toContain('(')
    expect(out).not.toContain(')')
    expect(out).not.toContain('%')
    expect(out).not.toContain('*')
    expect(out).not.toContain('\\')
  })

  it('preserves normal alphanumeric + spaces', () => {
    expect(leadSearchQuery.parse('Jan de Vries')).toBe('Jan de Vries')
  })

  it('trims whitespace', () => {
    expect(leadSearchQuery.parse('  hello  ')).toBe('hello')
  })

  it('rejects strings longer than 80 chars', () => {
    expect(() => leadSearchQuery.parse('a'.repeat(81))).toThrow()
  })
})

describe('leadSortFieldEnum', () => {
  it('accepts known sort columns', () => {
    expect(leadSortFieldEnum.parse('icp_score')).toBe('icp_score')
    expect(leadSortFieldEnum.parse('created_at')).toBe('created_at')
  })

  it('rejects arbitrary column names that could leak schema in errors', () => {
    expect(() => leadSortFieldEnum.parse('password_hash')).toThrow()
    expect(() => leadSortFieldEnum.parse('1; DROP TABLE leads')).toThrow()
  })
})

describe('updateOutreachLeadSchema', () => {
  it('accepts a single field update', () => {
    const out = updateOutreachLeadSchema.parse({ priority: 'high' })
    expect(out.priority).toBe('high')
  })

  it('accepts multiple fields', () => {
    const out = updateOutreachLeadSchema.parse({
      status: 'do_not_contact',
      do_not_contact: true,
      dnc_reason: 'requested via reply',
    })
    expect(out.do_not_contact).toBe(true)
  })

  it('rejects an empty body', () => {
    expect(() => updateOutreachLeadSchema.parse({})).toThrow(/At least one field/)
  })

  it('rejects an unknown status value', () => {
    expect(() =>
      updateOutreachLeadSchema.parse({ status: 'totally_made_up' }),
    ).toThrow()
  })

  it('rejects an out-of-range icp_segment', () => {
    expect(() => updateOutreachLeadSchema.parse({ icp_segment: 5 })).toThrow()
    expect(() => updateOutreachLeadSchema.parse({ icp_segment: 0 })).toThrow()
  })

  it('rejects a non-boolean do_not_contact', () => {
    expect(() =>
      updateOutreachLeadSchema.parse({ do_not_contact: 'yes' as unknown as boolean }),
    ).toThrow()
  })

  it('caps note + dnc_reason length to prevent payload abuse', () => {
    expect(() =>
      updateOutreachLeadSchema.parse({ notes: 'a'.repeat(2001) }),
    ).toThrow()
    expect(() =>
      updateOutreachLeadSchema.parse({ dnc_reason: 'b'.repeat(501) }),
    ).toThrow()
  })
})

describe('updateOutreachMessageSchema', () => {
  const id = '00000000-0000-4000-8000-000000000000'

  it('accepts approve with just an id', () => {
    const out = updateOutreachMessageSchema.parse({ id, action: 'approve' })
    expect(out.action).toBe('approve')
  })

  it('accepts reject with just an id', () => {
    const out = updateOutreachMessageSchema.parse({ id, action: 'reject' })
    expect(out.action).toBe('reject')
  })

  it('accepts edit with body', () => {
    const out = updateOutreachMessageSchema.parse({ id, action: 'edit', body: 'Hi there' })
    expect(out.action).toBe('edit')
    if (out.action === 'edit') expect(out.body).toBe('Hi there')
  })

  it('rejects edit without body — body is what makes the edit non-trivial', () => {
    expect(() =>
      updateOutreachMessageSchema.parse({ id, action: 'edit' }),
    ).toThrow()
  })

  it('rejects edit with empty body', () => {
    expect(() =>
      updateOutreachMessageSchema.parse({ id, action: 'edit', body: '' }),
    ).toThrow()
  })

  it('rejects body over 2000 chars', () => {
    expect(() =>
      updateOutreachMessageSchema.parse({ id, action: 'edit', body: 'x'.repeat(2001) }),
    ).toThrow()
  })

  it('rejects an unknown action', () => {
    expect(() =>
      updateOutreachMessageSchema.parse({ id, action: 'send' }),
    ).toThrow()
  })

  it('rejects a non-uuid id', () => {
    expect(() =>
      updateOutreachMessageSchema.parse({ id: 'not-a-uuid', action: 'approve' }),
    ).toThrow()
  })
})

// ── Invites + seats ──

describe('createInviteSchema', () => {
  it('accepts a valid email + role', () => {
    const out = createInviteSchema.parse({ email: 'jane@example.com', role: 'manager' })
    expect(out.email).toBe('jane@example.com')
    expect(out.role).toBe('manager')
  })

  it('defaults role to viewer', () => {
    const out = createInviteSchema.parse({ email: 'jane@example.com' })
    expect(out.role).toBe('viewer')
  })

  it('lowercases + trims the email so duplicates canonicalize', () => {
    const out = createInviteSchema.parse({ email: '  Jane@Example.COM  ' })
    expect(out.email).toBe('jane@example.com')
  })

  it('rejects malformed emails', () => {
    expect(() => createInviteSchema.parse({ email: 'not-an-email' })).toThrow()
    expect(() => createInviteSchema.parse({ email: '@example.com' })).toThrow()
  })

  it('rejects unknown roles — prevents privilege escalation', () => {
    expect(() => createInviteSchema.parse({ email: 'a@b.com', role: 'superadmin' })).toThrow()
    expect(() => createInviteSchema.parse({ email: 'a@b.com', role: 'owner' })).toThrow()
  })

  it('caps email length to prevent payload abuse', () => {
    const oversized = 'a'.repeat(250) + '@b.com'
    expect(() => createInviteSchema.parse({ email: oversized })).toThrow()
  })
})

describe('acceptInviteSchema', () => {
  const valid = {
    token: 'a'.repeat(43),
    name: 'Jane Doe',
    password: 'long-strong-password-123',
  }

  it('accepts a fully-valid payload', () => {
    const out = acceptInviteSchema.parse(valid)
    expect(out.name).toBe('Jane Doe')
  })

  it('rejects passwords shorter than 12 chars — bank-grade minimum', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, password: 'short' })).toThrow()
    expect(() => acceptInviteSchema.parse({ ...valid, password: 'eleven-chrs' })).toThrow()
  })

  it('rejects tokens shorter than 20 chars — prevents accidental brute-force', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, token: 'short' })).toThrow()
  })

  it('caps token length so storage never blows up', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, token: 'a'.repeat(101) })).toThrow()
  })

  it('caps name length to prevent payload abuse', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, name: 'a'.repeat(121) })).toThrow()
  })

  it('rejects an empty name', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, name: '   ' })).toThrow()
  })

  it('caps password length so we never bcrypt a 1MB payload', () => {
    expect(() => acceptInviteSchema.parse({ ...valid, password: 'a'.repeat(201) })).toThrow()
  })
})

describe('inviteRoleEnum', () => {
  it('only accepts the three documented roles', () => {
    expect(inviteRoleEnum.parse('admin')).toBe('admin')
    expect(inviteRoleEnum.parse('manager')).toBe('manager')
    expect(inviteRoleEnum.parse('viewer')).toBe('viewer')
  })

  it('rejects anything else — privilege-escalation guard', () => {
    expect(() => inviteRoleEnum.parse('owner')).toThrow()
    expect(() => inviteRoleEnum.parse('root')).toThrow()
    expect(() => inviteRoleEnum.parse('')).toThrow()
  })
})

// ── GDPR — erasure ──

describe('deleteAccountSchema', () => {
  it('accepts the literal "DELETE" confirmation', () => {
    expect(deleteAccountSchema.parse({ confirmation: 'DELETE' }).confirmation).toBe('DELETE')
  })

  it('rejects lowercase "delete" — typed-confirmation must be exact', () => {
    expect(() => deleteAccountSchema.parse({ confirmation: 'delete' })).toThrow()
  })

  it('rejects close misses to prevent accidental deletes', () => {
    expect(() => deleteAccountSchema.parse({ confirmation: 'DELET' })).toThrow()
    expect(() => deleteAccountSchema.parse({ confirmation: 'DELETE ' })).toThrow()
    expect(() => deleteAccountSchema.parse({ confirmation: '' })).toThrow()
  })

  it('rejects missing confirmation', () => {
    expect(() => deleteAccountSchema.parse({})).toThrow()
  })
})

describe('deleteUserSchema', () => {
  it('accepts no body', () => {
    expect(deleteUserSchema.parse({}).reason).toBeUndefined()
  })

  it('accepts a reason', () => {
    expect(deleteUserSchema.parse({ reason: 'Left the company' }).reason).toBe('Left the company')
  })

  it('caps reason length to prevent payload abuse', () => {
    expect(() => deleteUserSchema.parse({ reason: 'a'.repeat(501) })).toThrow()
  })
})

describe('dsarScopeEnum', () => {
  it('accepts user and org', () => {
    expect(dsarScopeEnum.parse('user')).toBe('user')
    expect(dsarScopeEnum.parse('org')).toBe('org')
  })

  it('rejects anything else — prevents arbitrary scope expansion', () => {
    expect(() => dsarScopeEnum.parse('all')).toThrow()
    expect(() => dsarScopeEnum.parse('admin')).toThrow()
    expect(() => dsarScopeEnum.parse('global')).toThrow()
  })
})
