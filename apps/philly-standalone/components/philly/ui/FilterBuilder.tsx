'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Filter as FilterIcon, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type FilterOperator =
  | 'eq' | 'neq'
  | 'contains' | 'ncontains' | 'startsWith' | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'nin'
  | 'isEmpty' | 'isNotEmpty'
  | 'between'

export type FilterFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export interface FilterField {
  key: string
  label: string
  type: FilterFieldType
  options?: Array<{ value: string; label: string }>
}

export interface FilterRule {
  id: string
  field: string
  operator: FilterOperator
  value: string | string[] | number | boolean | [string, string] | [number, number]
}

export interface FilterGroup {
  combinator: 'and' | 'or'
  rules: FilterRule[]
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: 'is',
  neq: 'is not',
  contains: 'contains',
  ncontains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  in: 'in',
  nin: 'not in',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  between: 'between',
}

const OPERATORS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  text: ['contains', 'eq', 'neq', 'ncontains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between'],
  select: ['eq', 'neq', 'in', 'nin', 'isEmpty', 'isNotEmpty'],
  boolean: ['eq'],
}

function uid() { return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }

export function emptyFilter(): FilterGroup {
  return { combinator: 'and', rules: [] }
}

// Apply a filter group to a collection (client-side)
export function applyFilter<T extends Record<string, unknown>>(items: T[], group: FilterGroup): T[] {
  if (!group.rules.length) return items
  return items.filter(item => matchGroup(item, group))
}

function matchGroup(item: Record<string, unknown>, group: FilterGroup): boolean {
  if (!group.rules.length) return true
  const check = (rule: FilterRule) => matchRule(item, rule)
  return group.combinator === 'and' ? group.rules.every(check) : group.rules.some(check)
}

function matchRule(item: Record<string, unknown>, rule: FilterRule): boolean {
  const raw = item[rule.field]
  const strVal = raw == null ? '' : String(raw)
  const numVal = typeof raw === 'number' ? raw : Number(raw)

  switch (rule.operator) {
    case 'eq': return String(raw) === String(rule.value)
    case 'neq': return String(raw) !== String(rule.value)
    case 'contains': return strVal.toLowerCase().includes(String(rule.value).toLowerCase())
    case 'ncontains': return !strVal.toLowerCase().includes(String(rule.value).toLowerCase())
    case 'startsWith': return strVal.toLowerCase().startsWith(String(rule.value).toLowerCase())
    case 'endsWith': return strVal.toLowerCase().endsWith(String(rule.value).toLowerCase())
    case 'gt': return numVal > Number(rule.value)
    case 'gte': return numVal >= Number(rule.value)
    case 'lt': return numVal < Number(rule.value)
    case 'lte': return numVal <= Number(rule.value)
    case 'in': return Array.isArray(rule.value)
      ? (rule.value as string[]).includes(strVal)
      : String(rule.value).split(',').map(s => s.trim()).includes(strVal)
    case 'nin': return Array.isArray(rule.value)
      ? !(rule.value as string[]).includes(strVal)
      : !String(rule.value).split(',').map(s => s.trim()).includes(strVal)
    case 'isEmpty': return raw === null || raw === undefined || strVal === ''
    case 'isNotEmpty': return raw !== null && raw !== undefined && strVal !== ''
    case 'between': {
      const pair = rule.value as [string | number, string | number]
      if (!Array.isArray(pair) || pair.length !== 2) return true
      return numVal >= Number(pair[0]) && numVal <= Number(pair[1])
    }
    default: return true
  }
}

interface FilterBuilderProps {
  fields: FilterField[]
  value: FilterGroup
  onChange: (g: FilterGroup) => void
  compact?: boolean
}

export function FilterBuilder({ fields, value, onChange, compact }: FilterBuilderProps) {
  const t = useTranslations('forms.filterBuilder')
  const tf = useTranslations('filterFields')
  const addRule = () => {
    const field = fields[0]
    if (!field) return
    const op = OPERATORS_BY_TYPE[field.type][0]
    onChange({
      ...value,
      rules: [...value.rules, { id: uid(), field: field.key, operator: op, value: '' }],
    })
  }

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    onChange({
      ...value,
      rules: value.rules.map(r => r.id === id ? { ...r, ...patch } : r),
    })
  }

  const removeRule = (id: string) => {
    onChange({ ...value, rules: value.rules.filter(r => r.id !== id) })
  }

  const clear = () => onChange(emptyFilter())

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 10, padding: compact ? 10 : 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FilterIcon size={13} color="var(--txt3)" />
          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--txt3)' }}>
            {t('header')}
          </span>
          {value.rules.length > 0 && (
            <select
              value={value.combinator}
              onChange={e => onChange({ ...value, combinator: e.target.value as 'and' | 'or' })}
              aria-label={t('header')}
              style={{
                padding: '3px 7px', borderRadius: 5,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                fontSize: 11, fontWeight: 600, color: 'var(--txt2)',
              }}
            >
              <option value="and">{t('matchAll')}</option>
              <option value="or">{t('matchAny')}</option>
            </select>
          )}
        </div>
        {value.rules.length > 0 && (
          <button
            onClick={clear}
            style={{
              padding: '3px 9px', borderRadius: 5, border: 'none',
              background: 'var(--bg2)', color: 'var(--txt3)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >{t('clearAll')}</button>
        )}
      </div>

      {value.rules.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--txt3)', padding: '6px 0 10px' }}>
          {t('empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {value.rules.map(rule => (
            <RuleRow
              key={rule.id}
              rule={rule}
              fields={fields}
              tf={tf}
              onChange={patch => updateRule(rule.id, patch)}
              onRemove={() => removeRule(rule.id)}
            />
          ))}
        </div>
      )}

      <button
        onClick={addRule}
        style={{
          marginTop: 10, padding: '5px 10px', borderRadius: 6, border: 'none',
          background: 'var(--accent-bg)', color: 'var(--accent-txt)',
          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}
      >
        <Plus size={11} /> {t('addFilter')}
      </button>
    </div>
  )
}

