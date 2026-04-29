/* ---------------------------------------------------------------
   Filter spec → Prisma `where` compiler
   ---------------------------------------------------------------
   Walk the FilterSpec tree, look up each rule's field on the entity
   schema, and emit a Prisma-compatible nested where object. Every
   field reference goes through the registry — anything not on the
   allowlist throws, so a malicious client can't smuggle in unknown
   columns.

   The compile function is intentionally synchronous + pure — it's
   safe to call from API routes inline and from tests without
   stubbing Prisma.

   Date-typed fields accept ISO 8601 strings; the compiler converts
   them to Date so Prisma's date predicates fire correctly. Invalid
   dates throw.
   --------------------------------------------------------------- */

import type {
  FilterSpec, FilterGroup, FilterRule, FilterField, FilterEntitySchema,
} from './types'

export class FilterCompileError extends Error {}

/**
 * Compile a filter spec into a Prisma where clause for the given
 * entity schema. Returns `{}` for an empty group (matches all rows).
 */
export function compileFilter(
  spec: FilterSpec | null | undefined,
  schema: FilterEntitySchema,
): Record<string, unknown> {
  if (!spec) return {}
  if (spec.kind !== 'group') {
    throw new FilterCompileError('Top-level filter must be a group')
  }
  return compileGroup(spec, schema)
}

function compileGroup(
  group: FilterGroup,
  schema: FilterEntitySchema,
): Record<string, unknown> {
  if (!Array.isArray(group.rules) || group.rules.length === 0) return {}
  const compiled = group.rules
    .map((child) =>
      child.kind === 'group'
        ? compileGroup(child, schema)
        : compileRule(child, schema),
    )
    .filter((c) => c && Object.keys(c).length > 0)
  if (compiled.length === 0) return {}
  if (compiled.length === 1) return compiled[0]
  const key = group.combinator === 'OR' ? 'OR' : 'AND'
  return { [key]: compiled }
}

function compileRule(
  rule: FilterRule,
  schema: FilterEntitySchema,
): Record<string, unknown> {
  if (rule.kind !== 'rule') {
    throw new FilterCompileError('Expected rule')
  }
  const field = schema.fields.find((f) => f.id === rule.field)
  if (!field) {
    throw new FilterCompileError(`Unknown field "${rule.field}" on ${schema.entity}`)
  }

  // Custom translator wins over the default inference.
  if (field.toPrisma) {
    const out = field.toPrisma(rule)
    if (out === null) {
      throw new FilterCompileError(
        `Operator "${rule.operator}" not supported on ${schema.entity}.${field.id}`,
      )
    }
    return out
  }

  switch (field.type) {
    case 'string': return compileStringRule(field, rule)
    case 'number': return compileNumberRule(field, rule)
    case 'date':   return compileDateRule(field, rule)
    case 'enum':   return compileEnumRule(field, rule)
    case 'boolean': return compileBooleanRule(field, rule)
    default:
      throw new FilterCompileError(`Unsupported field type for ${field.id}`)
  }
}

function compileStringRule(field: FilterField, rule: FilterRule): Record<string, unknown> {
  const op = rule.operator
  const v = rule.value
  switch (op) {
    case 'eq':            return { [field.id]: v }
    case 'neq':           return { NOT: { [field.id]: v } }
    case 'contains':      return { [field.id]: { contains: String(v ?? '') } }
    case 'starts_with':   return { [field.id]: { startsWith: String(v ?? '') } }
    case 'ends_with':     return { [field.id]: { endsWith: String(v ?? '') } }
    case 'is_empty':      return { OR: [{ [field.id]: '' }, { [field.id]: { equals: null } }] }
    case 'is_not_empty':  return { AND: [{ NOT: { [field.id]: '' } }, { NOT: { [field.id]: null } }] }
    default:
      throw new FilterCompileError(`Operator ${op} not valid for string field ${field.id}`)
  }
}

