/* ---------------------------------------------------------------
   AI command executor — runs ONE plan step at a time.

   Split from the planner so the user confirms each step before it
   runs. This gives transparency (they see the plan before anything
   touches the database) and lets us enforce per-step audit logging.

   All tools in this version are read-only or draft-only. The only
   generative call is draft_followup_email, which returns text for
   the user to paste/edit — no send path is wired up.
   --------------------------------------------------------------- */

import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logAudit } from '@/lib/philly/audit'
import type { AuthScope } from '@/lib/philly/auth-helpers'
import { logger } from '@/lib/philly/logger'
import type { PlanStep, TimeWindow } from './command-planner'

/* ── Shared helpers ────────────────────────────────────── */

function sinceDate(window: TimeWindow | undefined): Date | null {
  if (!window) return null
  const now = Date.now()
  switch (window) {
    case 'today': return new Date(now - 1 * 86400000)
    case 'week': return new Date(now - 7 * 86400000)
    case 'month': return new Date(now - 30 * 86400000)
    case 'quarter': return new Date(now - 90 * 86400000)
    case 'year': return new Date(now - 365 * 86400000)
  }
}

/** Resolve a free-text identifier (name/email fragment) to a Contact row
 *  within the scope's org. Case-insensitive, limits to 1. Returns null
 *  when no match — the caller surfaces a friendly error. */
async function resolveContact(identifier: string, organizationId: string) {
  const prisma = getAuthPrisma()
  const trimmed = identifier.trim()
  if (!trimmed) return null

  const row = await prisma.contact.findFirst({
    where: {
      organizationId,
      OR: [
        { email: trimmed },
        { name: { contains: trimmed } },
        { email: { contains: trimmed } },
      ],
    },
    select: {
      id: true, name: true, email: true, phone: true, company: true,
      type: true, notes: true, leadSource: true,
      aiIndustry: true, aiIcpFit: true, aiSummary: true,
    },
  })
  return row
}

/* ── Executor output shape ─────────────────────────────── */

export interface ExecuteResult {
  ok: boolean
  /** Tool name that ran — echoed back so the client can render the
   *  right result surface. */
  tool: PlanStep['tool']
  /** Short (≤160 char) human-readable summary of what happened. */
  summary: string
  /** Tool-specific payload: rows, counts, drafts, navigation paths. */
  data?: unknown
  error?: string
}

/* ── Per-tool handlers ─────────────────────────────────── */

async function runListContacts(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'list_contacts' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const since = sinceDate(args.createdSince)
  const where: Record<string, unknown> = { organizationId: scope.organizationId }
  if (since) where.createdAt = { gte: since }
  if (args.leadStatus) where.leadStatus = args.leadStatus
  if (args.search) where.OR = [
    { name: { contains: args.search } },
    { email: { contains: args.search } },
    { company: { contains: args.search } },
  ]

  const rows = await prisma.contact.findMany({
    where,
    take: args.limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, email: true, company: true, type: true,
      leadStatus: true, aiIcpFit: true, createdAt: true,
    },
  })

  return {
    ok: true,
    tool: 'list_contacts',
    summary: `Found ${rows.length} contact${rows.length === 1 ? '' : 's'}.`,
    data: { rows },
  }
}

async function runListDeals(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'list_deals' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const since = sinceDate(args.createdSince)
  const where: Record<string, unknown> = { pipeline: { organizationId: scope.organizationId } }
  if (since) where.createdAt = { gte: since }
  if (args.status) where.status = args.status

  const rows = await prisma.deal.findMany({
    where,
    take: args.limit,
    orderBy: args.topByValue
      ? { valueCents: 'desc' }
      : { createdAt: 'desc' },
    include: {
      stage: { select: { name: true, color: true } },
      contact: { select: { id: true, name: true } },
    },
  })

  return {
    ok: true,
    tool: 'list_deals',
    summary: `Found ${rows.length} deal${rows.length === 1 ? '' : 's'}${args.topByValue ? ' (top by value)' : ''}.`,
    data: { rows },
  }
}

async function runListProjects(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'list_projects' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const since = sinceDate(args.createdSince)
  const where: Record<string, unknown> = { organizationId: scope.organizationId }
  if (since) where.createdAt = { gte: since }
  if (args.status) where.status = args.status

  const rows = await prisma.project.findMany({
    where,
    take: args.limit,
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, status: true, startDate: true, endDate: true, budgetCents: true },
  })

  return {
    ok: true,
    tool: 'list_projects',
    summary: `Found ${rows.length} project${rows.length === 1 ? '' : 's'}.`,
    data: { rows },
  }
}

