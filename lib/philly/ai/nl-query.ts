/* ---------------------------------------------------------------
   Natural-language query engine — pattern-based, deterministic.

   Takes a free-text question and produces a structured query plan
   + executes it against Prisma, returning a concise results payload.

   Supported intents:
     • list contacts / projects / deals / properties / showings
     • filters: last N days / weeks, status=X, type=X, search "foo"
     • count: "how many contacts"
     • top: "top 5 deals by value"
   --------------------------------------------------------------- */

import { getAuthPrisma } from '@/lib/philly/auth'

export type NLEntity = 'contact' | 'project' | 'deal' | 'property' | 'showing' | 'volunteer' | 'grant'
export type NLIntent = 'list' | 'count' | 'top'

export interface NLQueryPlan {
  intent: NLIntent
  entity: NLEntity
  filters: Record<string, unknown>
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  limit: number
  search?: string
}

export interface NLResult {
  question: string
  plan: NLQueryPlan
  answer: string
  data: unknown
  count?: number
}

const ENTITY_SYNONYMS: Record<NLEntity, string[]> = {
  contact: ['contact', 'contacts', 'person', 'people', 'lead', 'leads', 'donor', 'donors', 'buyer', 'buyers', 'seller', 'sellers'],
  project: ['project', 'projects', 'initiative', 'initiatives', 'program', 'programs'],
  deal: ['deal', 'deals', 'opportunity', 'opportunities', 'sale', 'sales'],
  property: ['property', 'properties', 'listing', 'listings', 'home', 'homes', 'house', 'houses'],
  showing: ['showing', 'showings', 'viewing', 'viewings', 'tour', 'tours'],
  volunteer: ['volunteer', 'volunteers'],
  grant: ['grant', 'grants', 'funding', 'award', 'awards'],
}

function detectEntity(q: string): NLEntity | null {
  for (const [entity, syns] of Object.entries(ENTITY_SYNONYMS)) {
    for (const syn of syns) {
      const re = new RegExp(`\\b${syn}\\b`, 'i')
      if (re.test(q)) return entity as NLEntity
    }
  }
  return null
}

function detectIntent(q: string): NLIntent {
  const lower = q.toLowerCase().trim()
  if (/^(how many|count of|number of|total|count)/i.test(lower)) return 'count'
  if (/\b(top|best|highest|most|biggest)\b/i.test(lower)) return 'top'
  return 'list'
}

function detectTimeWindow(q: string): Date | null {
  const lower = q.toLowerCase()
  /* "last 7 days", "past 30 days", "in the last 2 weeks" */
  const m = lower.match(/\b(last|past|in the last)\s+(\d+)\s+(day|days|week|weeks|month|months)\b/)
  if (m) {
    const n = parseInt(m[2], 10)
    const unit = m[3]
    const days = unit.startsWith('day') ? n : unit.startsWith('week') ? n * 7 : n * 30
    return new Date(Date.now() - days * 86400000)
  }
  if (/\btoday\b/i.test(q)) return new Date(Date.now() - 86400000)
  if (/\bthis week\b/i.test(q)) return new Date(Date.now() - 7 * 86400000)
  if (/\bthis month\b/i.test(q)) return new Date(Date.now() - 30 * 86400000)
  if (/\bthis year\b/i.test(q)) return new Date(Date.now() - 365 * 86400000)
  if (/\brecent\b|\brecently\b/i.test(q)) return new Date(Date.now() - 7 * 86400000)
  return null
}

function detectLimit(q: string): number {
  const m = q.match(/\btop\s+(\d+)\b/i)
  if (m) return Math.min(50, parseInt(m[1], 10))
  if (/\btop\b/i.test(q)) return 10
  const n = q.match(/\b(?:first|show me)\s+(\d+)\b/i)
  if (n) return Math.min(50, parseInt(n[1], 10))
  return 20
}

function detectStatus(q: string): string | null {
  const patterns: Array<[RegExp, string]> = [
    [/\b(open|active)\b/i, 'open'],
    [/\bwon\b/i, 'won'],
    [/\blost\b/i, 'lost'],
    [/\bcompleted\b|\bdone\b|\bfinished\b/i, 'completed'],
    [/\bpending\b/i, 'pending'],
    [/\bscheduled\b|\bupcoming\b/i, 'scheduled'],
    [/\bavailable\b/i, 'available'],
    [/\bsold\b/i, 'sold'],
  ]
  for (const [re, status] of patterns) {
    if (re.test(q)) return status
  }
  return null
}

function detectSearchTerm(q: string): string | null {
  const m = q.match(/(?:named|called|with name|with|for)\s+["']([^"']+)["']/i)
    ?? q.match(/["']([^"']+)["']/)
  if (m) return m[1]
  return null
}

/** Parse a natural-language question into a query plan. */
export function parseQuestion(question: string): NLQueryPlan | null {
  const entity = detectEntity(question)
  if (!entity) return null

  const intent = detectIntent(question)
  const since = detectTimeWindow(question)
  const status = detectStatus(question)
  const search = detectSearchTerm(question)
  const limit = detectLimit(question)

  const filters: Record<string, unknown> = {}
  if (since) filters.createdAt = { gte: since }
  if (status) filters.status = status

  let orderBy: NLQueryPlan['orderBy'] = { field: 'createdAt', direction: 'desc' }
  if (intent === 'top') {
    if (entity === 'deal') orderBy = { field: 'valueCents', direction: 'desc' }
    else if (entity === 'property') orderBy = { field: 'priceCents', direction: 'desc' }
  }

  return {
    intent,
    entity,
    filters,
    orderBy,
    limit: intent === 'count' ? 0 : limit,
    search: search ?? undefined,
  }
}

