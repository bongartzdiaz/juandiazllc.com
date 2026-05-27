/* GET /api/contacts/[id]/communications
   ──────────────────────────────────────────────────────────────────
   Unified communication timeline for a contact. Merges:
     - EmailThread (Gmail + IMAP synced) — has the contactId column
     - CallLog — phone calls logged via the dialer or manually
     - Conversation (multi-channel inbox: email/sms/whatsapp) — has
       contactId on the conversation level (messages roll up via it)

   Each row carries a `type` discriminator + `timestamp` for sorting.
   Limited to last 25 across all sources combined to keep payloads
   tight.

   Security: org-scoped + contact-ownership-verified, same pattern as
   the drip-enrollments route. CallLog filters by organizationId AND
   contactId; Conversation filters the same way; EmailThread lacks
   org column but is reached via accountId → EmailAccount.organizationId,
   so we do an inner-org check via the account relation.

   Response shape:
     { data: Array<{
         type: 'email' | 'call' | 'conversation'
         id: string
         timestamp: string  // ISO
         summary: string
         direction?: 'inbound' | 'outbound'
         channel?: 'email' | 'sms' | 'whatsapp'
         unread?: boolean
     }> } */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const MAX_ITEMS = 25

interface CommItem {
  type: 'email' | 'call' | 'conversation'
  id: string
  timestamp: string
  summary: string
  direction?: 'inbound' | 'outbound'
  channel?: 'email' | 'sms' | 'whatsapp'
  unread?: boolean
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('contacts')
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  // Ownership gate — without this, contact-id enumeration would leak
  // existence + comms metadata.
  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const orgId = scope.organizationId

  // Three parallel queries — each capped at MAX_ITEMS so the merge
  // never wastes work on rows that won't make the cut.
  const [emails, calls, convs] = await Promise.all([
    prisma.emailThread.findMany({
      where: { contactId: id, account: { organizationId: orgId } },
      orderBy: { lastMessageAt: 'desc' },
      take: MAX_ITEMS,
      select: {
        id: true, subject: true, snippet: true,
        lastMessageAt: true, unreadCount: true,
      },
    }),
    prisma.callLog.findMany({
      where: { contactId: id, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: MAX_ITEMS,
      select: {
        id: true, direction: true, status: true, duration: true,
        outcome: true, notes: true, createdAt: true,
      },
    }),
    prisma.conversation.findMany({
      where: { contactId: id, organizationId: orgId },
      orderBy: { lastMessageAt: 'desc' },
      take: MAX_ITEMS,
      select: {
        id: true, channel: true, subject: true, status: true,
        lastMessageAt: true, unreadCount: true,
      },
    }),
  ])

  const items: CommItem[] = []

  for (const e of emails) {
    items.push({
      type: 'email',
      id: e.id,
      timestamp: (e.lastMessageAt ?? new Date(0)).toISOString(),
      summary: e.subject || e.snippet.slice(0, 80) || '(no subject)',
      unread: e.unreadCount > 0,
    })
  }
  for (const c of calls) {
    // Compose human summary — direction + outcome + duration.
    const durMin = Math.round(c.duration / 60)
    const summary = [
      c.direction === 'inbound' ? 'Inbound call' : 'Outbound call',
      c.outcome || c.status,
      durMin > 0 ? `${durMin}m` : null,
    ].filter(Boolean).join(' · ')
    items.push({
      type: 'call',
      id: c.id,
      timestamp: c.createdAt.toISOString(),
      summary,
      direction: c.direction === 'inbound' ? 'inbound' : 'outbound',
    })
  }
  for (const conv of convs) {
    items.push({
      type: 'conversation',
      id: conv.id,
      timestamp: (conv.lastMessageAt ?? new Date(0)).toISOString(),
      summary: conv.subject || `${conv.channel} conversation`,
      channel: conv.channel as 'email' | 'sms' | 'whatsapp',
      unread: conv.unreadCount > 0,
    })
  }

  // Merge-sort by timestamp desc + clip
  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return NextResponse.json({ data: items.slice(0, MAX_ITEMS) })
}
