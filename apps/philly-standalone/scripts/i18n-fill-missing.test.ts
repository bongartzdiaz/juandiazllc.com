import { describe, it, expect } from 'vitest'
import { walk, getAt, setAt, isIcuLike } from './i18n-fill-missing'

describe('walk', () => {
  it('yields [path, value] for every leaf string', () => {
    const out = [...walk({
      a: 'hello',
      nested: { b: 'world', deep: { c: 'foo' } },
    })]
    expect(out).toEqual([
      [['a'], 'hello'],
      [['nested', 'b'], 'world'],
      [['nested', 'deep', 'c'], 'foo'],
    ])
  })

  it('skips non-string leaves (numbers, booleans, arrays)', () => {
    const out = [...walk({ a: 'x', b: 1, c: true, d: [1, 2], e: 'y' })]
    expect(out).toEqual([[['a'], 'x'], [['e'], 'y']])
  })

  it('returns nothing for empty / non-object input', () => {
    expect([...walk({})]).toEqual([])
    expect([...walk(null)]).toEqual([])
    expect([...walk('top-level string', [])]).toEqual([[[], 'top-level string']])
  })
})

describe('getAt / setAt', () => {
  it('reads nested values', () => {
    const obj = { a: { b: { c: 'deep' } } }
    expect(getAt(obj, ['a', 'b', 'c'])).toBe('deep')
    expect(getAt(obj, ['a', 'missing'])).toBeUndefined()
    expect(getAt(obj, [])).toBe(obj)
  })

  it('writes nested values, creating intermediate objects', () => {
    const obj: Record<string, unknown> = { a: { b: 'old' } }
    setAt(obj, ['a', 'c', 'd'], 'new')
    expect((obj.a as Record<string, unknown>).c).toEqual({ d: 'new' })
    expect((obj.a as Record<string, unknown>).b).toBe('old')
  })

  it('overwrites a non-object intermediate with an object so nested paths land', () => {
    const obj: Record<string, unknown> = { a: 'string-leaf' }
    setAt(obj, ['a', 'b'], 'value')
    expect(obj.a).toEqual({ b: 'value' })
  })
})

describe('isIcuLike', () => {
  it('flags ICU plural strings', () => {
    expect(isIcuLike('{count, plural, one {# item} other {# items}}')).toBe(true)
    expect(isIcuLike('You have {n, plural, one {# message} other {# messages}}')).toBe(true)
  })

  it('flags ICU select strings', () => {
    expect(isIcuLike('{gender, select, male {Mr.} female {Ms.} other {Mx.}}')).toBe(true)
  })

  it('flags selectordinal', () => {
    expect(isIcuLike('{place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}')).toBe(true)
  })

  it('does NOT flag plain interpolations', () => {
    expect(isIcuLike('Hello {name}')).toBe(false)
    expect(isIcuLike('Saved {entity} ({id})')).toBe(false)
  })

  it('does NOT flag plain strings', () => {
    expect(isIcuLike('Welcome')).toBe(false)
    expect(isIcuLike('')).toBe(false)
  })
})
