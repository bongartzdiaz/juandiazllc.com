import { describe, it, expect } from 'vitest'
import { parseScimUserInput, userToScim } from './mapping'

describe('parseScimUserInput', () => {
  it('extracts userName + name + email + active', () => {
    const result = parseScimUserInput({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'alice@example.com',
      name: { givenName: 'Alice', familyName: 'Liddell', formatted: 'Alice Liddell' },
      emails: [{ value: 'alice@example.com', primary: true, type: 'work' }],
      active: true,
    })
    expect(result.email).toBe('alice@example.com')
    expect(result.name).toBe('Alice Liddell')
    expect(result.active).toBe(true)
  })

  it('falls back to userName for name when none provided', () => {
    const result = parseScimUserInput({ userName: 'bob@example.com' })
    expect(result.name).toBe('bob')
  })

  it('composes name from given+family when formatted absent', () => {
    const result = parseScimUserInput({
      userName: 'c@x.com',
      name: { givenName: 'Carol', familyName: 'Lewis' },
    })
    expect(result.name).toBe('Carol Lewis')
  })

  it('prefers primary email over the first email', () => {
    const result = parseScimUserInput({
      userName: 'multi@example.com',
      emails: [
        { value: 'old@example.com', primary: false },
        { value: 'new@example.com', primary: true },
      ],
    })
    expect(result.email).toBe('new@example.com')
  })

  it('falls back to first email when none is marked primary', () => {
    const result = parseScimUserInput({
      userName: 'fallback@example.com',
      emails: [{ value: 'first@example.com' }, { value: 'second@example.com' }],
    })
    expect(result.email).toBe('first@example.com')
  })

  it('preserves undefined when active is omitted (Bundle CG)', () => {
    // Distinguish "omitted" from "true" so PUT routes can leave
    // deletionScheduledAt untouched on a re-sync that doesn't carry
    // active. Previously this returned `true` and silently undeleted
    // soft-deleted users.
    const result = parseScimUserInput({ userName: 'd@x.com' })
    expect(result.active).toBeUndefined()
  })

  it('coerces explicit true / false', () => {
    expect(parseScimUserInput({ userName: 't@x.com', active: true }).active).toBe(true)
    expect(parseScimUserInput({ userName: 'f@x.com', active: false }).active).toBe(false)
  })

  it('captures externalId when present', () => {
    const result = parseScimUserInput({ userName: 'e@x.com', externalId: 'okta-abc-123' })
    expect(result.externalId).toBe('okta-abc-123')
  })

  it('throws on missing userName', () => {
    expect(() => parseScimUserInput({})).toThrow(/userName is required/)
    expect(() => parseScimUserInput({ userName: '' })).toThrow(/userName is required/)
  })

  it('throws on non-object body', () => {
    expect(() => parseScimUserInput(null)).toThrow()
    expect(() => parseScimUserInput('not-an-object')).toThrow()
  })
})

describe('userToScim', () => {
  it('renders a SCIM User envelope', () => {
    const user = {
      id: 'user_1',
      email: 'alice@example.com',
      name: 'Alice Liddell',
      organizationId: 'org_1',
      deletionScheduledAt: null,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    }
    const scim = userToScim(user, 'https://app.example.com/api/scim/v2')
    expect(scim.userName).toBe('alice@example.com')
    expect(scim.name.givenName).toBe('Alice')
    expect(scim.name.familyName).toBe('Liddell')
    expect(scim.name.formatted).toBe('Alice Liddell')
    expect(scim.emails[0]).toEqual({ value: 'alice@example.com', primary: true, type: 'work' })
    expect(scim.active).toBe(true)
    expect(scim.meta.location).toBe('https://app.example.com/api/scim/v2/Users/user_1')
    expect(scim.schemas).toEqual(['urn:ietf:params:scim:schemas:core:2.0:User'])
  })

  it('marks deleted users as inactive', () => {
    const user = {
      id: 'user_2',
      email: 'gone@example.com',
      name: 'Gone',
      organizationId: 'org_1',
      deletionScheduledAt: new Date(),
      createdAt: new Date('2026-01-01'),
    }
    const scim = userToScim(user, 'https://x/scim/v2')
    expect(scim.active).toBe(false)
  })

  it('handles single-word names', () => {
    const user = {
      id: 'u3', email: 'cher@example.com', name: 'Cher',
      organizationId: 'o', deletionScheduledAt: null,
      createdAt: new Date(),
    }
    const scim = userToScim(user, 'https://x')
    expect(scim.name.givenName).toBe('Cher')
    expect(scim.name.familyName).toBe('')
  })
})
