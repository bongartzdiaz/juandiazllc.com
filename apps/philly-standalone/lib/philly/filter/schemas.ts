/* ---------------------------------------------------------------
   Per-entity filter schemas — single source of truth for which
   fields are filterable + which type each field is.
   ---------------------------------------------------------------
   The compiler uses this registry to reject any field name not on
   the allowlist; that's our injection-prevention story for the
   advanced filter builder. To expose a new field, add it here and
   the UI + API both pick it up automatically.
   --------------------------------------------------------------- */

import { hashEmail, hashPhone, looksLikeEmailQuery, looksLikePhoneQuery } from '../blind-index'
import type { FilterEntitySchema, FilterRule } from './types'

const CONTACT_TYPES_PHIL = ['partner', 'donor', 'stakeholder', 'beneficiary'] as const
const CONTACT_TYPES_RE = ['buyer', 'seller', 'tenant', 'investor', 'landlord'] as const
const CONTACT_TYPES_HOS = ['guest', 'vendor', 'partner', 'staff'] as const
const ALL_CONTACT_TYPES = [
  ...CONTACT_TYPES_PHIL, ...CONTACT_TYPES_RE, ...CONTACT_TYPES_HOS,
]
const UNIQUE_CONTACT_TYPES = [...new Set(ALL_CONTACT_TYPES)]

/**
 * Email/phone are encrypted at rest (Bundle P) — equality lookups
 * route through the blind-index hash columns, not the cipher
 * column. `contains` / substring is impossible for those fields.
 * Only `eq`, `neq`, `is_empty`, `is_not_empty` survive.
 */
function emailToPrisma(rule: FilterRule): Record<string, unknown> | null {
  if (rule.operator === 'eq') {
    if (typeof rule.value !== 'string' || !looksLikeEmailQuery(rule.value)) {
      return { id: '__never_match__' } // returns no rows
    }
    const hash = hashEmail(rule.value)
    return hash ? { emailHash: hash } : { id: '__never_match__' }
  }
  if (rule.operator === 'neq') {
    if (typeof rule.value !== 'string' || !looksLikeEmailQuery(rule.value)) return {}
    const hash = hashEmail(rule.value)
    return hash ? { NOT: { emailHash: hash } } : {}
  }
  if (rule.operator === 'is_empty') return { OR: [{ email: '' }, { email: { equals: null } }] }
  if (rule.operator === 'is_not_empty') return { AND: [{ NOT: { email: '' } }, { NOT: { email: null } }] }
  // Any other operator on email is unsupported.
  return null
}

function phoneToPrisma(rule: FilterRule): Record<string, unknown> | null {
  if (rule.operator === 'eq') {
    if (typeof rule.value !== 'string' || !looksLikePhoneQuery(rule.value)) {
      return { id: '__never_match__' }
    }
    const hash = hashPhone(rule.value)
    return hash ? { phoneHash: hash } : { id: '__never_match__' }
  }
  if (rule.operator === 'neq') {
    if (typeof rule.value !== 'string' || !looksLikePhoneQuery(rule.value)) return {}
    const hash = hashPhone(rule.value)
    return hash ? { NOT: { phoneHash: hash } } : {}
  }
  if (rule.operator === 'is_empty') return { OR: [{ phone: '' }, { phone: { equals: null } }] }
  if (rule.operator === 'is_not_empty') return { AND: [{ NOT: { phone: '' } }, { NOT: { phone: null } }] }
  return null
}

export const CONTACT_FILTER_SCHEMA: FilterEntitySchema = {
  entity: 'contact',
  fields: [
    { id: 'name', label: 'Name', type: 'string' },
    { id: 'company', label: 'Company', type: 'string' },
    {
      id: 'type',
      label: 'Type',
      type: 'enum',
      options: UNIQUE_CONTACT_TYPES.map((t) => ({ value: t, label: t })),
    },
    { id: 'email', label: 'Email', type: 'string', toPrisma: emailToPrisma },
    { id: 'phone', label: 'Phone', type: 'string', toPrisma: phoneToPrisma },
    { id: 'createdAt', label: 'Added', type: 'date' },
    { id: 'aiIcpFit', label: 'ICP fit', type: 'number' },
    {
      id: 'aiAttributesStatus',
      label: 'AI status',
      type: 'enum',
      options: [
        { value: 'pending', label: 'pending' },
        { value: 'ready', label: 'ready' },
        { value: 'error', label: 'error' },
      ],
    },
  ],
}

export const FILTER_SCHEMAS: Record<string, FilterEntitySchema> = {
  contact: CONTACT_FILTER_SCHEMA,
}
