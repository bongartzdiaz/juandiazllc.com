import { describe, it, expect } from 'vitest'
import {
  parseSteps, dueAtForStep, advanceAfterDelivery, initialDueAt,
  renderTemplate,
} from './steps'

const ENROLLED = new Date('2026-05-01T10:00:00Z')

describe('parseSteps', () => {
  it('parses a JSON-string stepsJson', () => {
    const json = JSON.stringify([
      { day: 0, channel: 'email', subject: 'Hi', body: 'Welcome' },
      { day: 3, channel: 'sms', body: 'Reminder' },
    ])
    expect(parseSteps(json)).toEqual([
      { day: 0, channel: 'email', subject: 'Hi', body: 'Welcome' },
      { day: 3, channel: 'sms', body: 'Reminder' },
    ])
  })

  it('parses an already-decoded array', () => {
    const arr = [{ day: 1, channel: 'email', body: 'hi' }]
    expect(parseSteps(arr)).toEqual(arr)
  })

  it('drops malformed steps but keeps the rest', () => {
    const arr = [
      { day: 0, channel: 'email', body: 'ok' },
      { day: 1, channel: 'invalid', body: 'dropped' }, // bad channel
      { day: 2, channel: 'sms', body: '' },             // empty body
      { day: 'wrong', channel: 'email', body: 'x' },   // non-numeric day
      { day: 3, channel: 'sms', body: 'kept' },
    ]
    expect(parseSteps(arr)).toEqual([
      { day: 0, channel: 'email', body: 'ok' },
      { day: 3, channel: 'sms', body: 'kept' },
    ])
  })

  it('returns [] on garbage', () => {
    expect(parseSteps('not-json')).toEqual([])
    expect(parseSteps(null)).toEqual([])
    expect(parseSteps(42)).toEqual([])
  })

  it('floors negative days to 0', () => {
    const out = parseSteps([{ day: -5, channel: 'email', body: 'x' }])
    expect(out).toEqual([{ day: 0, channel: 'email', body: 'x' }])
  })

  it('sorts steps by day ascending', () => {
    const out = parseSteps([
      { day: 7, channel: 'email', body: 'last' },
      { day: 0, channel: 'email', body: 'first' },
      { day: 3, channel: 'sms', body: 'mid' },
    ])
    expect(out.map(s => s.day)).toEqual([0, 3, 7])
  })
})

describe('dueAtForStep', () => {
  it('shifts enrolledAt by step.day days', () => {
    const out = dueAtForStep(ENROLLED, { day: 7, channel: 'email', body: 'x' })
    expect(out.toISOString()).toBe('2026-05-08T10:00:00.000Z')
  })

  it('day=0 fires immediately', () => {
    const out = dueAtForStep(ENROLLED, { day: 0, channel: 'email', body: 'x' })
    expect(out.toISOString()).toBe(ENROLLED.toISOString())
  })
})

describe('advanceAfterDelivery', () => {
  const steps = [
    { day: 0, channel: 'email' as const, body: 'a' },
    { day: 3, channel: 'email' as const, body: 'b' },
    { day: 7, channel: 'sms' as const, body: 'c' },
  ]

  it('advances from -1 (nothing delivered) to 0, schedules step[1]', () => {
    const r = advanceAfterDelivery(-1, steps, ENROLLED)
    expect(r.nextStepIndex).toBe(0)
    expect(r.done).toBe(false)
    expect(r.nextDueAt?.toISOString()).toBe('2026-05-04T10:00:00.000Z')
  })

  it('advances mid-campaign and schedules the following step', () => {
    const r = advanceAfterDelivery(0, steps, ENROLLED)
    expect(r.nextStepIndex).toBe(1)
    expect(r.done).toBe(false)
    expect(r.nextDueAt?.toISOString()).toBe('2026-05-08T10:00:00.000Z')
  })

  it('marks done after the last step', () => {
    const r = advanceAfterDelivery(1, steps, ENROLLED)
    expect(r.nextStepIndex).toBe(2)
    expect(r.done).toBe(true)
    expect(r.nextDueAt).toBeNull()
  })

  it('schedules nextDueAt relative to ENROLLMENT, not to previous step', () => {
    // Step 0 fires day 0, step 1 fires day 3. Even if step 0 was
    // delayed by a flaky provider and actually delivered on day 5,
    // step 1's nextDueAt is still enrolledAt + 3 days — not
    // delivery + 3 days.
    const r = advanceAfterDelivery(-1, steps, ENROLLED)
    expect(r.nextDueAt?.toISOString()).toBe('2026-05-04T10:00:00.000Z')
  })
})

describe('initialDueAt', () => {
  it('returns enrolledAt + step[0].day for a non-empty list', () => {
    const out = initialDueAt(ENROLLED, [{ day: 2, channel: 'email', body: 'x' }])
    expect(out?.toISOString()).toBe('2026-05-03T10:00:00.000Z')
  })

  it('returns null when there are no steps', () => {
    expect(initialDueAt(ENROLLED, [])).toBeNull()
  })
})

describe('renderTemplate', () => {
  it('substitutes contact.name / email / phone / company', () => {
    const out = renderTemplate(
      'Hi {{contact.name}}, reach you at {{contact.email}} or {{contact.phone}}? — {{contact.company}}',
      { name: 'Alice', email: 'a@b.com', phone: '+1 555', company: 'Acme' },
    )
    expect(out).toBe('Hi Alice, reach you at a@b.com or +1 555? — Acme')
  })

  it('substitutes empty string when the variable is missing', () => {
    const out = renderTemplate('Hello {{contact.name}}!', {})
    expect(out).toBe('Hello !')
  })

  it('tolerates whitespace inside the braces', () => {
    expect(renderTemplate('Hi {{ contact.name }}', { name: 'X' })).toBe('Hi X')
  })

  it('leaves unknown variables untouched (security: no arbitrary lookups)', () => {
    const out = renderTemplate('{{contact.password}} {{user.role}}', { name: 'X' })
    expect(out).toBe('{{contact.password}} {{user.role}}')
  })
})