/** Execute a query plan and return a formatted result. */
export async function executePlan(organizationId: string, plan: NLQueryPlan): Promise<NLResult> {
  const prisma = getAuthPrisma()
  const data: unknown[] = []
  let count = 0
  let answer = ''

  try {
    if (plan.entity === 'contact') {
      const where: Record<string, unknown> = { organizationId }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.search) where.name = { contains: plan.search }
      if (plan.intent === 'count') {
        count = await prisma.contact.count({ where })
      } else {
        const rows = await prisma.contact.findMany({
          where, take: plan.limit,
          orderBy: { [plan.orderBy?.field ?? 'createdAt']: plan.orderBy?.direction ?? 'desc' },
          select: { id: true, name: true, email: true, phone: true, type: true, leadStatus: true, createdAt: true },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'project') {
      const where: Record<string, unknown> = { organizationId }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.search) where.title = { contains: plan.search }
      if (plan.intent === 'count') {
        count = await prisma.project.count({ where })
      } else {
        const rows = await prisma.project.findMany({
          where, take: plan.limit,
          orderBy: { [plan.orderBy?.field ?? 'createdAt']: plan.orderBy?.direction ?? 'desc' },
          select: { id: true, title: true, status: true, startDate: true, endDate: true, budgetCents: true },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'deal') {
      const where: Record<string, unknown> = { pipeline: { organizationId } }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.search) where.title = { contains: plan.search }
      if (plan.intent === 'count') {
        count = await prisma.deal.count({ where })
      } else {
        const field = plan.orderBy?.field ?? 'createdAt'
        const rows = await prisma.deal.findMany({
          where, take: plan.limit,
          orderBy: { [field]: plan.orderBy?.direction ?? 'desc' },
          include: {
            stage: { select: { name: true, color: true } },
            contact: { select: { id: true, name: true } },
          },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'property') {
      const where: Record<string, unknown> = { organizationId }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.search) where.title = { contains: plan.search }
      if (plan.intent === 'count') {
        count = await prisma.property.count({ where })
      } else {
        const field = plan.orderBy?.field ?? 'createdAt'
        const rows = await prisma.property.findMany({
          where, take: plan.limit,
          orderBy: { [field]: plan.orderBy?.direction ?? 'desc' },
          select: { id: true, title: true, status: true, city: true, state: true, priceCents: true, bedrooms: true, bathrooms: true, sqft: true },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'showing') {
      const where: Record<string, unknown> = { property: { organizationId } }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.intent === 'count') {
        count = await prisma.showing.count({ where })
      } else {
        const rows = await prisma.showing.findMany({
          where, take: plan.limit,
          orderBy: { date: 'desc' },
          include: { property: { select: { title: true } } },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'volunteer') {
      const where: Record<string, unknown> = { organizationId }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.intent === 'count') {
        count = await prisma.volunteer.count({ where })
      } else {
        const rows = await prisma.volunteer.findMany({
          where, take: plan.limit,
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, email: true, totalHours: true, status: true },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else if (plan.entity === 'grant') {
      const where: Record<string, unknown> = { organizationId }
      if (plan.filters.createdAt) where.createdAt = plan.filters.createdAt
      if (plan.filters.status) where.status = plan.filters.status
      if (plan.intent === 'count') {
        count = await prisma.grant.count({ where })
      } else {
        const field = plan.intent === 'top' ? 'amountCents' : 'createdAt'
        const rows = await prisma.grant.findMany({
          where, take: plan.limit,
          orderBy: { [field]: 'desc' },
          select: { id: true, title: true, funder: true, amountCents: true, status: true },
        })
        data.push(...rows)
        count = rows.length
      }
    }
    else {
      answer = `Entity "${plan.entity}" not supported yet.`
      return { question: '', plan, answer, data: [], count: 0 }
    }

    /* Build human-readable answer */
    const entityLabel = plan.entity + (count === 1 ? '' : 's')
    if (plan.intent === 'count') {
      answer = `Found ${count} ${entityLabel}.`
    } else if (plan.intent === 'top') {
      answer = `Top ${count} ${entityLabel} by ${plan.orderBy?.field ?? 'date'}.`
    } else {
      answer = `Found ${count} ${entityLabel}${plan.filters.createdAt ? ' (filtered by date)' : ''}${plan.filters.status ? ` with status "${plan.filters.status}"` : ''}.`
    }
  } catch (err) {
    console.error('[nl-query] exec failed', err)
    answer = 'Sorry — I had trouble running that query.'
  }

  return { question: '', plan, answer, data, count }
}

/** Convenience: parse + execute. */
export async function runNLQuery(organizationId: string, question: string): Promise<NLResult> {
  const plan = parseQuestion(question)
  if (!plan) {
    return {
      question,
      plan: { intent: 'list', entity: 'contact', filters: {}, limit: 0 },
      answer: "I didn't recognize an entity in your question. Try asking about contacts, projects, deals, properties, showings, volunteers, or grants.",
      data: [],
      count: 0,
    }
  }
  const result = await executePlan(organizationId, plan)
  result.question = question
  return result
}