async function runListProperties(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'list_properties' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const where: Record<string, unknown> = { organizationId: scope.organizationId }
  if (args.status) where.status = args.status

  const rows = await prisma.property.findMany({
    where,
    take: args.limit,
    orderBy: args.topByPrice
      ? { priceCents: 'desc' }
      : { createdAt: 'desc' },
    select: { id: true, title: true, status: true, city: true, state: true, priceCents: true },
  })

  return {
    ok: true,
    tool: 'list_properties',
    summary: `Found ${rows.length} propert${rows.length === 1 ? 'y' : 'ies'}${args.topByPrice ? ' (top by price)' : ''}.`,
    data: { rows },
  }
}

async function runCountEntities(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'count_entities' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const since = sinceDate(args.createdSince)
  const baseWhere = since ? { createdAt: { gte: since } } : {}

  let count = 0
  if (args.entity === 'contact') {
    count = await prisma.contact.count({ where: { organizationId: scope.organizationId, ...baseWhere } })
  } else if (args.entity === 'deal') {
    count = await prisma.deal.count({ where: { pipeline: { organizationId: scope.organizationId }, ...baseWhere } })
  } else if (args.entity === 'project') {
    count = await prisma.project.count({ where: { organizationId: scope.organizationId, ...baseWhere } })
  } else if (args.entity === 'property') {
    count = await prisma.property.count({ where: { organizationId: scope.organizationId, ...baseWhere } })
  }

  const windowLabel = args.createdSince ? ` in the last ${args.createdSince}` : ''
  return {
    ok: true,
    tool: 'count_entities',
    summary: `${count} ${args.entity}${count === 1 ? '' : 's'}${windowLabel}.`,
    data: { count, entity: args.entity, window: args.createdSince ?? null },
  }
}

async function runSearchEntities(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'search_entities' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const q = args.query.trim()
  if (!q) {
    return { ok: false, tool: 'search_entities', summary: 'Empty search query.', error: 'query required' }
  }

  if (args.entity === 'contact') {
    const rows = await prisma.contact.findMany({
      where: {
        organizationId: scope.organizationId,
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { company: { contains: q } },
        ],
      },
      take: args.limit,
      select: { id: true, name: true, email: true, company: true, type: true },
    })
    return { ok: true, tool: 'search_entities', summary: `Found ${rows.length} contact${rows.length === 1 ? '' : 's'} matching "${q}".`, data: { entity: 'contact', rows } }
  }

  if (args.entity === 'deal') {
    const rows = await prisma.deal.findMany({
      where: { pipeline: { organizationId: scope.organizationId }, title: { contains: q } },
      take: args.limit,
      select: { id: true, title: true, status: true, valueCents: true },
    })
    return { ok: true, tool: 'search_entities', summary: `Found ${rows.length} deal${rows.length === 1 ? '' : 's'} matching "${q}".`, data: { entity: 'deal', rows } }
  }

  if (args.entity === 'project') {
    const rows = await prisma.project.findMany({
      where: { organizationId: scope.organizationId, title: { contains: q } },
      take: args.limit,
      select: { id: true, title: true, status: true },
    })
    return { ok: true, tool: 'search_entities', summary: `Found ${rows.length} project${rows.length === 1 ? '' : 's'} matching "${q}".`, data: { entity: 'project', rows } }
  }

  if (args.entity === 'property') {
    const rows = await prisma.property.findMany({
      where: { organizationId: scope.organizationId, OR: [{ title: { contains: q } }, { city: { contains: q } }] },
      take: args.limit,
      select: { id: true, title: true, status: true, city: true, priceCents: true },
    })
    return { ok: true, tool: 'search_entities', summary: `Found ${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} matching "${q}".`, data: { entity: 'property', rows } }
  }

  return { ok: false, tool: 'search_entities', summary: `Unsupported entity ${args.entity}.`, error: 'unsupported entity' }
}

