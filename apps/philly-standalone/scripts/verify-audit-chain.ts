#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   AuditLog hash-chain integrity verifier — CLI entrypoint
   ---------------------------------------------------------------
   Walks every Organization's hash-chained audit log and reports:

     - totalRows / hashedRows / unhashedRows
     - broken[]: stored hash != recomputed hash → tampering
     - forked[]: prevHash points to a row that no longer exists →
       deletion of a predecessor (suspicious) or concurrent fork

   Production usage:
     npm run audit:chain                    # all orgs, stdout summary
     npm run audit:chain -- --org=<orgId>   # single org
     npm run audit:chain -- --json          # JSON for CI/cron

   Exit codes:
     0  every chain verifies clean
     1  one or more chains have broken[] entries
     2  Prisma not connectable / unexpected error

   Designed to be safe to schedule daily via Vercel Cron or any
   plain cron runner — read-only, idempotent, no mutations.
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import { verifyAuditChain, type VerifyReport } from '../lib/philly/audit-verify'
import { sendAlert } from '../lib/philly/alerts'

interface Args {
  org: string | null
  json: boolean
}

function parseArgs(argv: string[]): Args {
  let org: string | null = null
  let json = false
  for (const a of argv.slice(2)) {
    if (a === '--json') json = true
    else if (a.startsWith('--org=')) org = a.slice('--org='.length)
  }
  return { org, json }
}

async function main(): Promise<number> {
  const { org, json } = parseArgs(process.argv)
  const prisma = new PrismaClient()

  try {
    const targets: Array<{ id: string; name: string }> = org
      ? (await prisma.organization.findMany({
          where: { id: org },
          select: { id: true, name: true },
        }))
      : (await prisma.organization.findMany({
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        }))

    if (targets.length === 0) {
      console.error(org ? `audit:chain: no organization with id=${org}` : 'audit:chain: no organizations')
      return org ? 2 : 0
    }

    const reports: Array<VerifyReport & { name: string }> = []
    for (const t of targets) {
      const r = await verifyAuditChain(prisma, t.id)
      reports.push({ ...r, name: t.name })
    }

    if (json) {
      process.stdout.write(JSON.stringify(reports, null, 2) + '\n')
    } else {
      let dirty = 0
      for (const r of reports) {
        const status = r.ok ? 'clean' : `BROKEN (${r.broken.length})`
        const fork = r.forked.length ? ` forked=${r.forked.length}` : ''
        console.log(
          `[${r.ok ? '✓' : '✗'}] ${r.name} (${r.organizationId.slice(0, 8)}…) ` +
          `rows=${r.totalRows} hashed=${r.hashedRows} unhashed=${r.unhashedRows}${fork} → ${status}`,
        )
        if (!r.ok) dirty += 1
      }
      const summary = dirty === 0
        ? `audit:chain: ${reports.length} org${reports.length === 1 ? '' : 's'} verified clean`
        : `audit:chain: ${dirty} of ${reports.length} org${reports.length === 1 ? '' : 's'} have broken chains`
      console.log(summary)
    }

    const cleanAll = reports.every(r => r.ok)
    if (!cleanAll) {
      // Audit-chain integrity is a high-severity event. Page on-call
      // unconditionally — never let a tamper signal sit silent.
      const broken = reports.filter(r => !r.ok)
      const totalBroken = broken.reduce((s, r) => s + r.broken.length, 0)
      const totalForked = broken.reduce((s, r) => s + r.forked.length, 0)
      await sendAlert({
        severity: 'critical',
        source: 'audit-chain',
        title: `AuditLog integrity check FAILED on ${broken.length} org${broken.length === 1 ? '' : 's'}`,
        body:
          'Hash-chain mismatch detected — possible tampering or replication drift. ' +
          'Run `npm run audit:chain -- --json` for full report.',
        fields: {
          orgs_total: reports.length,
          orgs_broken: broken.length,
          rows_broken: totalBroken,
          rows_forked: totalForked,
          first_org: broken[0]?.name ?? '—',
        },
      })
    }

    return cleanAll ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('audit:chain: unexpected error', err)
    process.exit(2)
  })