function RuleRow({ rule, fields, tf, onChange, onRemove }: {
  rule: FilterRule
  fields: FilterField[]
  tf: ReturnType<typeof useTranslations>
  onChange: (patch: Partial<FilterRule>) => void
  onRemove: () => void
}) {
  const t = useTranslations('forms.filterBuilder')
  const field = fields.find(f => f.key === rule.field) ?? fields[0]
  const operators = OPERATORS_BY_TYPE[field.type]
  const needsValue = !['isEmpty', 'isNotEmpty'].includes(rule.operator)
  const isBetween = rule.operator === 'between'

  // Translate a field label by its stable `key` (== schema field id), falling
  // back to the English `label` baked into the schema when no i18n key exists.
  const fieldLabel = (f: FilterField) => (tf.has(f.key) ? tf(f.key) : f.label)
  // Translate an enum option by its `value` under filterFields.options.<value>,
  // falling back to the English label from the schema.
  const optLabel = (o: { value: string; label: string }) =>
    (tf.has(`options.${o.value}`) ? tf(`options.${o.value}`) : o.label)

  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={rule.field}
        onChange={e => {
          const next = fields.find(f => f.key === e.target.value)!
          onChange({ field: e.target.value, operator: OPERATORS_BY_TYPE[next.type][0], value: '' })
        }}
        style={selectStyle}
        aria-label={fieldLabel(field)}
      >
        {fields.map(f => <option key={f.key} value={f.key}>{fieldLabel(f)}</option>)}
      </select>
      <select
        value={rule.operator}
        onChange={e => onChange({ operator: e.target.value as FilterOperator, value: '' })}
        style={selectStyle}
        aria-label="Operator"
      >
        {operators.map(op => <option key={op} value={op}>{t.has(`operators.${op}`) ? t(`operators.${op}`) : OPERATOR_LABELS[op]}</option>)}
      </select>

      {needsValue && !isBetween && field.type === 'select' && (
        <select
          value={String(rule.value ?? '')}
          onChange={e => onChange({ value: e.target.value })}
          style={selectStyle}
          aria-label={fieldLabel(field)}
        >
          <option value="">—</option>
          {field.options?.map(o => <option key={o.value} value={o.value}>{optLabel(o)}</option>)}
        </select>
      )}
      {needsValue && !isBetween && field.type === 'boolean' && (
        <select
          value={String(rule.value ?? 'true')}
          onChange={e => onChange({ value: e.target.value === 'true' })}
          style={selectStyle}
          aria-label={fieldLabel(field)}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      )}
      {needsValue && !isBetween && (field.type === 'text' || field.type === 'number') && (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(rule.value ?? '')}
          onChange={e => onChange({ value: field.type === 'number' ? Number(e.target.value) : e.target.value })}
          placeholder={t('valuePlaceholder')}
          style={inputStyle}
          aria-label={fieldLabel(field)}
        />
      )}
      {needsValue && !isBetween && field.type === 'date' && (
        <input
          type="date"
          value={String(rule.value ?? '')}
          onChange={e => onChange({ value: e.target.value })}
          style={inputStyle}
          aria-label={fieldLabel(field)}
        />
      )}
      {isBetween && (
        <>
          <input
            type={field.type === 'date' ? 'date' : 'number'}
            value={Array.isArray(rule.value) ? String(rule.value[0] ?? '') : ''}
            onChange={e => {
              const current = Array.isArray(rule.value) ? rule.value : ['', '']
              onChange({ value: [e.target.value, String(current[1] ?? '')] as [string, string] })
            }}
            placeholder={t('rangeFrom')}
            aria-label={t('rangeFrom')}
            style={{ ...inputStyle, width: 110 }}
          />
          <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{t('rangeAnd')}</span>
          <input
            type={field.type === 'date' ? 'date' : 'number'}
            value={Array.isArray(rule.value) ? String(rule.value[1] ?? '') : ''}
            onChange={e => {
              const current = Array.isArray(rule.value) ? rule.value : ['', '']
              onChange({ value: [String(current[0] ?? ''), e.target.value] as [string, string] })
            }}
            placeholder={t('rangeTo')}
            aria-label={t('rangeTo')}
            style={{ ...inputStyle, width: 110 }}
          />
        </>
      )}

      <button
        onClick={onRemove}
        title="Remove filter"
        style={{
          width: 24, height: 24, borderRadius: 5, border: 'none',
          background: 'var(--r-bg)', color: 'var(--r-txt)',
          cursor: 'pointer', marginLeft: 'auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      ><X size={12} /></button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 5,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  color: 'var(--txt)', fontSize: 12,
}
const selectStyle: React.CSSProperties = {
  ...inputStyle, fontWeight: 600, color: 'var(--txt2)',
}

// Quick search bar (single free-text filter across multiple fields)
export function QuickSearch({
  value, onChange, placeholder = 'Search…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [inner, setInner] = useState(value)
  useEffect(() => { setInner(value) }, [value])
  useEffect(() => {
    const t = setTimeout(() => { if (inner !== value) onChange(inner) }, 250)
    return () => clearTimeout(t)
  }, [inner])
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 7, padding: '0 10px', width: 240,
    }}>
      <Search size={13} color="var(--txt3)" />
      <input
        value={inner}
        onChange={e => setInner(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          border: 'none', background: 'transparent', outline: 'none',
          padding: '7px 8px', width: '100%', color: 'var(--txt)',
          fontSize: 12.5,
        }}
      />
    </div>
  )
}
