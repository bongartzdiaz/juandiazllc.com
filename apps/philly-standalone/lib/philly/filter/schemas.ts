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

/* ---------------------------------------------------------------
   Deal — Bundle BT
   ---------------------------------------------------------------
   Allowed fields: title (string), status (enum), dealType (enum),
   valueCents (number — exposed in cents; UI converts), probability
   (number 0-100), expectedClose (date), createdAt (date),
   leadSource (enum). pipelineId / stageId / contactId / propertyId
   / ownerId are foreign keys; equality-only via `eq`. */

const DEAL_STATUSES = ['open', 'won', 'lost'] as const
const DEAL_TYPES = ['buy', 'sell', 'rent', 'lease', 'dual'] as const
const DEAL_LEAD_SOURCES = [
  'website', 'zillow', 'realtor_com', 'referral', 'open_house',
  'facebook', 'google', 'cold_call', 'sphere',
] as const

export const DEAL_FILTER_SCHEMA: FilterEntitySchema = {
  entity: 'deal',
  fields: [
    { id: 'title', label: 'Title', type: 'string' },
    {
      id: 'status', label: 'Status', type: 'enum',
      options: DEAL_STATUSES.map(s => ({ value: s, label: s })),
    },
    {
      id: 'dealType', label: 'Type', type: 'enum',
      options: DEAL_TYPES.map(t => ({ value: t, label: t })),
    },
    { id: 'valueCents', label: 'Value (cents)', type: 'number' },
    { id: 'probability', label: 'Probability', type: 'number' },
    { id: 'expectedClose', label: 'Expected close', type: 'date' },
    { id: 'createdAt', label: 'Created', type: 'date' },
    {
      id: 'leadSource', label: 'Lead source', type: 'enum',
      options: DEAL_LEAD_SOURCES.map(s => ({ value: s, label: s })),
    },
    { id: 'pipelineId', label: 'Pipeline', type: 'string' },
    { id: 'stageId', label: 'Stage', type: 'string' },
    { id: 'contactId', label: 'Contact', type: 'string' },
    { id: 'propertyId', label: 'Property', type: 'string' },
    { id: 'ownerId', label: 'Owner', type: 'string' },
  ],
}

/* ---------------------------------------------------------------
   Property — Bundle BT
   ---------------------------------------------------------------
   Allowed fields: title (string), type (enum), status (enum),
   listingType (enum), district / town / city / state (string),
   priceCents (number), bedrooms / bathrooms / sqft / yearBuilt
   (number), createdAt / listingDate (date), bankOwned / isResale
   (boolean), mlsNumber (string). */

const PROPERTY_TYPES = ['residential', 'commercial', 'land', 'industrial'] as const
const PROPERTY_STATUSES = ['available', 'under_contract', 'sold', 'rented'] as const
const PROPERTY_LISTING_TYPES = ['sale', 'rent'] as const

export const PROPERTY_FILTER_SCHEMA: FilterEntitySchema = {
  entity: 'property',
  fields: [
    { id: 'title', label: 'Title', type: 'string' },
    {
      id: 'type', label: 'Type', type: 'enum',
      options: PROPERTY_TYPES.map(t => ({ value: t, label: t })),
    },
    {
      id: 'status', label: 'Status', type: 'enum',
      options: PROPERTY_STATUSES.map(s => ({ value: s, label: s.replace('_', ' ') })),
    },
    {
      id: 'listingType', label: 'Listing type', type: 'enum',
      options: PROPERTY_LISTING_TYPES.map(t => ({ value: t, label: t })),
    },
    { id: 'district', label: 'District', type: 'string' },
    { id: 'town', label: 'Town', type: 'string' },
    { id: 'city', label: 'City', type: 'string' },
    { id: 'state', label: 'State / Region', type: 'string' },
    { id: 'priceCents', label: 'Price (cents)', type: 'number' },
    { id: 'bedrooms', label: 'Bedrooms', type: 'number' },
    { id: 'bathrooms', label: 'Bathrooms', type: 'number' },
    { id: 'sqft', label: 'Sqft', type: 'number' },
    { id: 'yearBuilt', label: 'Year built', type: 'number' },
    { id: 'createdAt', label: 'Created', type: 'date' },
    { id: 'listingDate', label: 'Listed', type: 'date' },
    { id: 'mlsNumber', label: 'MLS #', type: 'string' },
    { id: 'bankOwned', label: 'Bank owned', type: 'boolean' },
    { id: 'isResale', label: 'Resale', type: 'boolean' },
  ],
}

export const FILTER_SCHEMAS: Record<string, FilterEntitySchema> = {
  contact: CONTACT_FILTER_SCHEMA,
  deal: DEAL_FILTER_SCHEMA,
  property: PROPERTY_FILTER_SCHEMA,
}
