/* ---------------------------------------------------------------
   Zod schemas for every entity — single source of truth for
   input validation across all API routes.
   --------------------------------------------------------------- */

import { z } from 'zod'

// ── Reusable primitives ──

const isoDate = z.string().refine(v => !isNaN(Date.parse(v)), { message: 'Must be a valid ISO date string' })
const optionalIsoDate = isoDate.nullable().optional()
const trimmedString = z.string().transform(s => s.trim())
const nonEmpty = trimmedString.pipe(z.string().min(1, 'Required'))

// ── Projects ──

export const createProjectSchema = z.object({
  title: nonEmpty,
  description: z.string().optional().default(''),
  status: z.enum(['planned', 'active', 'completed', 'paused']).optional().default('planned'),
  category: z.string().optional().default('general'),
  startDate: isoDate,
  endDate: optionalIsoDate.default(null),
  budgetCents: z.number().int().min(0).optional().default(0),
  sdgGoals: z.array(z.number().int().min(1).max(17)).optional().default([]),
})

export const updateProjectSchema = z.object({
  title: nonEmpty.optional(),
  description: z.string().optional(),
  status: z.enum(['planned', 'active', 'completed', 'paused']).optional(),
  category: z.string().optional(),
  startDate: isoDate.optional(),
  endDate: optionalIsoDate,
  budgetCents: z.number().int().min(0).optional(),
  spentCents: z.number().int().min(0).optional(),
  sdgGoals: z.array(z.number().int().min(1).max(17)).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Contacts ──

export const createContactSchema = z.object({
  name: nonEmpty,
  email: z.string().email().optional().default(''),
  phone: z.string().optional().default(''),
  type: z.enum(['partner', 'beneficiary', 'stakeholder', 'donor', 'buyer', 'seller', 'tenant', 'landlord']).optional().default('stakeholder'),
  company: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  avatarUrl: z.string().url().nullable().optional().default(null),
  // RE-specific lead fields
  leadSource: z.string().optional(),
  leadStatus: z.enum(['new', 'contacted', 'qualified', 'nurturing', 'lost']).optional(),
  preferredMethod: z.enum(['email', 'phone', 'text', 'whatsapp']).optional(),
  preApproved: z.boolean().optional(),
  preApprovalAmt: z.number().int().min(0).optional(),
  buyerPriceMin: z.number().int().min(0).optional(),
  buyerPriceMax: z.number().int().min(0).optional(),
  buyerBeds: z.number().int().min(0).optional(),
  buyerBaths: z.number().int().min(0).optional(),
  buyerAreas: z.string().optional(),
})

export const updateContactSchema = z.object({
  name: nonEmpty.optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['partner', 'beneficiary', 'stakeholder', 'donor', 'buyer', 'seller', 'tenant', 'landlord']).optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  avatarUrl: z.string().url().nullable().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Kanban Cards ──

export const createKanbanCardSchema = z.object({
  columnId: z.string().min(1, 'columnId is required'),
  title: nonEmpty,
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: optionalIsoDate.default(null),
  assigneeId: z.string().nullable().optional().default(null),
  projectId: z.string().nullable().optional().default(null),
})

// ── Impact Metrics ──

export const createImpactMetricSchema = z.object({
  projectId: z.string().min(1),
  metricType: z.enum(['co2_kg', 'people_helped', 'trees_planted', 'money_donated', 'water_liters', 'energy_kwh', 'custom']),
  value: z.number(),
  unit: z.string().optional().default(''),
  date: isoDate.optional(),
  notes: z.string().optional().default(''),
})

// ── Milestones ──

export const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  title: nonEmpty,
  dueDate: isoDate,
  status: z.enum(['pending', 'completed', 'overdue']).optional().default('pending'),
})

export const updateMilestoneSchema = z.object({
  title: nonEmpty.optional(),
  dueDate: isoDate.optional(),
  status: z.enum(['pending', 'completed', 'overdue']).optional(),
  completedAt: optionalIsoDate,
})

// ── Deals ──

export const createDealSchema = z.object({
  pipelineId: nonEmpty,
  stageId: nonEmpty,
  title: nonEmpty,
  contactId: z.string().optional().nullable(),
  valueCents: z.number().int().min(0).optional().default(0),
  probability: z.number().int().min(0).max(100).optional().default(50),
  status: z.enum(['open', 'won', 'lost']).optional().default('open'),
  dealType: z.string().optional(),
  notes: z.string().optional().default(''),
  expectedClose: optionalIsoDate.default(null),
})

export const updateDealSchema = z.object({
  title: nonEmpty.optional(),
  stageId: nonEmpty.optional(),
  contactId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  propertyId: z.string().nullable().optional(),
  valueCents: z.number().int().min(0).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  dealType: z.string().optional(),
  notes: z.string().optional(),
  expectedClose: optionalIsoDate,
  actualClose: optionalIsoDate,
  commissionPct: z.number().min(0).max(100).optional(),
  brokerSplitPct: z.number().min(0).max(100).optional(),
  teamSplitPct: z.number().min(0).max(100).optional(),
  referralFeePct: z.number().min(0).max(100).optional(),
  earnestMoneyCents: z.number().int().min(0).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Templates ──

export const createTemplateSchema = z.object({
  name: nonEmpty,
  type: z.enum(['email', 'sms', 'whatsapp', 'report', 'document']).optional().default('email'),
  subject: z.string().optional().default(''),
  body: z.string().min(1, 'body is required'),
  variables: z.array(z.string()).optional().default([]),
})

export const updateTemplateSchema = z.object({
  name: nonEmpty.optional(),
  type: z.enum(['email', 'sms', 'whatsapp', 'report', 'document']).optional(),
  subject: z.string().optional(),
  body: z.string().min(1).optional(),
  variables: z.array(z.string()).optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Automation Rules ──

// Triggers / actions are stored as JSON strings in DB. Accept either a JSON
// string or a parseable object/array; we serialise to string at write-time.
const jsonish = z.union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())])

export const createAutomationRuleSchema = z.object({
  name: nonEmpty,
  trigger: nonEmpty,
  triggerConfig: jsonish.optional(),
  actionType: nonEmpty,
  actionConfig: jsonish.optional(),
  enabled: z.boolean().optional().default(true),
})

export const updateAutomationRuleSchema = z.object({
  id: z.string().min(1).optional(),
  name: nonEmpty.optional(),
  trigger: nonEmpty.optional(),
  triggerConfig: jsonish.optional(),
  actionType: nonEmpty.optional(),
  actionConfig: jsonish.optional(),
  enabled: z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Grants ──

const grantStatusEnum = z.enum([
  'prospect', 'applied', 'under_review', 'approved', 'active', 'reporting', 'closed', 'rejected',
])

export const createGrantSchema = z.object({
  title: nonEmpty,
  funder: z.string().optional().default(''),
  amountCents: z.number().int().min(0).optional().default(0),
  status: grantStatusEnum.optional().default('prospect'),
  appliedDate: optionalIsoDate.default(null),
  awardedDate: optionalIsoDate.default(null),
  startDate: optionalIsoDate.default(null),
  endDate: optionalIsoDate.default(null),
  description: z.string().optional().default(''),
  requirements: z.string().optional().default(''),
})

export const updateGrantSchema = z.object({
  title: nonEmpty.optional(),
  funder: z.string().optional(),
  amountCents: z.number().int().min(0).optional(),
  status: grantStatusEnum.optional(),
  appliedDate: optionalIsoDate,
  awardedDate: optionalIsoDate,
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  description: z.string().optional(),
  requirements: z.string().optional(),
}).refine(obj => Object.keys(obj).length > 0, { message: 'At least one field must be provided' })

// ── Properties ──

export const createPropertySchema = z.object({
  title: nonEmpty,
  type: z.enum(['residential', 'commercial', 'land', 'industrial']).optional().default('residential'),
  status: z.enum(['available', 'under_contract', 'sold', 'rented']).optional().default('available'),
  listingType: z.enum(['sale', 'rent']).optional().default('sale'),
  subtype: z.string().optional().default(''),
  district: z.string().optional().default(''),
  town: z.string().optional().default(''),
  isBankOwned: z.boolean().optional().default(false),
  isResale: z.boolean().optional().default(false),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zipCode: z.string().optional().default(''),
  country: z.string().optional().default(''),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  priceCents: z.number().int().min(0).optional().default(0),
  bedrooms: z.number().int().min(0).nullable().optional(),
  bathrooms: z.number().int().min(0).nullable().optional(),
  sqft: z.number().int().min(0).nullable().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
  description: z.string().optional().default(''),
  features: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
})

// ── Calendar Events ──

export const createCalendarEventSchema = z.object({
  title: nonEmpty,
  description: z.string().optional().default(''),
  startTime: isoDate,
  endTime: isoDate,
  allDay: z.boolean().optional().default(false),
  location: z.string().optional().default(''),
  color: z.string().optional().default('#3B82F6'),
  attendeeIds: z.array(z.string().min(1)).optional().default([]),
}).refine(d => new Date(d.endTime) >= new Date(d.startTime), {
  message: 'endTime must be on or after startTime',
  path: ['endTime'],
})

// ── Outreach (LinkedIn campaign pipeline, `li` schema) ──

/** Every value the `li.leads.status` enum accepts. Keep in sync with the DB. */
export const leadStatusEnum = z.enum([
  'sourced', 'enriched', 'icp_scored', 'assigned',
  'connection_sent', 'connection_accepted',
  'first_dm_sent', 'follow_up_sent',
  'reply_received', 'reply_classified', 'nba_sent',
  'discovery_call_booked', 'partner_signed', 'handed_off',
  'disqualified', 'do_not_contact', 'not_interested', 'dormant_90d',
])

export const leadPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])
export const messageActionEnum = z.enum(['approve', 'reject', 'edit'])
export const leadSortFieldEnum = z.enum([
  'icp_score', 'created_at', 'updated_at', 'status',
  'last_reply_at', 'priority', 'connection_sent_at',
])

/**
 * Whitelist of characters allowed in a lead-search query.
 * Strips PostgREST filter delimiters (`,()*%\`) so user input
 * cannot break out of the `or(...)` clause and rewrite the query.
 */
export const leadSearchQuery = z
  .string()
  .max(80)
  .transform(s => s.replace(/[,()\\*%]/g, '').trim())

export const updateOutreachLeadSchema = z.object({
  status: leadStatusEnum.optional(),
  priority: leadPriorityEnum.optional(),
  notes: z.string().max(2000).optional(),
  do_not_contact: z.boolean().optional(),
  dnc_reason: z.string().max(500).optional(),
  icp_segment: z.number().int().min(1).max(3).optional(),
}).refine(obj => Object.values(obj).some(v => v !== undefined), {
  message: 'At least one field must be provided',
})

export const updateOutreachMessageSchema = z.discriminatedUnion('action', [
  z.object({
    id: z.string().uuid(),
    action: z.literal('approve'),
  }),
  z.object({
    id: z.string().uuid(),
    action: z.literal('reject'),
  }),
  z.object({
    id: z.string().uuid(),
    action: z.literal('edit'),
    body: z.string().min(1).max(2000),
  }),
])