async function runSummarizeContact(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'summarize_contact' }>['args'],
): Promise<ExecuteResult> {
  const contact = await resolveContact(args.identifier, scope.organizationId)
  if (!contact) {
    return {
      ok: false,
      tool: 'summarize_contact',
      summary: `No contact matched "${args.identifier}".`,
      error: 'contact not found',
    }
  }

  // Prefer the already-persisted aiSummary when we have one — avoids
  // a redundant model call and keeps summaries stable across sessions.
  if (contact.aiSummary && contact.aiSummary.length > 20) {
    return {
      ok: true,
      tool: 'summarize_contact',
      summary: `Summary for ${contact.name}.`,
      data: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email,
        industry: contact.aiIndustry,
        icpFit: contact.aiIcpFit,
        summary: contact.aiSummary,
        source: 'cached',
      },
    }
  }

  // Fallback: compose a non-AI summary from fields we already have so
  // the feature still works without an API key.
  const pieces = [
    contact.name,
    contact.company ? `works at ${contact.company}` : null,
    contact.type ? `a ${contact.type}` : null,
    contact.leadSource ? `came in via ${contact.leadSource}` : null,
  ].filter(Boolean)
  const composed = pieces.join(', ') + '.'

  return {
    ok: true,
    tool: 'summarize_contact',
    summary: `Summary for ${contact.name} (no AI attributes yet).`,
    data: {
      contactId: contact.id,
      name: contact.name,
      email: contact.email,
      summary: composed,
      source: 'composed',
    },
  }
}

async function runDraftFollowupEmail(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'draft_followup_email' }>['args'],
): Promise<ExecuteResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false, tool: 'draft_followup_email', summary: 'AI not configured.', error: 'ANTHROPIC_API_KEY missing' }
  }

  const contact = await resolveContact(args.identifier, scope.organizationId)
  if (!contact) {
    return {
      ok: false,
      tool: 'draft_followup_email',
      summary: `No contact matched "${args.identifier}".`,
      error: 'contact not found',
    }
  }

  const anthropic = createAnthropic({ apiKey })

  const contextLines = [
    `Contact: ${contact.name}`,
    contact.company ? `Company: ${contact.company}` : null,
    contact.type ? `Type: ${contact.type}` : null,
    contact.aiIndustry ? `Industry: ${contact.aiIndustry}` : null,
    contact.aiSummary ? `What we know: ${contact.aiSummary}` : null,
    `Angle: ${args.angle}`,
  ].filter(Boolean).join('\n')

  try {
    const { text } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: [
        'You draft short, operator-to-operator follow-up emails for a construction-trained revenue-engine consultancy.',
        'Style: direct, concrete, no corporate filler, no exclamation marks. 90-130 words. Signature: "— Juan". Always includes a clear next-step ask in the final sentence.',
        'Output format: first line is "Subject: ..." then a blank line, then the body. Nothing else.',
      ].join(' '),
      prompt: [
        'Draft the follow-up now.',
        '',
        contextLines,
      ].join('\n'),
      temperature: 0.6,
    })

    return {
      ok: true,
      tool: 'draft_followup_email',
      summary: `Drafted a follow-up to ${contact.name}.`,
      data: {
        contactId: contact.id,
        name: contact.name,
        email: contact.email,
        draft: text.trim(),
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[ai/command-executor] draft failed', { err: message })
    return { ok: false, tool: 'draft_followup_email', summary: 'Draft failed.', error: message }
  }
}

function runNavigateTo(
  args: Extract<PlanStep, { tool: 'navigate_to' }>['args'],
): ExecuteResult {
  return {
    ok: true,
    tool: 'navigate_to',
    summary: `Go to ${args.path}.`,
    data: { path: args.path },
  }
}

/* ── Dispatcher ────────────────────────────────────────── */

export async function executeStep(scope: AuthScope, step: PlanStep): Promise<ExecuteResult> {
  let result: ExecuteResult
  switch (step.tool) {
    case 'list_contacts':   result = await runListContacts(scope, step.args); break
    case 'list_deals':      result = await runListDeals(scope, step.args); break
    case 'list_projects':   result = await runListProjects(scope, step.args); break
    case 'list_properties': result = await runListProperties(scope, step.args); break
    case 'count_entities':  result = await runCountEntities(scope, step.args); break
    case 'search_entities': result = await runSearchEntities(scope, step.args); break
    case 'summarize_contact': result = await runSummarizeContact(scope, step.args); break
    case 'draft_followup_email': result = await runDraftFollowupEmail(scope, step.args); break
    case 'navigate_to':     result = runNavigateTo(step.args); break
  }

  // Audit every execution — read-only tools too, so admins can see
  // what the command bar was asked to do. Fire-and-forget.
  logAudit({
    scope,
    action: 'update',
    entity: 'auditLog',
    changes: {
      aiCommand: {
        old: null,
        new: {
          tool: step.tool,
          args: step.args,
          ok: result.ok,
          summary: result.summary.slice(0, 200),
        },
      },
    },
  })

  return result
}
