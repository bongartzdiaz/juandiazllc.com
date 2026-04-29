/* ---------------------------------------------------------------
   Advanced filter DSL — shape of a serialisable filter spec
   ---------------------------------------------------------------
   The filter is a tree of groups + rules. A group has a combinator
   (AND/OR) and an array of children. A rule is (field, operator,
   value). The shape is JSON-safe so it round-trips through:

     - localStorage / URL state
     - SavedView.filtersJson (Bundle AA)
     - the wire (POST body, query string)

   Compile happens server-side via lib/philly/filter/compile.ts
   against an entity-specific schema registry. The compiler refuses
   any field/operator that isn't on the registry's allowlist, so a
   malicious client can't smuggle in `prisma.$queryRaw`-shaped
   payloads — only the fields we explicitly opt in are queryable.
   --------------------------------------------------------------- */

export type FilterCombinator = 'AND' | 'OR'

export type StringOperator =
  | 'eq' | 'neq'
  | 'contains' | 'starts_with' | 'ends_with'
  | 'is_empty' | 'is_not_empty'

export type NumberOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between'
  | 'is_empty' | 'is_not_empty'

export type DateOperator =
  | 'before' | 'after' | 'between' | 'on'
  | 'is_empty' | 'is_not_empty'

export type EnumOperator =
  | 'eq' | 'neq' | 'in' | 'not_in'

export type BooleanOperator = 'is_true' | 'is_false'

export type Operator =
  | StringOperator | NumberOperator | DateOperator
  | EnumOperator | BooleanOperator

export type FieldType = 'string' | 'number' | 'date' | 'enum' | 'boolean'

/** A single condition. Value type depends on the operator —
    "between" wants `[low, high]`, "in" wants `string[]`, etc. */
export interface FilterRule {
  kind: 'rule'
  field: string
  operator: Operator
  /** Can be undefined for unary operators like `is_empty` / `is_true`. */
  value?: string | number | boolean | string[] | number[] | [unknown, unknown] | null
}

/** A nested boolean group. */
export interface FilterGroup {
  kind: 'group'
  combinator: FilterCombinator
  rules: Array<FilterRule | FilterGroup>
}

/** Top-level filter is always a group (even with one rule). */
export type FilterSpec = FilterGroup

/** Per-field declaration on the entity registry. */
export interface FilterField {
  /** Field id used in the spec (matches the Prisma column when possible). */
  id: string
  /** Human label for the UI. */
  label: string
  /** Drives operator + value-input choice. */
  type: FieldType
  /** Restrict values for `enum` fields. */
  options?: ReadonlyArray<{ value: string; label: string }>
  /** Map a leaf rule to an arbitrary Prisma where fragment. If absent,
      the compiler infers from `id` + `type`. Useful for derived /
      relation-traversing fields (e.g. "linked project name"). */
  toPrisma?: (rule: FilterRule) => Record<string, unknown> | null
}

export interface FilterEntitySchema {
  entity: string
  fields: ReadonlyArray<FilterField>
}
