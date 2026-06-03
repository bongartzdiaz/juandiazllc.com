'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Filter as FilterIcon, X, Check } from 'lucide-react'
import { Modal } from '@/components/philly/ui/Modal'
import type {
  FilterSpec, FilterRule, FilterGroup, FilterField,
  FilterEntitySchema, Operator, FieldType,
} from '@/lib/philly/filter/types'

/* Bundle AM — Advanced filter builder UI.

   Renders inside a <Modal>. Operators see a flat list of rules
   joined by AND or OR (top-level only — no UI for nested groups
   in this MVP, although the spec supports them and the compiler
   handles them; nested groups can be authored via JSON paste in
   a future iteration). */

// Operator IDs per field type — labels are looked up via `filter.operator.*`
// at render time so the dropdown localises.
const OPERATOR_IDS_BY_TYPE: Record<FieldType, Operator[]> = {
  string: ['contains', 'eq', 'neq', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_empty', 'is_not_empty'],
  date: ['before', 'after', 'on', 'between', 'is_empty', 'is_not_empty'],
  enum: ['eq', 'neq', 'in', 'not_in'],
  boolean: ['is_true', 'is_false'],
}

// Some operators map to a different filter.operator.* key when used on
// enum fields (e.g. `eq` reads "is" rather than "equals").
function operatorLabelKey(type: FieldType, op: Operator): string {
  if (type === 'enum' && op === 'eq') return 'is'
  if (type === 'enum' && op === 'neq') return 'isNot'
  return op
}

const UNARY_OPERATORS = new Set<Operator>([
  'is_empty', 'is_not_empty', 'is_true', 'is_false',
])

interface Props {
  open: boolean
  onClose: () => void
  schema: FilterEntitySchema
  /** Initial spec; if undefined, starts with one empty rule. */
  initial?: FilterSpec | null
  /** Called with a fresh spec when the user hits Apply. */
  onApply: (spec: FilterSpec | null) => void
}

export function AdvancedFilterBuilder({ open, onClose, schema, initial, onApply }: Props) {
  const t = useTranslations('filter')
  const tc = useTranslations('common')
  const [combinator, setCombinator] = useState<'AND' | 'OR'>('AND')
  const [rules, setRules] = useState<FilterRule[]>([])

  // Hydrate from `initial` whenever the modal opens (so reopening
  // shows the previously-applied filter, but a discarded edit
  // doesn't bleed into the next session).
  useEffect(() => {
    if (!open) return
    if (!initial || !initial.rules.length) {
      setCombinator('AND')
      setRules([emptyRule(schema.fields[0])])
      return
    }
    setCombinator(initial.combinator)
    setRules(
      initial.rules
        .filter((r): r is FilterRule => r.kind === 'rule')
        .map((r) => ({ ...r })),
    )
  }, [open, initial, schema.fields])

  const updateRule = useCallback((idx: number, patch: Partial<FilterRule>) => {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } as FilterRule : r)))
  }, [])

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, emptyRule(schema.fields[0])])
  }, [schema.fields])

  const removeRule = useCallback((idx: number) => {
    setRules((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleApply = () => {
    // Drop rules whose field is empty or whose value is missing for
    // a binary operator. The server tolerates these too (compileFilter
    // skips empties), but UI-level pruning keeps the URL state clean.
    const cleaned = rules.filter((r) => r.field && (UNARY_OPERATORS.has(r.operator) || r.value != null && r.value !== ''))
    if (cleaned.length === 0) {
      onApply(null)
    } else {
      onApply({ kind: 'group', combinator, rules: cleaned })
    }
    onClose()
  }

  const handleClear = () => {
    onApply(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('title')} subtitle={t('subtitlePrefix', { entity: schema.entity })} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Combinator selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--txt3)' }}>{t('matchPrefix')}</span>
          <CombinatorButton active={combinator === 'AND'} onClick={() => setCombinator('AND')}>{t('matchAll')}</CombinatorButton>
          <CombinatorButton active={combinator === 'OR'} onClick={() => setCombinator('OR')}>{t('matchAny')}</CombinatorButton>
          <span style={{ color: 'var(--txt3)' }}>{t('matchOf')}</span>
        </div>

        {/* Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rules.map((rule, idx) => {
            const field = schema.fields.find((f) => f.id === rule.field)
            const operators = field ? OPERATOR_IDS_BY_TYPE[field.type] : []
            const isUnary = UNARY_OPERATORS.has(rule.operator)
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '160px 140px 1fr 28px',
                  gap: 6, alignItems: 'center',
                  padding: '6px 8px', borderRadius: 8,
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                }}
              >
                <select
                  value={rule.field}
                  onChange={(e) => {
                    const f = schema.fields.find((x) => x.id === e.target.value)
                    if (!f) return
                    const ops = OPERATOR_IDS_BY_TYPE[f.type]
                    updateRule(idx, {
                      field: f.id,
                      operator: ops[0] ?? 'eq',
                      value: undefined,
                    })
                  }}
                  style={selectStyle}
                  aria-label={field ? field.label : t('addRule')}
                >
                  {schema.fields.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(idx, { operator: e.target.value as Operator, value: undefined })}
                  style={selectStyle}
                  aria-label="Operator"
                >
                  {operators.map((op) => (
                    <option key={op} value={op}>
                      {field ? t(`operator.${operatorLabelKey(field.type, op)}`) : op}
                    </option>
                  ))}
                </select>
                <ValueInput
                  field={field}
                  rule={rule}
                  disabled={isUnary}
                  onChange={(value) => updateRule(idx, { value })}
                />
                <button
                  type="button"
                  aria-label={t('removeRule')}
                  onClick={() => removeRule(idx)}
                  style={{
                    width: 26, height: 26, padding: 0, borderRadius: 5,
                    background: 'transparent', color: 'var(--txt3)',
                    border: 'none', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--r-txt)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--txt3)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={addRule}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 7,
              background: 'transparent', color: 'var(--txt2)',
              border: '1px dashed var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              alignSelf: 'flex-start',
            }}
          >
            <Plus size={11} /> {t('addRule')}
          </button>
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={handleApply}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            <Check size={12} /> {tc('applyFilter')}
          </button>
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--bg2)', color: 'var(--txt2)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
            }}
          >
            {tc('clearAll')}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 16px', borderRadius: 8,
              background: 'transparent', color: 'var(--txt3)',
              border: '1px solid var(--border)', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              marginLeft: 'auto',
            }}
          >
            <X size={12} /> {tc('cancel')}
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--txt3)', lineHeight: 1.5 }}>
          <FilterIcon size={11} style={{ display: 'inline', marginRight: 4 }} />
          {t('footnote')}
        </div>
      </div>
    </Modal>
  )
}

function CombinatorButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '3px 10px', borderRadius: 6,
        background: active ? 'var(--accent)' : 'var(--bg2)',
        color: active ? '#fff' : 'var(--txt2)',
        border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  )
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--txt)',
  fontSize: 12,
  fontFamily: 'inherit',
}

function ValueInput({
  field, rule, disabled, onChange,
}: {
  field: FilterField | undefined
  rule: FilterRule
  disabled: boolean
  onChange: (value: FilterRule['value']) => void
}) {
  const t = useTranslations('filter')
  if (disabled || !field) {
    return (
      <span style={{ fontSize: 11, color: 'var(--txt3)', padding: '6px 8px' }}>
        {t('noValueNeeded')}
      </span>
    )
  }

  if (field.type === 'enum' && field.options) {
    const isMulti = rule.operator === 'in' || rule.operator === 'not_in'
    if (isMulti) {
      const picked = Array.isArray(rule.value) ? (rule.value as string[]) : []
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {field.options.map((o) => {
            const on = picked.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(on ? picked.filter((v) => v !== o.value) : [...picked, o.value])}
                style={{
                  padding: '3px 9px', borderRadius: 5,
                  background: on ? 'var(--accent)' : 'var(--panel)',
                  color: on ? '#fff' : 'var(--txt2)',
                  border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  fontFamily: 'inherit', textTransform: 'capitalize',
                }}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )
    }
    return (
      <select
        value={typeof rule.value === 'string' ? rule.value : ''}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
        aria-label={field.label}
      >
        <option value="">{t('selectPlaceholder')}</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    )
  }

  if (rule.operator === 'between') {
    const [lo, hi] = Array.isArray(rule.value) ? (rule.value as [unknown, unknown]) : ['', '']
    const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        <input
          type={inputType}
          value={typeof lo === 'string' || typeof lo === 'number' ? String(lo) : ''}
          onChange={(e) => onChange([e.target.value, hi as string])}
          style={inputStyle}
          placeholder={t('rangeFrom')}
          aria-label={t('rangeFrom')}
        />
        <input
          type={inputType}
          value={typeof hi === 'string' || typeof hi === 'number' ? String(hi) : ''}
          onChange={(e) => onChange([lo as string, e.target.value])}
          style={inputStyle}
          placeholder={t('rangeTo')}
          aria-label={t('rangeTo')}
        />
      </div>
    )
  }

  const inputType = field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'
  return (
    <input
      type={inputType}
      value={
        typeof rule.value === 'string' || typeof rule.value === 'number'
          ? String(rule.value)
          : ''
      }
      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
      style={inputStyle}
      placeholder={t('valuePlaceholder')}
      aria-label={field.label}
    />
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  background: 'var(--panel)',
  color: 'var(--txt)',
  fontSize: 12,
  fontFamily: 'inherit',
}

function emptyRule(field?: FilterField): FilterRule {
  if (!field) return { kind: 'rule', field: '', operator: 'eq', value: '' }
  const op = OPERATOR_IDS_BY_TYPE[field.type][0] ?? 'eq'
  return { kind: 'rule', field: field.id, operator: op, value: undefined }
}

/* Re-exports so consumers don't need to drill into the lib. */
export type { FilterSpec } from '@/lib/philly/filter/types'
