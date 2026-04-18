/* POST /api/templates/preview — render a template with sample context.
   Body: { templateId?: string; body?: string; subject?: string; context?: Record<string, unknown> }
   Returns: { subject, body } with {{fields}} resolved. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'
import { renderTemplate } from '@/lib/templates/renderer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

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
