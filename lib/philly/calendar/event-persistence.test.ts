import { describe, it, expect } from 'vitest'
import { filterMatchedAttendees, redactedLabel, __internals } from './event-persistence'

describe('filterMatchedAttendees (Art. 9 privacy filter)', () => {
  it('returns only attendees whose email is in the contact set', () => {
    const contacts = new Set(['alice@example.com', 'bob@example.com'])
    const attendees = ['alice@example.com', 'stranger@elsewhere.org']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual(['alice@example.com'])
  })

  it('returns an empty array when no attendees match — no persistence', () => {
    const contacts = new Set(['alice@example.com'])
    const attendees = ['stranger@elsewhere.org', 'nobody@nowhere.org']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual([])
  })

  it('lowercases attendee emails before matching (case-insensitive)', () => {
    const contacts = new Set(['alice@example.com'])
    const attendees = ['Alice@Example.COM']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual(['alice@example.com'])
  })

  it('deduplicates the matched list', () => {
    const contacts = new Set(['alice@example.com'])
    const attendees = ['alice@example.com', 'alice@example.com', 'Alice@Example.com']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual(['alice@example.com'])
  })

  it('returns matches sorted (stable upsert key)', () => {
    const contacts = new Set(['carol@x.com', 'alice@x.com', 'bob@x.com'])
    const attendees = ['carol@x.com', 'alice@x.com', 'bob@x.com']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual([
      'alice@x.com',
      'bob@x.com',
      'carol@x.com',
    ])
  })

  it('skips empty / falsy entries gracefully', () => {
    const contacts = new Set(['alice@example.com'])
    const attendees = ['', 'alice@example.com']
    expect(filterMatchedAttendees(attendees, contacts)).toEqual(['alice@example.com'])
  })
})

describe('redactedLabel (Art. 9 redaction for medical/legal verticals)', () => {
  it('returns "(redacted)" for empty input', () => {
    expect(redactedLabel('')).toBe('(redacted)')
  })

  it('does NOT include the plaintext anywhere in the output', () => {
    const sensitive = 'Oncology consult Dr. Smith'
    const out = redactedLabel(sensitive)
    expect(out).not.toContain('Oncology')
    expect(out).not.toContain('Smith')
    expect(out).not.toContain('consult')
  })

  it('is deterministic — same input produces same hash', () => {
    expect(redactedLabel('Therapy session')).toBe(redactedLabel('Therapy session'))
  })

  it('different inputs produce different short hashes (almost always)', () => {
    expect(redactedLabel('Meeting A')).not.toBe(redactedLabel('Meeting B'))
  })

  it('emits the "(redacted)" label prefix so the UI can render a placeholder', () => {
    expect(redactedLabel('Confidential briefing')).toMatch(/^\(redacted\) /)
  })

  it('hash is short (8 hex chars) — enough for change detection, not for dictionary attacks', () => {
    const out = redactedLabel('something')
    const hashPart = out.replace('(redacted) ', '')
    expect(hashPart).toMatch(/^[a-f0-9]{8}$/)
  })
})

describe('__internals (test-only)', () => {
  it('exposes redactedLabel for direct invocation', () => {
    expect(typeof __internals.redactedLabel).toBe('function')
  })
})
