/* prisma/seed.ts — seed Philly Dashboard with one organization,
   one admin user, and a small set of realistic demo records so the
   dashboard has something to render on first boot.

   Run via:
     npm run seed

   Idempotent: safe to re-run; uses upsert by stable unique keys.
*/

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting seed.')
  process.exit(1)
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const ORG_SLUG = 'philly-demo'
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@philly.local'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123'

async function main() {
  console.log('Seeding Philly Dashboard...')

  // 1. Organization
  const org = await prisma.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {},
    create: {
      name: 'Philly Demo Org',
      slug: ORG_SLUG,
      industry: 'philanthropy',
    },
  })
  console.log(`  org: ${org.name} (${org.id})`)

  // 2. Admin user
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'admin', organizationId: org.id },
    create: {
      email: ADMIN_EMAIL,
      name: 'Admin',
      passwordHash,
      role: 'admin',
      organizationId: org.id,
    },
  })
  // Bundle CP — don't echo the password to stdout. Operator already
  // knows it (they set SEED_ADMIN_PASSWORD); printing it back risks
  // shell-history capture, log shipping, terminal scrollback.
  console.log(`  admin: ${admin.email} / [password set from SEED_ADMIN_PASSWORD env var]`)

  // 3. Sample contacts
  const contactSeed = [
    { name: 'Sarah Johnson', email: 'sarah@greenfuture.org', type: 'partner', company: 'Green Future Foundation' },
    { name: 'Marcus Lee', email: 'marcus@waterworks.io', type: 'donor', company: 'WaterWorks' },
    { name: 'Elena Rodriguez', email: 'elena@community.org', type: 'beneficiary', company: 'Community Network' },
    { name: 'David Kim', email: 'david@solarcoop.com', type: 'stakeholder', company: 'Solar Co-op' },
  ]
  for (const c of contactSeed) {
    await prisma.contact.upsert({
      where: { id: `seed-contact-${c.email}` },
      update: {},
      create: {
        id: `seed-contact-${c.email}`,
        ...c,
        phone: '',
        notes: '',
        organizationId: org.id,
      },
    })
  }
  console.log(`  contacts: ${contactSeed.length}`)

  // 4. Sample projects
  const projectSeed = [
    {
      id: 'seed-proj-clean-water',
      title: 'Clean Water for All',
      description: 'Drill boreholes and install solar pumps in 12 villages.',
      status: 'active',
      category: 'water',
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-12-31'),
      budgetCents: 12_000_000,
      spentCents: 4_500_000,
      sdgGoals: [6, 3],
    },
    {
      id: 'seed-proj-solar-school',
      title: 'Solar for Schools',
      description: 'Off-grid solar arrays for 8 rural schools.',
      status: 'active',
      category: 'energy',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-09-30'),
      budgetCents: 8_500_000,
      spentCents: 2_100_000,
      sdgGoals: [4, 7],
    },
    {
      id: 'seed-proj-reforest',
      title: 'Reforestation Phase II',
      description: 'Plant 50,000 native trees across degraded land.',
      status: 'planned',
      category: 'environment',
      startDate: new Date('2026-05-01'),
      budgetCents: 5_000_000,
      spentCents: 0,
      sdgGoals: [13, 15],
    },
  ]
  for (const p of projectSeed) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        organizationId: org.id,
      },
    })
  }
  console.log(`  projects: ${projectSeed.length}`)

  // 5. Sample impact metrics for the active projects
  const metricSeed = [
    { projectId: 'seed-proj-clean-water', metricType: 'people_helped', value: 2400, unit: 'people' },
    { projectId: 'seed-proj-clean-water', metricType: 'water_liters', value: 1_200_000, unit: 'L' },
    { projectId: 'seed-proj-solar-school', metricType: 'people_helped', value: 1800, unit: 'students' },
    { projectId: 'seed-proj-solar-school', metricType: 'energy_kwh', value: 45_000, unit: 'kWh' },
    { projectId: 'seed-proj-solar-school', metricType: 'co2_kg', value: 18_000, unit: 'kg' },
  ]
  // ImpactMetric has no natural unique key, so we delete & recreate the seed rows
  await prisma.impactMetric.deleteMany({
    where: { projectId: { in: projectSeed.map((p) => p.id) } },
  })
  for (const m of metricSeed) {
    await prisma.impactMetric.create({ data: m })
  }
  console.log(`  impact metrics: ${metricSeed.length}`)

  // 6. Default kanban board with columns
  const board = await prisma.kanbanBoard.upsert({
    where: { id: 'seed-board-main' },
    update: {},
    create: {
      id: 'seed-board-main',
      title: 'Project Pipeline',
      organizationId: org.id,
    },
  })

  const columnSeed = [
    { id: 'seed-col-backlog', title: 'Backlog', position: 0, color: '#94A3B8' },
    { id: 'seed-col-inprogress', title: 'In Progress', position: 1, color: '#3B82F6' },
    { id: 'seed-col-review', title: 'Review', position: 2, color: '#F59E0B' },
    { id: 'seed-col-done', title: 'Done', position: 3, color: '#10B981' },
  ]
  for (const c of columnSeed) {
    await prisma.kanbanColumn.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, boardId: board.id },
    })
  }

  // A few cards
  const cardSeed = [
    {
      id: 'seed-card-1',
      columnId: 'seed-col-inprogress',
      title: 'Drill borehole #4 (Kibwezi)',
      description: 'Schedule drilling crew and confirm depth survey.',
      position: 0,
      priority: 'high',
      projectId: 'seed-proj-clean-water',
    },
    {
      id: 'seed-card-2',
      columnId: 'seed-col-backlog',
      title: 'Order solar panels (Solar for Schools)',
      description: '40x 450W panels, 2 inverters.',
      position: 0,
      priority: 'medium',
      projectId: 'seed-proj-solar-school',
    },
    {
      id: 'seed-card-3',
      columnId: 'seed-col-review',
      title: 'Q1 impact report draft',
      description: 'Compile metrics from clean water + solar.',
      position: 0,
      priority: 'medium',
    },
  ]
  for (const c of cardSeed) {
    await prisma.kanbanCard.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    })
  }
  console.log(`  kanban: ${columnSeed.length} columns / ${cardSeed.length} cards`)

  // 7. Default deal pipeline (enables /deals and the Kanban deals board)
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'seed-pipeline-default' },
    update: {},
    create: {
      id: 'seed-pipeline-default',
      organizationId: org.id,
      name: 'Sales Pipeline',
      industry: 'general',
    },
  })

  const stageSeed = [
    { id: 'seed-stage-new',          name: 'New Lead',    position: 0, color: '#94A3B8' },
    { id: 'seed-stage-qualified',    name: 'Qualified',   position: 1, color: '#3B82F6' },
    { id: 'seed-stage-proposal',     name: 'Proposal',    position: 2, color: '#F59E0B' },
    { id: 'seed-stage-negotiation',  name: 'Negotiation', position: 3, color: '#8B5CF6' },
    { id: 'seed-stage-closed-won',   name: 'Closed Won',  position: 4, color: '#10B981' },
    { id: 'seed-stage-closed-lost',  name: 'Closed Lost', position: 5, color: '#EF4444' },
  ]
  for (const s of stageSeed) {
    await prisma.pipelineStage.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, pipelineId: pipeline.id },
    })
  }
  console.log(`  pipeline: 1 pipeline, ${stageSeed.length} stages`)

  // 8. A couple of sample deals so the /deals board isn't empty
  const dealSeed = [
    {
      id: 'seed-deal-greenfuture',
      title: 'Green Future Foundation — Water Grant',
      pipelineId: pipeline.id,
      stageId: 'seed-stage-qualified',
      contactId: 'seed-contact-sarah@greenfuture.org',
      ownerId: admin.id,
      valueCents: 7_500_000,
      probability: 60,
      status: 'open',
      dealType: 'grant',
      expectedClose: new Date(Date.now() + 60 * 86400_000),
      notes: 'Initial contact made. Proposal requested.',
    },
    {
      id: 'seed-deal-solarcoop',
      title: 'Solar Co-op — School Installation Partnership',
      pipelineId: pipeline.id,
      stageId: 'seed-stage-proposal',
      contactId: 'seed-contact-david@solarcoop.com',
      ownerId: admin.id,
      valueCents: 4_200_000,
      probability: 45,
      status: 'open',
      dealType: 'partnership',
      expectedClose: new Date(Date.now() + 90 * 86400_000),
      notes: 'Draft SOW in review.',
    },
  ]
  for (const d of dealSeed) {
    await prisma.deal.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    })
  }
  console.log(`  deals: ${dealSeed.length}`)

  // 9. Default SOI categories (so /soi has something useful out of the box)
  const soiSeed = [
    { id: 'seed-soi-close',  name: 'Close Friends & Family', touchFrequency: 14, color: '#EF4444' },
    { id: 'seed-soi-active', name: 'Active Clients',         touchFrequency: 30, color: '#F59E0B' },
    { id: 'seed-soi-past',   name: 'Past Clients',           touchFrequency: 90, color: '#3B82F6' },
    { id: 'seed-soi-sphere', name: 'Sphere of Influence',    touchFrequency: 60, color: '#8B5CF6' },
  ]
  for (const c of soiSeed) {
    await prisma.soiCategory.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, organizationId: org.id },
    })
  }
  console.log(`  SOI categories: ${soiSeed.length}`)

  // 10. A starter welcome notification for the admin
  await prisma.notification.upsert({
    where: { id: 'seed-notif-welcome' },
    update: {},
    create: {
      id: 'seed-notif-welcome',
      organizationId: org.id,
      userId: admin.id,
      type: 'info',
      title: 'Welcome to Philly Dashboard',
      message: 'Your CRM is ready. Explore /contacts, /deals, /projects — or jump to /settings/pipelines to configure stages.',
      read: false,
    },
  })
  console.log(`  notifications: welcome message`)

  console.log('\nSeed complete.')
  console.log(`\nLogin:  ${ADMIN_EMAIL}`)
  console.log(`Pass:   [as set in SEED_ADMIN_PASSWORD env var]\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
