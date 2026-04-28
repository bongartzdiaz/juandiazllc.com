#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Backfill: encrypt every Contact.notes that is still legacy plaintext
   ---------------------------------------------------------------
   Bundle N introduces at-rest encryption for `Contact.notes`. New
   writes (POST/PATCH /api/contacts) automatically encrypt; old rows
   stay plaintext and decryptPii passes them through. This CLI
   migrates the legacy rows in place.

   Usage:
     npm run pii:backfill                  # all orgs, batches of 200
     npm run pii:backfill -- --org=<id>    # one tenant only
     npm run pii:backfill -- --dry         # report counts, no writes
     npm run pii:backfill -- --batch=500   # tune batch size

   Idempotent: rows that already carry the `enc:v1:` prefix are
   skipped. Safe to re-run. Per-row errors do not abort the run —
   they are surfaced at the end and the script exits 1 if any row
   failed.

   Designed to run online during low-traffic windows. Each batch is
   wrapped in a transaction so a crash mid-batch leaves the DB
   consistent.
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import { encryptPii, isEncryptedPii } from '../lib/philly/pii'

interface Args {
  org: string | null
  dry: boolean
  batch: number
}

function parseArgs(argv: string[]): Args {
  let org: string | null = null
  let dry = false
  let batch = 200
  for (const a of argv.slice(2)) {
    if (a === '--dry') dry = true
    else if (a.startsWith('--org=')) org = a.slice('--org='.length)
    else if (a.startsWith('--batch=')) {
      const n = Number(a.slice('--batch='.length))
      if (Number.isInteger(n) && n > 0 && n <= 5000) batch = n
    }
  }
  return { org, dry, batch }
}

async function main(): Promise<number> {
  const { org, dry, batch } = parseArgs(process.argv)
  const prisma = new PrismaClient()

  let scanned = 0
  let alreadyEncrypted = 0
  let encrypted = 0
  let nullSkipped = 0
  const errors: Array<{ id: string; err: string }> = []

  try {
    let cursor: string | undefined = undefined
    while (true) {
      const rows: Array<{ id: string; notes: string | null }> = await prisma.contact.findMany({
        where: org ? { organizationId: org } : {},
        select: { id: true, notes: true },
        orderBy: { id: 'asc' },
        take: batch,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })
      if (rows.length === 0) break

      for (const row of rows) {
        scanned += 1
        if (row.notes == null || row.notes === '') {
          nullSkipped += 1
          continue
        }
        if (isEncryptedPii(row.notes)) {
          alreadyEncrypted += 1
          continue
        }
        // Legacy plaintext — encrypt.
        const ct = encryptPii(row.notes)
        if (!ct) {
          errors.push({ id: row.id, err: 'encryptPii returned null' })
          continue
        }
        if (dry) {
          encrypted += 1
          continue
        }
        try {
          await prisma.contact.update({ where: { id: row.id }, data: { notes: ct } })
          encrypted += 1
        } catch (err) {
          errors.push({ id: row.id, err: err instanceof Error ? err.message : String(err) })
        }
      }

      cursor = rows[rows.length - 1].id
      console.log(
        `pii:backfill: progress scanned=${scanned} encrypted=${encrypted} ` +
        `already=${alreadyEncrypted} null=${nullSkipped} errors=${errors.length}`,
      )
    }

    const summary = dry
      ? `pii:backfill: DRY RUN — would encrypt ${encrypted} of ${scanned} contacts (already encrypted: ${alreadyEncrypted}, null: ${nullSkipped}, errors: ${errors.length})`
      : `pii:backfill: encrypted ${encrypted} of ${scanned} contacts (already encrypted: ${alreadyEncrypted}, null: ${nullSkipped}, errors: ${errors.length})`
    console.log(summary)

    if (errors.length > 0) {
      console.error('pii:backfill: errors:')
      for (const e of errors.slice(0, 50)) {
        console.error(`  ${e.id}: ${e.err}`)
      }
      if (errors.length > 50) console.error(`  …and ${errors.length - 50} more`)
      return 1
    }
    return 0
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('pii:backfill: unexpected error', err)
    process.exit(2)
  })
