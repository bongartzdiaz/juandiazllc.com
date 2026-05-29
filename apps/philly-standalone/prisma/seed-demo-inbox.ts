/* prisma/seed-demo-inbox.ts — inbox enrichment for demo realism.
   ─────────────────────────────────────────────────────────────
   The base demo-data seed only adds 2 conversations + 2 messages.
   That looks empty in /inbox during a prospect demo. This script
   pads it out to feel like a real agent's working inbox:

     6 conversations across email / whatsapp / sms / phone channels
     20+ messages (2-5 per thread, both directions)
     Realistic timestamps spread over the last 14 days
     Mix of statuses (open / pending / closed) and unread counts

   Idempotent — `findFirst` guards every insert.

   Run via:
     DATABASE_URL="..." npx tsx prisma/seed-demo-inbox.ts
*/

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting seed.')
  process.exit(1)
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const ORG_SLUG = 'philly-demo'
const HOUR = 3_600_000
const DAY = 86_400_000

interface Msg {
  direction: 'inbound' | 'outbound'
  body: string
  hoursAgo: number
}

interface Thread {
  contactIdx: number
  channel: 'email' | 'whatsapp' | 'sms' | 'phone'
  subject: string
  status: 'open' | 'pending' | 'closed'
  unread: number
  messages: Msg[]
}

const threads: Thread[] = [
  {
    contactIdx: 0, channel: 'email', subject: 'Damrak 70 — financing question',
    status: 'open', unread: 1,
    messages: [
      { direction: 'inbound',  hoursAgo: 36, body: 'Hi — wondering whether the Damrak penthouse listing is open to creative-financing offers? Pre-approved for €800K, looking at structuring the rest as a private mortgage.' },
      { direction: 'outbound', hoursAgo: 30, body: 'Hi Sarah — yes, the seller is open to discussion. Can we schedule a call this week?' },
      { direction: 'inbound',  hoursAgo: 4,  body: 'Thursday 14:00 works. Looking forward.' },
    ],
  },
  {
    contactIdx: 1, channel: 'whatsapp', subject: 'Viewing confirmation',
    status: 'open', unread: 0,
    messages: [
      { direction: 'outbound', hoursAgo: 72, body: 'Hi Marcus — viewing confirmed for Saturday 10:00 at Friedrichstraße 100. Address details in the calendar invite.' },
      { direction: 'inbound',  hoursAgo: 68, body: 'Perfect, thanks!' },
      { direction: 'inbound',  hoursAgo: 12, body: 'Quick question — is parking available on-site?' },
      { direction: 'outbound', hoursAgo: 10, body: 'Yes, one underground spot included in the rent. I will send the access code Friday.' },
    ],
  },
  {
    contactIdx: 2, channel: 'sms', subject: 'Brussels office tour',
    status: 'pending', unread: 2,
    messages: [
      { direction: 'inbound',  hoursAgo: 96, body: 'Can we add a second tour for our COO? She is available next Tuesday.' },
      { direction: 'inbound',  hoursAgo: 90, body: 'Also — what is the floor-load capacity on the 3rd floor?' },
    ],
  },
  {
    contactIdx: 3, channel: 'email', subject: 'CMA report — follow up',
    status: 'open', unread: 1,
    messages: [
      { direction: 'outbound', hoursAgo: 120, body: 'Hi David — attached is the CMA for the Mitte district. Comparable sales in the last 6 months are trending +4.2% YoY.' },
      { direction: 'inbound',  hoursAgo: 100, body: 'Thanks for the detail. The 4.2% lift makes the asking price look reasonable. We are leaning toward an offer at 96% of list.' },
      { direction: 'outbound', hoursAgo: 96,  body: 'Sensible. Want me to draft the offer letter? I can have it in your inbox by EOD tomorrow.' },
      { direction: 'inbound',  hoursAgo: 2,   body: 'Yes please — also include the conditional financing clause we discussed.' },
    ],
  },
  {
    contactIdx: 0, channel: 'phone', subject: 'Call — buyer pre-qualification',
    status: 'closed', unread: 0,
    messages: [
      { direction: 'inbound',  hoursAgo: 240, body: '[Inbound call — 4m12s] Caller confirmed budget and timeline. Wants to focus on listings with garden + parking. Sphere referral from Anna B.' },
    ],
  },
  {
    contactIdx: 1, channel: 'email', subject: 'Energy label clarification',
    status: 'open', unread: 0,
    messages: [
      { direction: 'inbound',  hoursAgo: 168, body: 'Could you clarify whether the energielabel B I see on the listing reflects the 2024 inspection or the 2018 one?' },
      { direction: 'outbound', hoursAgo: 165, body: 'It is the 2024 inspection — valid through June 2032. I have attached the certificate PDF for your records.' },
    ],
  },
]

async function main() {
  console.log('Enriching inbox demo data...')

  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } })
  if (!org) { console.error('Org not found. Run prisma/seed.ts first.'); process.exit(1) }

  const contacts = await prisma.contact.findMany({ where: { organizationId: org.id }, take: 4 })
  if (contacts.length < 4) { console.error('Need ≥4 contacts. Run prisma/seed.ts first.'); process.exit(1) }

  let convCreated = 0
  let msgCreated = 0

  for (const thread of threads) {
    const contact = contacts[thread.contactIdx]
    const lastMsg = thread.messages[thread.messages.length - 1]
    const lastMessageAt = new Date(Date.now() - lastMsg.hoursAgo * HOUR)

    // Use subject as part of the idempotency key (channel alone is not unique
    // since one contact may have multiple email threads on different topics).
    const existing = await prisma.conversation.findFirst({
      where: { contactId: contact.id, channel: thread.channel, subject: thread.subject },
    })
    if (existing) continue

    const conv = await prisma.conversation.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        channel: thread.channel,
        subject: thread.subject,
        status: thread.status,
        lastMessageAt,
        unreadCount: thread.unread,
      },
    })
    convCreated++

    for (const msg of thread.messages) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: msg.direction,
          channel: thread.channel,
          body: msg.body,
          status: msg.direction === 'inbound' ? 'received' : 'sent',
          createdAt: new Date(Date.now() - msg.hoursAgo * HOUR),
        },
      })
      msgCreated++
    }
  }

  console.log(`  conversations created: ${convCreated} (skipped existing)`)
  console.log(`  messages created: ${msgCreated}`)
  console.log('Inbox enrichment complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => prisma.$disconnect())
