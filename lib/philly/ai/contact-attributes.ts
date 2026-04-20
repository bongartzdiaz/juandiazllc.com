/* ---------------------------------------------------------------
   Attio-style AI attributes for contacts.

   Takes a contact row (name, email, company, notes, type, org context)
   and fills three inferred fields:

     • aiIndustry  — plain-English sector label (e.g. "Residential solar")
     • aiIcpFit    — 0-100 score against the org's ICP
     • aiSummary   — one-paragraph narrative (~350 chars)

   Transport: Vercel AI SDK v6 + @ai-sdk/anthropic. Uses Haiku 4.5
   for cost-efficient enrichment; a contact fill is ~300 output tokens.
   Returns strict structured output via generateObject() + zod.

   Guardrails:
     - Errors are caught and surfaced via `error` on the return type.
     - If ANTHROPIC_API_KEY is unset, we short-circuit with a clear
       error instead of crashing the request.
     - The model is never given IDs or internal identifiers.
   --------------------------------------------------------------- */

import { generateObject } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'

export const attributeSchema = z.object({
  industry: z
    .string()
    .min(2)
    .max(60)
    .describe('Short plain-English industry/vertical label for this contact\'s company, 1-4 words. E.g. "Residential solar", "SaaS — devtools", "Independent bakery". Use "Unknown" if you cannot infer.'),
  icpFit: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('0-100 score for how well this contact matches a construction/operations/energy-tech operator ICP. Higher = better fit. Base this on inferred role, company type, and any notes. Be conservative — 50 is neutral.'),
  summary: z
    .string()
    .min(40)
    .max(420)
    .describe('One concise paragraph (2-3 sentences, under 420 chars) describing who this person is, what their company likely does, and what a salesperson would use to open a conversation. Never invent specific facts; if you don\'t know, say so in general terms.'),
})

export type ContactAttributes = z.infer<typeof attributeSchema>

export interface GenerateResult {
  ok: boolean
  data?: ContactAttributes
  error?: string
}

interface GenerateInput {
  name: string
  email: string
  phone: string
  company: string
  type: string
  notes: string
  leadSource: string
  orgName?: string
}

const MODEL_ID = 'claude-haiku-4-5-20251001'

function systemPrompt(orgName?: string): string {
  const ctx = orgName
    ? `You enrich CRM contacts for "${orgName}", a construction-trained operator building revenue engines in energy, real estate, and hospitality.`
    : 'You enrich CRM contacts for an operator-focused CRM.'
  return [
    ctx,
    'Output strict JSON matching the provided schema — no extra keys, no commentary.',
    'Be conservative. If the input is sparse, score ICP around 40-55 and give a hedged summary rather than inventing details.',
    'Never include PII beyond what is in the input. Never mention the user\'s internal IDs.',
  ].join(' ')
}

function userPrompt(input: GenerateInput): string {
  const lines = [
    `Name: ${input.name || '(none)'}`,
    `Email: ${input.email || '(none)'}`,
    `Phone: ${input.phone || '(none)'}`,
    `Company: ${input.company || '(none)'}`,
    `Contact type: ${input.type || 'stakeholder'}`,
    `Lead source: ${input.leadSource || '(unknown)'}`,
    `Notes: ${input.notes?.slice(0, 1500) || '(none)'}`,
  ]
  return lines.join('\n')
}

export async function generateContactAttributes(
  input: GenerateInput,
): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'ANTHROPIC_API_KEY not configured' }
  }

  const anthropic = createAnthropic({ apiKey })

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL_ID),
      schema: attributeSchema,
      system: systemPrompt(input.orgName),
      prompt: userPrompt(input),
      // Low temperature keeps inferred attributes stable across re-runs;
      // users expect hitting "refresh" twice to produce the same answer
      // when the underlying data hasn't changed.
      temperature: 0.2,
    })
    return { ok: true, data: object }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[ai/contact-attributes] generation failed', { err: message })
    return { ok: false, error: message }
  }
}

/** Run + persist to the Contact row. Marks status=pending during the
 *  call so the UI can show a spinner, flips to ready/error at the end. */
export async function runAndPersistContactAttributes(args: {
  contactId: string
  organizationId: string
}): Promise<GenerateResult> {
  const prisma = getAuthPrisma()
  const contact = await prisma.contact.findFirst({
    where: { id: args.contactId, organizationId: args.organizationId },
    include: { organization: { select: { name: true } } },
  })
  if (!contact) return { ok: false, error: 'Contact not found' }

  await prisma.contact.update({
    where: { id: args.contactId },
    data: { aiAttributesStatus: 'pending', aiAttributesError: null },
  })

  const result = await generateContactAttributes({
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    type: contact.type,
    notes: contact.notes,
    leadSource: contact.leadSource,
    orgName: contact.organization?.name,
  })

  if (!result.ok || !result.data) {
    await prisma.contact.update({
      where: { id: args.contactId },
      data: {
        aiAttributesStatus: 'error',
        aiAttributesError: result.error?.slice(0, 1000) ?? 'unknown error',
        aiAttributesUpdatedAt: new Date(),
      },
    })
    return result
  }

  await prisma.contact.update({
    where: { id: args.contactId },
    data: {
      aiIndustry: result.data.industry,
      aiIcpFit: result.data.icpFit,
      aiSummary: result.data.summary,
      aiAttributesStatus: 'ready',
      aiAttributesError: null,
      aiAttributesUpdatedAt: new Date(),
    },
  })

  return result
}