function compileNumberRule(field: FilterField, rule: FilterRule): Record<string, unknown> {
  const op = rule.operator
  const v = rule.value
  switch (op) {
    case 'eq':  return { [field.id]: numericValue(v) }
    case 'neq': return { NOT: { [field.id]: numericValue(v) } }
    case 'gt':  return { [field.id]: { gt: numericValue(v) } }
    case 'gte': return { [field.id]: { gte: numericValue(v) } }
    case 'lt':  return { [field.id]: { lt: numericValue(v) } }
    case 'lte': return { [field.id]: { lte: numericValue(v) } }
    case 'between': {
      const [lo, hi] = numericRange(v)
      return { [field.id]: { gte: lo, lte: hi } }
    }
    case 'is_empty': return { [field.id]: null }
    case 'is_not_empty': return { NOT: { [field.id]: null } }
    default:
      throw new FilterCompileError(`Operator ${op} not valid for number field ${field.id}`)
  }
}

function compileDateRule(field: FilterField, rule: FilterRule): Record<string, unknown> {
  const op = rule.operator
  const v = rule.value
  switch (op) {
    case 'before':  return { [field.id]: { lt: coerceDate(v) } }
    case 'after':   return { [field.id]: { gt: coerceDate(v) } }
    case 'on': {
      // "On <day>" → window between [day 00:00, day+1 00:00).
      const d = coerceDate(v)
      const next = new Date(d)
      next.setUTCDate(next.getUTCDate() + 1)
      return { AND: [{ [field.id]: { gte: d } }, { [field.id]: { lt: next } }] }
    }
    case 'between': {
      const [lo, hi] = v as [unknown, unknown]
      return { [field.id]: { gte: coerceDate(lo), lte: coerceDate(hi) } }
    }
    case 'is_empty': return { [field.id]: null }
    case 'is_not_empty': return { NOT: { [field.id]: null } }
    default:
      throw new FilterCompileError(`Operator ${op} not valid for date field ${field.id}`)
  }
}

function compileEnumRule(field: FilterField, rule: FilterRule): Record<string, unknown> {
  const op = rule.operator
  const v = rule.value
  const allowed = field.options?.map((o) => o.value)
  const guard = (val: unknown) => {
    if (allowed && !allowed.includes(String(val))) {
      throw new FilterCompileError(`Value "${val}" not in allowed enum for ${field.id}`)
    }
  }
  switch (op) {
    case 'eq':  guard(v); return { [field.id]: v }
    case 'neq': guard(v); return { NOT: { [field.id]: v } }
    case 'in': {
      if (!Array.isArray(v)) throw new FilterCompileError(`"in" requires array for ${field.id}`)
      v.forEach(guard)
      return { [field.id]: { in: v } }
    }
    case 'not_in': {
      if (!Array.isArray(v)) throw new FilterCompileError(`"not_in" requires array for ${field.id}`)
      v.forEach(guard)
      return { [field.id]: { notIn: v } }
    }
    default:
      throw new FilterCompileError(`Operator ${op} not valid for enum field ${field.id}`)
  }
}

function compileBooleanRule(field: FilterField, rule: FilterRule): Record<string, unknown> {
  switch (rule.operator) {
    case 'is_true':  return { [field.id]: true }
    case 'is_false': return { [field.id]: false }
    default:
      throw new FilterCompileError(`Operator ${rule.operator} not valid for boolean field ${field.id}`)
  }
}

function numericValue(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  throw new FilterCompileError('Numeric value required')
}

function numericRange(v: unknown): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) {
    throw new FilterCompileError('"between" expects [low, high]')
  }
  return [numericValue(v[0]), numericValue(v[1])]
}

function coerceDate(v: unknown): Date {
  if (v instanceof Date) {
    if (!isFinite(v.getTime())) throw new FilterCompileError('Invalid date')
    return v
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    if (!isFinite(d.getTime())) throw new FilterCompileError(`Invalid date string: ${v}`)
    return d
  }
  throw new FilterCompileError('Date value required')
}
