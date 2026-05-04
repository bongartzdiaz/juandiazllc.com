import { describe, it, expect } from 'vitest'
import {
  groupToScim,
  parseScimGroupInput,
  parseGroupPatchOp,
} from './group-mapping'
import { GROUP_SCHEMA } from './schemas'

const NOW = new Date('2026-05-01T10:00:00Z')

describe('parseScimGroupInput', () => {
  it('requires a non-empty displayName', () => {
    expect(() => parseScimGroupInput({ displayName: '' })).toThrow(/displayName/)
    expect(() => parseScimGroupInput({})).toThrow(/displayName/)
  })

  it('parses externalId when present', () => {
    const r = parseScimGroupInput({ displayName: 'Engineering', externalId: 'okta-grp-eng' })
    expect(r.externalId).toBe('okta-grp-eng')
  })

  it('extracts member ids from the members array', () => {
    const r = parseScimGroupInput({
      displayName: 'Marketing',
      members: [
        { value: 'user_1' },
        { value: 'user_2', display: 'a@b.com' },
        { display: 'no-value' }, // dropped
        'wrong-shape',          // dropped
      ],
    })
    expect(r.memberIds).toEqual(['user_1', 'user_2'])
  })

  it('returns memberIds=undefined when members is absent (Bundle CM)', () => {
    // Bundle CM — distinguishes "absent" from "explicit empty".
    // PUT route uses this distinction so an Okta-style rename
    // (PUT without members field) doesn't mass-unenroll the group.
    const r = parseScimGroupInput({ displayName: 'Sales' })
    expect(r.memberIds).toBeUndefined()
  })

  it('returns memberIds=[] when members is an explicit empty array (Bundle CM)', () => {
    const r = parseScimGroupInput({ displayName: 'Sales', members: [] })
    expect(r.memberIds).toEqual([])
  })
})

describe('groupToScim', () => {
  it('emits the expected SCIM payload', () => {
    const out = groupToScim({
      id: 'grp_1',
      organizationId: 'org_1',
      scimExternalId: 'okta-grp-eng',
      displayName: 'Engineering',
      createdAt: NOW,
      members: [{ id: 'user_1', email: 'alice@example.com' }],
    }, 'https://app.example.com/api/scim/v2')

    expect(out.schemas).toEqual([GROUP_SCHEMA])
    expect(out.id).toBe('grp_1')
    expect(out.externalId).toBe('okta-grp-eng')
    expect(out.displayName).toBe('Engineering')
    expect(out.members).toEqual([
      {
        value: 'user_1',
        display: 'alice@example.com',
        type: 'User',
        $ref: 'https://app.example.com/api/scim/v2/Users/user_1',
      },
    ])
    expect(out.meta.resourceType).toBe('Group')
    expect(out.meta.location).toBe('https://app.example.com/api/scim/v2/Groups/grp_1')
  })

  it('omits externalId when null', () => {
    const out = groupToScim({
      id: 'grp_1',
      organizationId: 'org_1',
      scimExternalId: null,
      displayName: 'Engineering',
      createdAt: NOW,
    }, 'https://x/api/scim/v2')
    expect('externalId' in out).toBe(false)
  })
})

describe('parseGroupPatchOp', () => {
  it('parses Okta add-members op', () => {
    const r = parseGroupPatchOp({
      op: 'add', path: 'members',
      value: [{ value: 'user_1' }, { value: 'user_2' }],
    })
    expect(r).toEqual({ add: ['user_1', 'user_2'], remove: [] })
  })

  it('parses Okta remove-by-filter op', () => {
    const r = parseGroupPatchOp({
      op: 'remove', path: 'members[value eq "user_xyz"]',
    })
    expect(r).toEqual({ add: [], remove: ['user_xyz'] })
  })

  it('parses Azure path-less replace (whole group payload)', () => {
    const r = parseGroupPatchOp({
      op: 'replace',
      value: {
        displayName: 'New Name',
        externalId: 'okta-new',
        members: [{ value: 'user_a' }, { value: 'user_b' }],
      },
    })
    expect(r).toMatchObject({
      add: [],
      remove: [],
      replace: ['user_a', 'user_b'],
      setDisplayName: 'New Name',
      setExternalId: 'okta-new',
    })
  })

  it('parses path-ed replace for displayName', () => {
    const r = parseGroupPatchOp({ op: 'replace', path: 'displayName', value: 'Sales' })
    expect(r).toEqual({ add: [], remove: [], setDisplayName: 'Sales' })
  })

  it('rejects bare add without an array value', () => {
    const r = parseGroupPatchOp({ op: 'add', path: 'members', value: 'not-an-array' })
    expect(r).toMatchObject({ error: expect.stringContaining('add members') })
  })

  it('rejects unsupported paths', () => {
    const r = parseGroupPatchOp({ op: 'replace', path: 'unknown', value: 'x' })
    expect(r).toMatchObject({ error: expect.stringContaining('Unsupported') })
  })

  it('treats remove of bare members path as full clear', () => {
    const r = parseGroupPatchOp({ op: 'remove', path: 'members' })
    expect(r).toEqual({ add: [], remove: [], replace: [] })
  })
})
