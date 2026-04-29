import { describe, it, expect } from 'vitest'
import { compileFilter, FilterCompileError } from './compile'
import type { FilterEntitySchema, FilterSpec } from './types'

const schema: FilterEntitySchema = {
  entity: 'test',
  fields: [
    { id: 'name', label: 'Name', type: 'string' },
    { id: 'age', label: 'Age', type: 'number' },
    { id: 'createdAt', label: 'Created', type: 'date' },
    {
      id: 'role',
      label: 'Role',
      type: 'enum',
      options: [
        { value: 'admin', label: 'admin' },
        { value: 'viewer', label: 'viewer' },
      ],
    },
    { id: 'active', label: 'Active', type: 'boolean' },
  ],
}

describe('compileFilter — empty / nullish input', () => {
  it('returns {} for null', () => {
    expect(compileFilter(null, schema)).toEqual({})
  })

  it('returns {} for an empty group', () => {
    const spec: FilterSpec = { kind: 'group', combinator: 'AND', rules: [] }
    expect(compileFilter(spec, schema)).toEqual({})
  })

  it('throws on a non-group root', () => {
    expect(() => compileFilter({ kind: 'rule' } as never, schema)).toThrow(FilterCompileError)
  })
})

describe('compileFilter — string fields', () => {
  it('eq emits direct equality', () => {
    expect(compileFilter(rule('name', 'eq', 'Alice'), schema)).toEqual({ name: 'Alice' })
  })

  it('neq wraps in NOT', () => {
    expect(compileFilter(rule('name', 'neq', 'Alice'), schema)).toEqual({ NOT: { name: 'Alice' } })
  })

  it('contains uses Prisma `contains`', () => {
    expect(compileFilter(rule('name', 'contains', 'al'), schema)).toEqual({ name: { contains: 'al' } })
  })

  it('starts_with / ends_with map cleanly', () => {
    expect(compileFilter(rule('name', 'starts_with', 'A'), schema)).toEqual({ name: { startsWith: 'A' } })
    expect(compileFilter(rule('name', 'ends_with', 'e'), schema)).toEqual({ name: { endsWith: 'e' } })
  })

  it('is_empty matches empty string OR null', () => {
    expect(compileFilter(rule('name', 'is_empty'), schema)).toEqual({
      OR: [{ name: '' }, { name: { equals: null } }],
    })
  })

  it('is_not_empty matches non-empty AND non-null', () => {
    expect(compileFilter(rule('name', 'is_not_empty'), schema)).toEqual({
      AND: [{ NOT: { name: '' } }, { NOT: { name: null } }],
    })
  })
})

describe('compileFilter — number fields', () => {
  it('gt / gte / lt / lte map to Prisma operators', () => {
    expect(compileFilter(rule('age', 'gt', 30), schema)).toEqual({ age: { gt: 30 } })
    expect(compileFilter(rule('age', 'gte', 30), schema)).toEqual({ age: { gte: 30 } })
    expect(compileFilter(rule('age', 'lt', 30), schema)).toEqual({ age: { lt: 30 } })
    expect(compileFilter(rule('age', 'lte', 30), schema)).toEqual({ age: { lte: 30 } })
  })

  it('between accepts [low, high]', () => {
    expect(compileFilter(rule('age', 'between', [18, 65]), schema)).toEqual({
      age: { gte: 18, lte: 65 },
    })
  })

  it('coerces string-numeric values', () => {
    expect(compileFilter(rule('age', 'gt', '30'), schema)).toEqual({ age: { gt: 30 } })
  })

  it('throws on non-numeric value', () => {
    expect(() => compileFilter(rule('age', 'gt', 'foo'), schema)).toThrow(FilterCompileError)
  })

  it('between throws on a malformed pair', () => {
    expect(() => compileFilter(rule('age', 'between', [1]), schema)).toThrow(FilterCompileError)
  })
})

