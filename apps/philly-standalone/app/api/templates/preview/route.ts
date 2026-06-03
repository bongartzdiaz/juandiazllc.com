/* POST /api/templates/preview — render a template with sample context.
   Body: { templateId?: string; body?: string; subject?: string; context?: Record<string, unknown> }
   Returns: { subject, body } with {{fields}} resolved. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { renderTemplate } from '@/lib/philly/templates/renderer'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const previewSchema = z.object({
  templateId: z.string().max(255).optional(),
  body: z.string().max(500_000).optional(),
  subject: z.string().max(998).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`templates.preview:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, previewSchema)
  if (body instanceof NextResponse) return body

  const ctx = (body.context as Record<string, unknown>) ?? {}

  let subject = typeof body.subject === 'string' ? body.subject : ''
  let text = typeof body.body === 'string' ? body.body : ''

  if (typeof body.templateId === 'string' && body.templateId) {
    const prisma = getAuthPrisma()
    const tpl = await prisma.template.findFirst({
      where: { id: body.templateId, organizationId: scope.organizationId },
    })
    if (!tpl) return jsonError('Template not found', 404)
    subject = tpl.subject
    text = tpl.body
  }

  return NextResponse.json({
    data: {
      subject: renderTemplate(subject, ctx),
      body: renderTemplate(text, ctx),
    },
  })
}
