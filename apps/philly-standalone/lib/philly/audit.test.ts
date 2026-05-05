import { describe, it, expect } from 'vitest'
import { diffChanges } from './audit'

/* Bundle CS — unit tests for the security guards added in Bundle CR.
 * `diffChanges` keys come from request bodies via the audit-log path;
 * the FORBIDDEN_KEYS filter + Map detour through Object.fromEntries are
 * load-bearing for the codebase's prototype-pollution posture. */

describe('diffChanges — Bundle CR guards', () => {
  it('returns undefined when nothing changed', () => {
    expect(diffChanges({ a: 1 }, { a: 1 })).toBeUndefined()
  })

  it('returns the delta for a single field', () => {
    expect(diffChanges({ a: 1 }, { a: 2 })).toEqual({ a: { old: 1, new: 2 } })
  })

  it('returns multi-field deltas', () => {
    expect(diffChanges({ a: 1, b: 'x' }, { a: 2, b: 'y' })).toEqual({
      a: { old: 1, new: 2 },
      b: { old: 'x', new: 'y' },
    })
  })

  it('skips identical values via JSON.stringify equality', () => {
    expect(diffChanges({ a: { x: 1 } }, { a: { x: 1 } })).toBeUndefined()
  })

  it('detects changed nested values', () => {
    const r = diffChanges({ a: { x: 1 } }, { a: { x: 2 } })
    expect(r).toEqual({ a: { old: { x: 1 }, new: { x: 2 } } })
  })

  // Bundle CR — prototype-pollution defence: __proto__ / constructor /
  // prototype keys are dropped so a hostile request body can't poison
  // Object.prototype through the downstream JSON serializer.
  it('drops __proto__ key from diff output', () => {
    const r = diffChanges({}, { ['__proto__']: { polluted: true } } as Record<string, unknown>)
    expect(r).toBeUndefined()
  })

  it('drops constructor key from diff output', () => {
    const r = diffChanges({}, { constructor: { x: 1 } })
    expect(r).toBeUndefined()
  })

  it('drops prototype key from diff output', () => {
    const r = diffChanges({}, { prototype: { x: 1 } })
    expect(r).toBeUndefined()
  })

  it('keeps legitimate fields when forbidden keys coexist', () => {
    const r = diffChanges(
      { a: 1 },
      { a: 2, ['__proto__']: { p: 1 } } as Record<string, unknown>,
    )
    expect(r).toEqual({ a: { old: 1, new: 2 } })
  })

  it('returned object has no Object.prototype reference for the forbidden keys', () => {
    // The diff output keys never include forbidden ones, so Object.fromEntries
    // produces a clean object that JSON.stringify serialises without leaking.
    const r = diffChanges(
      { a: 1 },
      { a: 2, ['__proto__']: { hacked: true } } as Record<string, unknown>,
    )
    const serialized = JSON.stringify(r)
    expect(serialized).not.toContain('__proto__')
    expect(serialized).not.toContain('hacked')
  })
})