describe('compileFilter — date fields', () => {
  it('before/after coerce ISO strings', () => {
    expect(compileFilter(rule('createdAt', 'before', '2026-01-01'), schema)).toEqual({
      createdAt: { lt: new Date('2026-01-01') },
    })
  })

  it('on builds a 24h window', () => {
    const out = compileFilter(rule('createdAt', 'on', '2026-04-29'), schema) as {
      AND: Array<Record<string, unknown>>
    }
    expect(out.AND).toHaveLength(2)
    const start = (out.AND[0].createdAt as { gte: Date }).gte
    const end = (out.AND[1].createdAt as { lt: Date }).lt
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('between accepts ISO pair', () => {
    expect(
      compileFilter(rule('createdAt', 'between', ['2026-01-01', '2026-12-31']), schema),
    ).toEqual({ createdAt: { gte: new Date('2026-01-01'), lte: new Date('2026-12-31') } })
  })

  it('throws on invalid date string', () => {
    expect(() => compileFilter(rule('createdAt', 'before', 'not-a-date'), schema)).toThrow(FilterCompileError)
  })
})

describe('compileFilter — enum fields', () => {
  it('eq/in respect the option allowlist', () => {
    expect(compileFilter(rule('role', 'eq', 'admin'), schema)).toEqual({ role: 'admin' })
    expect(compileFilter(rule('role', 'in', ['admin', 'viewer']), schema)).toEqual({
      role: { in: ['admin', 'viewer'] },
    })
  })

  it('rejects values outside the allowlist', () => {
    expect(() => compileFilter(rule('role', 'eq', 'superuser'), schema)).toThrow(FilterCompileError)
    expect(() => compileFilter(rule('role', 'in', ['admin', 'superuser']), schema)).toThrow(FilterCompileError)
  })

  it('not_in maps to Prisma notIn', () => {
    expect(compileFilter(rule('role', 'not_in', ['viewer']), schema)).toEqual({
      role: { notIn: ['viewer'] },
    })
  })
})

describe('compileFilter — boolean fields', () => {
  it('is_true / is_false work', () => {
    expect(compileFilter(rule('active', 'is_true'), schema)).toEqual({ active: true })
    expect(compileFilter(rule('active', 'is_false'), schema)).toEqual({ active: false })
  })
})

describe('compileFilter — groups + nesting', () => {
  it('AND of two rules', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [
        { kind: 'rule', field: 'name', operator: 'eq', value: 'Alice' },
        { kind: 'rule', field: 'age', operator: 'gt', value: 30 },
      ],
    }
    expect(compileFilter(spec, schema)).toEqual({
      AND: [{ name: 'Alice' }, { age: { gt: 30 } }],
    })
  })

  it('OR of two rules', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'OR',
      rules: [
        { kind: 'rule', field: 'name', operator: 'eq', value: 'Alice' },
        { kind: 'rule', field: 'name', operator: 'eq', value: 'Bob' },
      ],
    }
    expect(compileFilter(spec, schema)).toEqual({
      OR: [{ name: 'Alice' }, { name: 'Bob' }],
    })
  })

  it('nested group: (name=A) AND (role=admin OR role=viewer)', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [
        { kind: 'rule', field: 'name', operator: 'eq', value: 'A' },
        {
          kind: 'group',
          combinator: 'OR',
          rules: [
            { kind: 'rule', field: 'role', operator: 'eq', value: 'admin' },
            { kind: 'rule', field: 'role', operator: 'eq', value: 'viewer' },
          ],
        },
      ],
    }
    expect(compileFilter(spec, schema)).toEqual({
      AND: [
        { name: 'A' },
        { OR: [{ role: 'admin' }, { role: 'viewer' }] },
      ],
    })
  })

  it('single-rule group unwraps to the rule', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [{ kind: 'rule', field: 'name', operator: 'eq', value: 'Alice' }],
    }
    expect(compileFilter(spec, schema)).toEqual({ name: 'Alice' })
  })

  it('drops empty children before deciding to wrap', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [
        { kind: 'rule', field: 'name', operator: 'eq', value: 'Alice' },
        { kind: 'group', combinator: 'AND', rules: [] }, // empty → dropped
      ],
    }
    expect(compileFilter(spec, schema)).toEqual({ name: 'Alice' })
  })
})

describe('compileFilter — security', () => {
  it('rejects unknown fields (not on allowlist)', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [{ kind: 'rule', field: 'organizationId', operator: 'eq', value: 'spoof' }],
    }
    expect(() => compileFilter(spec, schema)).toThrow(/Unknown field/)
  })

  it('rejects unsupported operators on a known field', () => {
    expect(() => compileFilter(rule('name', 'gt' as never, 30), schema)).toThrow(FilterCompileError)
  })
})

// ---- helpers ----

function rule(field: string, operator: string, value?: unknown): FilterSpec {
  return {
    kind: 'group',
    combinator: 'AND',
    rules: [{ kind: 'rule', field, operator: operator as never, value: value as never }],
  }
}
