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
import { isWriteTool, type PlanStep, type TimeWindow } from './command-planner'

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

/* ── Write handlers ────────────────────────────────────── */

async function runUpdateDealStage(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'update_deal_stage' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const ident = args.dealIdentifier.trim()

  // Resolve the deal — id match first, then title contains.
  const deal = await prisma.deal.findFirst({
    where: {
      pipeline: { organizationId: scope.organizationId },
      OR: [{ id: ident }, { title: { contains: ident } }],
    },
    select: { id: true, title: true, pipelineId: true, stageId: true, stage: { select: { name: true } } },
  })
  if (!deal) {
    return { ok: false, tool: 'update_deal_stage', summary: `No deal matched "${ident}".`, error: 'deal not found' }
  }

  // Stage must live in the same pipeline as the deal.
  const stage = await prisma.pipelineStage.findFirst({
    where: { pipelineId: deal.pipelineId, name: { contains: args.stageName } },
    select: { id: true, name: true },
  })
  if (!stage) {
    return { ok: false, tool: 'update_deal_stage', summary: `No stage matching "${args.stageName}" in this pipeline.`, error: 'stage not found' }
  }

  if (stage.id === deal.stageId) {
    return {
      ok: true,
      tool: 'update_deal_stage',
      summary: `"${deal.title}" is already in ${stage.name}.`,
      data: { dealId: deal.id, previousStage: deal.stage?.name, stage: stage.name, noOp: true },
    }
  }

  await prisma.deal.update({
    where: { id: deal.id },
    data: { stageId: stage.id },
  })

  logAudit({
    scope,
    action: 'update',
    entity: 'deal',
    entityId: deal.id,
    changes: { stageId: { old: deal.stageId, new: stage.id }, stage: { old: deal.stage?.name ?? null, new: stage.name } },
  })

  return {
    ok: true,
    tool: 'update_deal_stage',
    summary: `Moved "${deal.title}" → ${stage.name}.`,
    data: { dealId: deal.id, previousStage: deal.stage?.name, stage: stage.name },
  }
}

async function runAddContactNote(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'add_contact_note' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const contact = await resolveContact(args.identifier, scope.organizationId)
  if (!contact) {
    return { ok: false, tool: 'add_contact_note', summary: `No contact matched "${args.identifier}".`, error: 'contact not found' }
  }

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const newLine = `[${stamp}] ${args.note.trim()}`
  const existing = (contact.notes ?? '').trim()
  const next = existing ? `${existing}\n\n${newLine}` : newLine

  await prisma.contact.update({
    where: { id: contact.id },
    data: { notes: next },
  })

  logAudit({
    scope,
    action: 'update',
    entity: 'contact',
    entityId: contact.id,
    changes: { notes: { old: '(append)', new: newLine } },
  })

  return {
    ok: true,
    tool: 'add_contact_note',
    summary: `Note added to ${contact.name}.`,
    data: { contactId: contact.id, name: contact.name, appended: newLine },
  }
}

async function runSetLeadStatus(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'set_lead_status' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const contact = await resolveContact(args.identifier, scope.organizationId)
  if (!contact) {
    return { ok: false, tool: 'set_lead_status', summary: `No contact matched "${args.identifier}".`, error: 'contact not found' }
  }

  const prev = await prisma.contact.findUnique({
    where: { id: contact.id },
    select: { leadStatus: true },
  })

  if (prev?.leadStatus === args.leadStatus) {
    return {
      ok: true,
      tool: 'set_lead_status',
      summary: `${contact.name} is already "${args.leadStatus}".`,
      data: { contactId: contact.id, name: contact.name, leadStatus: args.leadStatus, noOp: true },
    }
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: { leadStatus: args.leadStatus },
  })

  logAudit({
    scope,
    action: 'update',
    entity: 'contact',
    entityId: contact.id,
    changes: { leadStatus: { old: prev?.leadStatus ?? null, new: args.leadStatus } },
  })

  return {
    ok: true,
    tool: 'set_lead_status',
    summary: `${contact.name}: ${prev?.leadStatus ?? 'new'} → ${args.leadStatus}.`,
    data: { contactId: contact.id, name: contact.name, leadStatus: args.leadStatus, previous: prev?.leadStatus ?? null },
  }
}

async function runCreateTask(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'create_task' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const contact = await resolveContact(args.identifier, scope.organizationId)
  if (!contact) {
    return { ok: false, tool: 'create_task', summary: `No contact matched "${args.identifier}".`, error: 'contact not found' }
  }

  const due = new Date(Date.now() + args.dueInDays * 86400000)
  const activity = await prisma.activity.create({
    data: {
      organizationId: scope.organizationId,
      contactId: contact.id,
      userId: scope.userId,
      type: 'task',
      title: args.title,
      description: args.description ?? '',
      metadata: JSON.stringify({ dueAt: due.toISOString(), status: 'open' }),
    },
    select: { id: true, title: true, createdAt: true },
  })

  logAudit({
    scope,
    action: 'create',
    entity: 'activity',
    entityId: activity.id,
    changes: { task: { old: null, new: { title: args.title, dueAt: due.toISOString(), contactId: contact.id } } },
  })

  const dueLabel = args.dueInDays === 0 ? 'today' : args.dueInDays === 1 ? 'tomorrow' : `in ${args.dueInDays} days`
  return {
    ok: true,
    tool: 'create_task',
    summary: `Task "${args.title}" for ${contact.name}, due ${dueLabel}.`,
    data: {
      activityId: activity.id,
      contactId: contact.id,
      contactName: contact.name,
      title: args.title,
      dueAt: due.toISOString(),
      dueInDays: args.dueInDays,
    },
  }
}

