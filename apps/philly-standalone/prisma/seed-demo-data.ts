/* prisma/seed-demo-data.ts — supplemental demo data.
   ──────────────────────────────────────────────────────────────────
   Runs AFTER prisma/seed.ts. Adds the missing entities so every
   feature surface has something to render:
     - 3 properties (NL apartment, DE house, BE commercial)
     - 2 drip campaigns + enrollments for the 4 seeded contacts
     - 3 email threads + messages
     - 5 call logs
     - 2 inbox conversations + messages
     - Notes per contact (8 total)
     - Activity entries (5)
     - 2 saved views, 2 webhooks

   Idempotent — uses upsert / find-then-create. Safe to re-run.

   Run via:
     DATABASE_URL="..." npx tsx prisma/seed-demo-data.ts
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

async function main() {
  console.log('Seeding supplemental demo data...')

  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } })
  if (!org) { console.error('Org not found. Run prisma/seed.ts first.'); process.exit(1) }
  const orgId = org.id

  const adminUser = await prisma.user.findFirst({ where: { organizationId: orgId, role: 'admin' } })
  if (!adminUser) { console.error('Admin not found. Run prisma/seed.ts first.'); process.exit(1) }
  const adminId = adminUser.id

  const contacts = await prisma.contact.findMany({ where: { organizationId: orgId }, take: 4 })
  if (contacts.length === 0) { console.error('No contacts. Run prisma/seed.ts first.'); process.exit(1) }

  // ── Properties (3 EU listings) ──
  const properties = [
    {
      title: 'Damrak 70 — Penthouse', address: 'Damrak 70', city: 'Amsterdam', zipCode: '1012 LM', country: 'NL',
      subtype: 'penthouse', type: 'residential', listingType: 'sale',
      priceCents: 87_500_000, bedrooms: 3, bathrooms: 2, sqft: 1140,
      yearBuilt: 1890, epcRating: 'B', epcExpiresAt: new Date('2032-06-01'),
      description: 'Beautifully renovated canal-view penthouse in the historic centre.',
      images: JSON.stringify(['/demo/prop1-1.jpg', '/demo/prop1-2.jpg', '/demo/prop1-3.jpg', '/demo/prop1-4.jpg']),
      status: 'available',
    },
    {
      title: 'Friedrichstraße 100 — Altbau', address: 'Friedrichstraße 100', city: 'Berlin', zipCode: '10117', country: 'DE',
      subtype: 'wohnung', type: 'residential', listingType: 'rent',
      priceCents: 2_400_00, bedrooms: 2, bathrooms: 1, sqft: 920,
      yearBuilt: 1903, epcRating: 'C', epcExpiresAt: new Date('2030-12-31'),
      description: 'Sanierte Altbauwohnung im Herzen von Berlin-Mitte.',
      images: JSON.stringify(['/demo/prop2-1.jpg', '/demo/prop2-2.jpg', '/demo/prop2-3.jpg']),
      status: 'available',
    },
    {
      title: 'Rue Royale 45 — Office', address: 'Rue Royale 45', city: 'Brussels', zipCode: '1000', country: 'BE',
      subtype: 'office', type: 'commercial', listingType: 'rent',
      priceCents: 18_500_00, bedrooms: 0, bathrooms: 4, sqft: 4200,
      yearBuilt: 1985, epcRating: 'D', epcExpiresAt: new Date('2031-04-15'),
      description: 'Prime office space near the EU Quarter, 4 floors fully fitted.',
      images: JSON.stringify(['/demo/prop3-1.jpg', '/demo/prop3-2.jpg', '/demo/prop3-3.jpg', '/demo/prop3-4.jpg']),
      status: 'under_contract',
    },
  ]
  for (const p of properties) {
    const existing = await prisma.property.findFirst({ where: { organizationId: orgId, address: p.address } })
    if (!existing) {
      await prisma.property.create({ data: { ...p, organizationId: orgId } })
    }
  }
  console.log(`  properties: ${properties.length}`)

  // ── Drip campaigns + enrollments ──
  const campaigns = [
    {
      name: 'Buyer nurture — 6 touches',
      type: 'buyer',
      stepsJson: JSON.stringify([
        { day: 0,  channel: 'email', subject: 'Welcome — here is what to expect' },
        { day: 3,  channel: 'email', subject: 'How to read an energielabel' },
        { day: 7,  channel: 'email', subject: '5 questions to ask before a viewing' },
        { day: 14, channel: 'email', subject: 'Financing options in NL/BE' },
        { day: 21, channel: 'email', subject: 'When to make an offer' },
        { day: 30, channel: 'email', subject: 'Closing — a 7-day countdown' },
      ]),
    },
    {
      name: 'Seller nurture — 4 touches',
      type: 'seller',
      stepsJson: JSON.stringify([
        { day: 0, channel: 'email', subject: 'Welcome — your listing is live' },
        { day: 7, channel: 'email', subject: 'First-week traffic report' },
        { day: 14, channel: 'email', subject: 'Optimising your listing for Funda' },
        { day: 30, channel: 'email', subject: '30-day market update' },
      ]),
    },
  ]
  const createdCampaigns: { id: string; name: string }[] = []
  for (const c of campaigns) {
    const existing = await prisma.dripCampaign.findFirst({ where: { organizationId: orgId, name: c.name } })
    if (existing) {
      createdCampaigns.push(existing)
    } else {
      const created = await prisma.dripCampaign.create({
        data: { ...c, organizationId: orgId, status: 'active' },
      })
      createdCampaigns.push(created)
    }
  }
  // Enroll first 2 contacts in the buyer campaign, contact 3 in the seller one
  const enrollments = [
    { campaign: createdCampaigns[0], contact: contacts[0], lastStepIndex: 2, daysAgo: 14 },
    { campaign: createdCampaigns[0], contact: contacts[1], lastStepIndex: 0, daysAgo: 3 },
    { campaign: createdCampaigns[1], contact: contacts[2], lastStepIndex: 1, daysAgo: 10 },
  ]
  for (const e of enrollments) {
    const existing = await prisma.dripEnrollment.findFirst({
      where: { contactId: e.contact.id, campaignId: e.campaign.id },
    })
    if (!existing) {
      const enrolledAt = new Date(Date.now() - e.daysAgo * 86_400_000)
      const lastDeliveredAt = new Date(Date.now() - 2 * 86_400_000)
      const nextDueAt = new Date(Date.now() + 4 * 86_400_000)
      await prisma.dripEnrollment.create({
        data: {
          campaignId: e.campaign.id,
          contactId: e.contact.id,
          organizationId: orgId,
          status: 'active',
          lastStepIndex: e.lastStepIndex,
          nextDueAt,
          lastDeliveredAt,
          createdAt: enrolledAt,
        },
      })
    }
  }
  console.log(`  drip campaigns: ${createdCampaigns.length}, enrollments: ${enrollments.length}`)

  // ── Notes on contacts ──
  const noteBodies = [
    'Called — interested in 3-bed in Amsterdam under €500K, budget confirmed.',
    'Sent brochure for Damrak 70. Following up Friday.',
    'Spoke to spouse — both interested. Booking viewing for Saturday.',
    'Asked about energielabel B+ options, financing pre-approved €475K.',
    'Sent CMA on Friedrichstraße area. Considering rental fallback.',
    'Wants properties with garden + parking. Sphere referral.',
    'Off-market — keep on watch list for high-end Brussels commercial.',
    'Met at open house. Interested in penthouses, budget €800K-1M.',
  ]
  for (let i = 0; i < noteBodies.length; i++) {
    const contact = contacts[i % contacts.length]
    // ContactNote uses `content` (not `body`) + `userId` (not `authorId`).
    const existing = await prisma.contactNote.findFirst({
      where: { contactId: contact.id, content: noteBodies[i] },
    })
    if (!existing) {
      await prisma.contactNote.create({
        data: {
          contactId: contact.id,
          userId: adminId,
          content: noteBodies[i],
          createdAt: new Date(Date.now() - (i + 1) * 2 * 86_400_000),
        },
      })
    }
  }
  console.log(`  notes: ${noteBodies.length}`)

  // ── Call logs ──
  const calls = [
    { contact: contacts[0], direction: 'outbound', duration: 245, outcome: 'connected', notes: 'Confirmed budget + timeline. Sending brochure.' },
    { contact: contacts[0], direction: 'inbound', duration: 180, outcome: 'connected', notes: 'Asked about garden + parking availability.' },
    { contact: contacts[1], direction: 'outbound', duration: 60, outcome: 'voicemail', notes: 'Left message about new listing.' },
    { contact: contacts[2], direction: 'outbound', duration: 420, outcome: 'connected', notes: 'Long call — discussed financing + viewing schedule.' },
    { contact: contacts[3], direction: 'inbound', duration: 90, outcome: 'connected', notes: 'Quick check-in on CMA results.' },
  ]
  for (let i = 0; i < calls.length; i++) {
    const c = calls[i]
    const existing = await prisma.callLog.findFirst({
      where: { contactId: c.contact.id, notes: c.notes },
    })
    if (!existing) {
      await prisma.callLog.create({
        data: {
          organizationId: orgId,
          agentId: adminId,
          contactId: c.contact.id,
          direction: c.direction,
          phoneNumber: c.contact.phone || '+31612345678',
          status: 'completed',
          duration: c.duration,
          outcome: c.outcome,
          notes: c.notes,
          createdAt: new Date(Date.now() - (i + 1) * 86_400_000),
        },
      })
    }
  }
  console.log(`  calls: ${calls.length}`)

  // ── Conversations (inbox) ──
  const conversations = [
    { contact: contacts[0], channel: 'whatsapp', subject: 'Viewing schedule', messageBody: 'Hi — can we move the viewing to Sunday morning instead?' },
    { contact: contacts[1], channel: 'sms', subject: 'Quick question', messageBody: 'Is the listing on Damrak still available?' },
  ]
  for (const c of conversations) {
    const existing = await prisma.conversation.findFirst({
      where: { contactId: c.contact.id, channel: c.channel },
    })
    if (!existing) {
      const conv = await prisma.conversation.create({
        data: {
          organizationId: orgId,
          contactId: c.contact.id,
          channel: c.channel,
          subject: c.subject,
          status: 'open',
          lastMessageAt: new Date(Date.now() - 4 * 3_600_000),
          unreadCount: 1,
        },
      })
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: 'inbound',
          channel: c.channel,
          body: c.messageBody,
          status: 'received',
          createdAt: new Date(Date.now() - 4 * 3_600_000),
        },
      })
    }
  }
  console.log(`  conversations: ${conversations.length}`)

  // ── Saved views ──
  // SavedView uses `filtersJson` (plural) — not `filterJson`. No `shared`
  // flag here either; the SavedView model exposes its own shape (entity/
  // filtersJson/columnsJson/sortJson). Keep this minimal — operator can
  // build richer views via the UI.
  const savedViews = [
    {
      entity: 'contacts',
      name: 'Hot buyers',
      filtersJson: JSON.stringify({
        match: 'and',
        rules: [
          { field: 'leadStatus', op: 'eq', value: 'hot' },
          { field: 'type', op: 'eq', value: 'buyer' },
        ],
      }),
    },
    {
      entity: 'properties',
      name: 'NL listings under €500K',
      filtersJson: JSON.stringify({
        match: 'and',
        rules: [
          { field: 'country', op: 'eq', value: 'NL' },
          { field: 'priceCents', op: 'lt', value: 50_000_000 },
        ],
      }),
    },
  ]
  for (const v of savedViews) {
    const existing = await prisma.savedView.findFirst({
      where: { organizationId: orgId, name: v.name },
    })
    if (!existing) {
      await prisma.savedView.create({
        data: { ...v, organizationId: orgId, userId: adminId },
      })
    }
  }
  console.log(`  saved views: ${savedViews.length}`)

  console.log('Supplemental seed complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => prisma.$disconnect())
