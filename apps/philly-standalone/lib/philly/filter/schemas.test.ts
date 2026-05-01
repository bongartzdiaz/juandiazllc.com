import { describe, it, expect } from 'vitest'
import { compileFilter, FilterCompileError } from './compile'
import {
  CONTACT_FILTER_SCHEMA,
  DEAL_FILTER_SCHEMA,
  PROPERTY_FILTER_SCHEMA,
  FILTER_SCHEMAS,
} from './schemas'
import type { FilterSpec } from './types'

/* Bundle BT — wiring tests. The compiler is exhaustively tested in
   compile.test.ts; here we just lock in that DEAL_FILTER_SCHEMA and
   PROPERTY_FILTER_SCHEMA are registered + compile sample filters
   that match the operator allowlist for each field type. */

function group(rules: FilterSpec['rules']): FilterSpec {
  return { kind: 'group', combinator: 'AND', rules }
}

describe('FILTER_SCHEMAS registry', () => {
  it('exposes contact, deal, property entries', () => {
    expect(FILTER_SCHEMAS.contact).toBe(CONTACT_FILTER_SCHEMA)
    expect(FILTER_SCHEMAS.deal).toBe(DEAL_FILTER_SCHEMA)
    expect(FILTER_SCHEMAS.property).toBe(PROPERTY_FILTER_SCHEMA)
  })

  it('every field id is unique within its schema', () => {
    for (const [name, schema] of Object.entries(FILTER_SCHEMAS)) {
      const ids = schema.fields.map((f) => f.id)
      const unique = new Set(ids)
      expect(unique.size, `${name} has duplicate field ids`).toBe(ids.length)
    }
  })

  it('every enum field declares non-empty options', () => {
    for (const [name, schema] of Object.entries(FILTER_SCHEMAS)) {
      for (const f of schema.fields) {
        if (f.type === 'enum') {
          expect(Array.isArray(f.options), `${name}.${f.id} missing options`).toBe(true)
          expect((f.options ?? []).length).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('DEAL_FILTER_SCHEMA — sample compile', () => {
  it('compiles status eq "won" + value gt 100000 + expectedClose between dates', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [
        { kind: 'rule', field: 'status', operator: 'eq', value: 'won' },
        { kind: 'rule', field: 'valueCents', operator: 'gt', value: 100_000 },
        {
          kind: 'rule', field: 'expectedClose', operator: 'between',
          value: ['2026-04-01', '2026-05-01'] as never,
        },
      ],
    }
    expect(() => compileFilter(spec, DEAL_FILTER_SCHEMA)).not.toThrow()
  })

  it('rejects fields not on the allowlist', () => {
    const spec = group([{ kind: 'rule', field: 'commissionCents', operator: 'gt', value: 0 }])
    expect(() => compileFilter(spec, DEAL_FILTER_SCHEMA)).toThrow(FilterCompileError)
  })

  it('rejects organizationId injection', () => {
    const spec = group([{ kind: 'rule', field: 'organizationId', operator: 'eq', value: 'other' }])
    expect(() => compileFilter(spec, DEAL_FILTER_SCHEMA)).toThrow(FilterCompileError)
  })
})

describe('PROPERTY_FILTER_SCHEMA — sample compile', () => {
  it('compiles type eq "residential" + bedrooms gte 3 + bankOwned is_true', () => {
    const spec: FilterSpec = {
      kind: 'group',
      combinator: 'AND',
      rules: [
        { kind: 'rule', field: 'type', operator: 'eq', value: 'residential' },
        { kind: 'rule', field: 'bedrooms', operator: 'gte', value: 3 },
        { kind: 'rule', field: 'bankOwned', operator: 'is_true' },
      ],
    }
    expect(() => compileFilter(spec, PROPERTY_FILTER_SCHEMA)).not.toThrow()
  })

  it('rejects fields not on the allowlist', () => {
    const spec = group([{ kind: 'rule', field: 'description', operator: 'contains', value: 'pool' }])
    expect(() => compileFilter(spec, PROPERTY_FILTER_SCHEMA)).toThrow(FilterCompileError)
  })

  it('rejects organizationId injection', () => {
    const spec = group([{ kind: 'rule', field: 'organizationId', operator: 'eq', value: 'other' }])
    expect(() => compileFilter(spec, PROPERTY_FILTER_SCHEMA)).toThrow(FilterCompileError)
  })
})