async function runScheduleFollowup(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'schedule_followup' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()

  // Optional contact — only resolve + fail on mismatch when user specified one.
  let contact: Awaited<ReturnType<typeof resolveContact>> = null
  if (args.identifier) {
    contact = await resolveContact(args.identifier, scope.organizationId)
    if (!contact) {
      return { ok: false, tool: 'schedule_followup', summary: `No contact matched "${args.identifier}".`, error: 'contact not found' }
    }
  }

  const day = new Date()
  day.setUTCDate(day.getUTCDate() + args.daysOut)
  day.setUTCHours(args.timeOfDay === 'afternoon' ? 14 : 10, 0, 0, 0)
  const startTime = day
  const endTime = new Date(startTime.getTime() + args.durationMinutes * 60000)

  const description = contact
    ? `Follow-up with ${contact.name}${contact.email ? ` (${contact.email})` : ''}.`
    : ''

  const event = await prisma.calendarEvent.create({
    data: {
      organizationId: scope.organizationId,
      title: args.title,
      description,
      startTime,
      endTime,
      allDay: false,
      location: '',
      color: '#3B82F6',
    },
    select: { id: true, title: true, startTime: true, endTime: true },
  })

  logAudit({
    scope,
    action: 'create',
    entity: 'calendarEvent',
    entityId: event.id,
    changes: { followup: { old: null, new: { title: args.title, startTime: startTime.toISOString(), contactId: contact?.id ?? null } } },
  })

  const whenLabel = args.daysOut === 0 ? 'today' : args.daysOut === 1 ? 'tomorrow' : `in ${args.daysOut} days`
  const timeLabel = args.timeOfDay === 'afternoon' ? '14:00 UTC' : '10:00 UTC'
  return {
    ok: true,
    tool: 'schedule_followup',
    summary: contact
      ? `Scheduled "${args.title}" with ${contact.name} ${whenLabel} at ${timeLabel}.`
      : `Scheduled "${args.title}" ${whenLabel} at ${timeLabel}.`,
    data: {
      eventId: event.id,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      contactId: contact?.id ?? null,
      contactName: contact?.name ?? null,
    },
  }
}

async function runLinkDealToContact(
  scope: AuthScope,
  args: Extract<PlanStep, { tool: 'link_deal_to_contact' }>['args'],
): Promise<ExecuteResult> {
  const prisma = getAuthPrisma()
  const dealIdent = args.dealIdentifier.trim()

  const deal = await prisma.deal.findFirst({
    where: {
      pipeline: { organizationId: scope.organizationId },
      OR: [{ id: dealIdent }, { title: { contains: dealIdent } }],
    },
    select: { id: true, title: true, contactId: true, contact: { select: { id: true, name: true } } },
  })
  if (!deal) {
    return { ok: false, tool: 'link_deal_to_contact', summary: `No deal matched "${dealIdent}".`, error: 'deal not found' }
  }

  const contact = await resolveContact(args.contactIdentifier, scope.organizationId)
  if (!contact) {
    return { ok: false, tool: 'link_deal_to_contact', summary: `No contact matched "${args.contactIdentifier}".`, error: 'contact not found' }
  }

  if (deal.contactId === contact.id) {
    return {
      ok: true,
      tool: 'link_deal_to_contact',
      summary: `"${deal.title}" is already linked to ${contact.name}.`,
      data: { dealId: deal.id, contactId: contact.id, contactName: contact.name, noOp: true },
    }
  }

  await prisma.deal.update({
    where: { id: deal.id },
    data: { contactId: contact.id },
  })

  logAudit({
    scope,
    action: 'update',
    entity: 'deal',
    entityId: deal.id,
    changes: {
      contactId: { old: deal.contactId, new: contact.id },
      contact: { old: deal.contact?.name ?? null, new: contact.name },
    },
  })

  return {
    ok: true,
    tool: 'link_deal_to_contact',
    summary: `Linked "${deal.title}" → ${contact.name}.`,
    data: {
      dealId: deal.id,
      dealTitle: deal.title,
      contactId: contact.id,
      contactName: contact.name,
      previousContactName: deal.contact?.name ?? null,
    },
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
    case 'update_deal_stage':  result = await runUpdateDealStage(scope, step.args); break
    case 'add_contact_note':   result = await runAddContactNote(scope, step.args); break
    case 'set_lead_status':    result = await runSetLeadStatus(scope, step.args); break
    case 'create_task':          result = await runCreateTask(scope, step.args); break
    case 'schedule_followup':    result = await runScheduleFollowup(scope, step.args); break
    case 'link_deal_to_contact': result = await runLinkDealToContact(scope, step.args); break
  }

  // Read-only tools still audit as a command-bar event so admins can
  // see what the AI was asked to do. Write tools already audit against
  // the actual entity (deal/contact) inside their handlers — skip the
  // duplicate here so the audit trail stays clean.
  if (!isWriteTool(step.tool)) {
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
  }

  return result
}
