/* ---------------------------------------------------------------
   AI command planner — natural language → structured plan.

   The user types something like "find warm energy contacts I haven't
   touched in 30 days and draft a follow-up for the top one". The
   planner turns that into a sequence of typed tool calls that the
   executor can run one-at-a-time, with the user confirming each step.

   Tools are **read-only + draft-only** in this first version. No
   writes, no sends. The executor persists nothing except an audit
   trail of what the user ran.

   Transport: Vercel AI SDK v6 + @ai-sdk/anthropic, generateObject
   with a Zod schema so the model can't return free-form JSON that
   the executor then has to sniff-validate.
   --------------------------------------------------------------- */

import { generateObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/philly/logger'

/* ── Tool registry ─────────────────────────────────────── */

/** Time windows the planner can express. Keep this small and enum-shaped
 *  so the executor never has to parse dates from model output. */
export const timeWindowEnum = z.enum(['today', 'week', 'month', 'quarter', 'year'])
export type TimeWindow = z.infer<typeof timeWindowEnum>

export const entityEnum = z.enum(['contact', 'deal', 'project', 'property'])
export type PlannerEntity = z.infer<typeof entityEnum>

const listContactsStep = z.object({
  tool: z.literal('list_contacts'),
  args: z.object({
    limit: z.number().int().min(1).max(50).default(10),
    createdSince: timeWindowEnum.optional(),
    leadStatus: z.string().max(40).optional(),
    search: z.string().max(120).optional(),
  }),
  rationale: z.string().min(4).max(240),
})

const listDealsStep = z.object({
  tool: z.literal('list_deals'),
  args: z.object({
    limit: z.number().int().min(1).max(50).default(10),
    createdSince: timeWindowEnum.optional(),
    status: z.string().max(40).optional(),
    topByValue: z.boolean().optional(),
  }),
  rationale: z.string().min(4).max(240),
})

const listProjectsStep = z.object({
  tool: z.literal('list_projects'),
  args: z.object({
    limit: z.number().int().min(1).max(50).default(10),
    createdSince: timeWindowEnum.optional(),
    status: z.string().max(40).optional(),
  }),
  rationale: z.string().min(4).max(240),
})

const listPropertiesStep = z.object({
  tool: z.literal('list_properties'),
  args: z.object({
    limit: z.number().int().min(1).max(50).default(10),
    status: z.string().max(40).optional(),
    topByPrice: z.boolean().optional(),
  }),
  rationale: z.string().min(4).max(240),
})

const countEntitiesStep = z.object({
  tool: z.literal('count_entities'),
  args: z.object({
    entity: entityEnum,
    createdSince: timeWindowEnum.optional(),
  }),
  rationale: z.string().min(4).max(240),
})

const searchEntitiesStep = z.object({
  tool: z.literal('search_entities'),
  args: z.object({
    entity: entityEnum,
    query: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(20).default(5),
  }),
  rationale: z.string().min(4).max(240),
})

const summarizeContactStep = z.object({
  tool: z.literal('summarize_contact'),
  args: z.object({
    /** Contact identifier — either a stored row id, or a name/email the
     *  executor can resolve. The model isn't given row ids, so this
     *  field is typically a name or email the user mentioned. */
    identifier: z.string().min(1).max(120),
  }),
  rationale: z.string().min(4).max(240),
})

const draftFollowupEmailStep = z.object({
  tool: z.literal('draft_followup_email'),
  args: z.object({
    identifier: z.string().min(1).max(120),
    angle: z.string().min(3).max(280).describe('One-line angle the email should take, e.g. "reference their Q3 energy cost pain point".'),
  }),
  rationale: z.string().min(4).max(240),
})

const navigateToStep = z.object({
  tool: z.literal('navigate_to'),
  args: z.object({
    path: z.string().regex(/^\/philly(\/[\w\-./]*)?$/, 'path must be under /philly').max(160),
  }),
  rationale: z.string().min(4).max(240),
})

/* ── Write tools ───────────────────────────────────────── */
/* These MUTATE the database. The client requires a second
   confirmation before dispatching them, and every successful run
   writes an audit entry keyed to the actual entity id. */

const updateDealStageStep = z.object({
  tool: z.literal('update_deal_stage'),
  args: z.object({
    dealIdentifier: z.string().min(1).max(120).describe('Deal title, id, or unique substring.'),
    stageName: z.string().min(1).max(60).describe('Target pipeline stage name (matched case-insensitively within the same pipeline).'),
  }),
  rationale: z.string().min(4).max(240),
})

const addContactNoteStep = z.object({
  tool: z.literal('add_contact_note'),
  args: z.object({
    identifier: z.string().min(1).max(120).describe('Contact name or email to match.'),
    note: z.string().min(3).max(1000).describe('Note body. Will be appended to contact.notes with a timestamp line.'),
  }),
  rationale: z.string().min(4).max(240),
})

const setLeadStatusStep = z.object({
  tool: z.literal('set_lead_status'),
  args: z.object({
    identifier: z.string().min(1).max(120),
    leadStatus: z.enum(['new', 'contacted', 'qualified', 'nurture', 'hot', 'under_contract', 'closed', 'lost']),
  }),
  rationale: z.string().min(4).max(240),
})

const createTaskStep = z.object({
  tool: z.literal('create_task'),
  args: z.object({
    identifier: z.string().min(1).max(120).describe('Contact name or email the task is about.'),
    title: z.string().min(3).max(160).describe('Short task title.'),
    dueInDays: z.number().int().min(0).max(90).default(1).describe('Days from now until the task is due. 0 = today.'),
    description: z.string().max(1000).optional().describe('Optional longer context.'),
  }),
  rationale: z.string().min(4).max(240),
})

const scheduleFollowupStep = z.object({
  tool: z.literal('schedule_followup'),
  args: z.object({
    identifier: z.string().min(1).max(120).optional().describe('Optional contact name/email; when set, mentioned in the event description so it links back.'),
    title: z.string().min(3).max(160).describe('Event title as it will appear on the calendar.'),
    daysOut: z.number().int().min(0).max(90).describe('Days from today to schedule the follow-up. 0 = today.'),
    timeOfDay: z.enum(['morning', 'afternoon']).default('morning').describe('morning = 10:00 UTC; afternoon = 14:00 UTC. Exact time stays editable in the calendar.'),
    durationMinutes: z.number().int().min(15).max(180).default(30),
  }),
  rationale: z.string().min(4).max(240),
})

const linkDealToContactStep = z.object({
  tool: z.literal('link_deal_to_contact'),
  args: z.object({
    dealIdentifier: z.string().min(1).max(120).describe('Deal title, id, or unique substring.'),
    contactIdentifier: z.string().min(1).max(120).describe('Contact name or email to link the deal to.'),
  }),
  rationale: z.string().min(4).max(240),
})

export const planStepSchema = z.discriminatedUnion('tool', [
  listContactsStep,
  listDealsStep,
  listProjectsStep,
  listPropertiesStep,
  countEntitiesStep,
  searchEntitiesStep,
  summarizeContactStep,
  draftFollowupEmailStep,
  navigateToStep,
  updateDealStageStep,
  addContactNoteStep,
  setLeadStatusStep,
  createTaskStep,
  scheduleFollowupStep,
  linkDealToContactStep,
])


export type PlanStep = z.infer<typeof planStepSchema>
export type ToolName = PlanStep['tool']

/** Tools that mutate the database. The client uses this to render a
 *  double-confirm affordance. Keep in sync with any new write tools. */
export const WRITE_TOOLS: ReadonlySet<ToolName> = new Set<ToolName>([
  'update_deal_stage',
  'add_contact_note',
  'set_lead_status',
  'create_task',
  'schedule_followup',
  'link_deal_to_contact',
])

export function isWriteTool(tool: ToolName): boolean {
  return WRITE_TOOLS.has(tool)
}

export const planSchema = z.object({
  understanding: z
    .string()
    .min(4)
    .max(400)
    .describe('One sentence restating what the user is asking for. Plain English, not a repeat of the literal query.'),
  steps: z
    .array(planStepSchema)
    .min(0)
    .max(4)
    .describe('Ordered tool calls. Empty array when no tool applies — use clarification instead.'),
  clarification: z
    .string()
    .max(280)
    .optional()
    .describe('Set ONLY when the request is too vague to plan. When set, steps MUST be empty.'),
})

export type CommandPlan = z.infer<typeof planSchema>

/* ── Planner ───────────────────────────────────────────── */

const MODEL_ID = 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = [
  'You are the planner for an operator CRM ("Philly"). The user types a request in natural language; you return a structured plan of tool calls the executor can run.',
  'Rules:',
  '1. Prefer the narrowest tool that satisfies the request. Do not chain speculative steps.',
  '2. Every step\'s rationale must explain WHY, in one sentence, in the same language the user used.',
  '3. For "summarize X" requests, use summarize_contact with the person\'s name/email as identifier — you never see row ids.',
  '4. draft_followup_email ONLY drafts text; it never sends. Be conservative about using it.',
  '5. navigate_to is for "take me to / open / show me the X page" requests. Path must start with /philly.',
  '6. Write tools (update_deal_stage, add_contact_note, set_lead_status, create_task, schedule_followup, link_deal_to_contact) MUTATE data. Only use them when the user explicitly asked to change/update/move/add/create/schedule/link something. Never chain a write after an exploratory step — if the user needs to pick a target first, ask with clarification.',
  '7. create_task creates an Activity of type="task" on a contact. Use it for "remind me to…", "add a task to follow up with…", "create a task". Default dueInDays=1.',
  '8. schedule_followup creates a CalendarEvent. Use it for "schedule a follow-up with…", "book a call", "set up a meeting in N days". timeOfDay morning=10:00 / afternoon=14:00. Default durationMinutes=30.',
  '9. link_deal_to_contact sets contactId on a deal. Use it for "link the Acme deal to marco@…", "attach contact to deal".',
  '10. When the request is ambiguous (missing a target, missing an entity type), return an empty steps array and set clarification to a single question.',
  '11. Never output tool names not in the schema. Never invent args.',
].join('\n')

export interface PlanInput {
  /** Free-text user instruction from the command palette. */
  input: string
  /** Optional industry label so planner can prefer the right entity. */
  industry?: 'realestate' | 'hospitality' | 'philanthropy' | null
}

export interface PlanResult {
  ok: boolean
  plan?: CommandPlan
  error?: string
}

export async function planCommand({ input, industry }: PlanInput): Promise<PlanResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not configured' }

  const trimmed = input.trim()
  if (!trimmed) return { ok: false, error: 'input is required' }
  if (trimmed.length > 500) return { ok: false, error: 'input too long (max 500 chars)' }

  const anthropic = createAnthropic({ apiKey })
  const industryHint = industry
    ? `Current workspace industry mode: ${industry}. Prefer matching entities (realestate → property/deal, hospitality → reservation, philanthropy → grant/volunteer) when the user is ambiguous.`
    : 'No industry mode set.'

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL_ID),
      schema: planSchema,
      system: SYSTEM_PROMPT,
      prompt: [industryHint, '', 'User request:', trimmed].join('\n'),
      temperature: 0.1,
    })

    // Belt-and-braces invariant the schema describes but can't enforce:
    // when clarification is present, steps must be empty, and vice versa.
    if (object.clarification && object.steps.length > 0) {
      return { ok: true, plan: { ...object, steps: [] } }
    }

    return { ok: true, plan: object }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[ai/command-planner] generation failed', { err: message })
    return { ok: false, error: message }
  }
}
