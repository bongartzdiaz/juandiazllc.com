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
