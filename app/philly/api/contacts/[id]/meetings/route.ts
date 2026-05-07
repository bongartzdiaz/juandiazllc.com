/* GET /api/contacts/[id]/meetings
 *
 * Returns synced calendar events whose attendee list intersects with
 * THIS contact's email. Used by the deal-page meetings widget.
 *
 * Privacy posture:
 *   - Org-scoped: only events synced by users in the same org as the
 *     requesting user are returned. Cross-tenant 404 if id resolves
 *     to a contact in another org.
 *   - Per-user filtering already happened at sync time — events
 *     without a matched CRM contact were never persisted, so this
 *     query is just a "events touching this contact" lookup.
 *   - The synced row's title/location may be redacted (per-org
 *     `redactSyncedTitles` toggle); we return the stored value
 *     verbatim — UI shows "(redacted)" as a placeholder.
 *
 * Window:
 *   ?range=upcoming (default)  — events with end >= now, soonest first
 *   ?range=past                — events with end < now, most recent first
 *   ?range=all                 — both, soonest first within the window
 *
 * Capped at 50 results per call; the deal page only shows a short list.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_READ } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_RESULTS = 50

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contact-meetings:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, email: true },
  })
  if (!contact) {
    // Cross-tenant 404 — never leak the existence of a contact in
    // another org.
    return jsonError('not_found', 404)
  }
  if (!contact.email) {
    return NextResponse.json({ data: { meetings: [] } })
  }

  const url = new URL(req.url)
  const range = url.searchParams.get('range') ?? 'upcoming'
  const now = new Date()

  const where = {
    organizationId: scope.organizationId,
    cancelledAt: null,
    // Stored as comma-separated lowercased emails; substring match is
    // safe because emails contain `@` and `,` is the only separator.
    matchedEmails: { contains: contact.email.toLowerCase() },
    ...(range === 'upcoming'
      ? { endTime: { gte: now } }
      : range === 'past'
        ? { endTime: { lt: now } }
        : {}),
  }

  const meetings = await prisma.syncedCalendarEvent.findMany({
    where,
    select: {
      id: true,
      provider: true,
      title: true,
      location: true,
      htmlLink: true,
      startTime: true,
      endTime: true,
      allDay: true,
      matchedEmails: true,
    },
    orderBy: range === 'past' ? { startTime: 'desc' } : { startTime: 'asc' },
    take: MAX_RESULTS,
  })

  return NextResponse.json({ data: { meetings } })
}
