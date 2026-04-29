#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Backfill: encrypt every ContactNote.content still in plaintext
   ---------------------------------------------------------------
   ContactNote.content is the operator-authored note attached to a
   Contact (separate row in the ContactNote table — not the same as
   Contact.notes which Bundle N already covered). New writes
   (POST /api/contacts/[id]/notes) auto-encrypt; legacy rows stay
   plaintext and decryptPii passes them through during reads. This
   CLI migrates the legacy rows in place.

   Usage:
     npm run pii:backfill-notes                  # all orgs, batch=200
     npm run pii:backfill-notes -- --org=<id>    # restrict to one org
     npm run pii:backfill-notes -- --dry         # report only
     npm run pii:backfill-notes -- --batch=500   # tune batch size

   Idempotent: rows already prefixed with `enc:v1:` are skipped.
   Per-row errors are collected and surfaced at the end; exit 1 if
   any row fails. Designed for online execution.
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
      // ContactNote → Contact → Organization is the only path to
      // scope by org, so use a relational filter when --org is set.
      const where = org ? { contact: { organizationId: org } } : {}
      const rows: Array<{ id: string; content: string | null }> = await prisma.contactNote.findMany({
        where,
        select: { id: true, content: true },
        orderBy: { id: 'asc' },
        take: batch,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })
      if (rows.length === 0) break

      for (const row of rows) {
        scanned += 1
        if (row.content == null || row.content === '') {
          nullSkipped += 1
          continue
        }
        if (isEncryptedPii(row.content)) {
          alreadyEncrypted += 1
          continue
        }
        const ct = encryptPii(row.content)
        if (!ct) {
          errors.push({ id: row.id, err: 'encryptPii returned null' })
          continue
        }
        if (dry) {
          encrypted += 1
          continue
        }
        try {
          await prisma.contactNote.update({ where: { id: row.id }, data: { content: ct } })
          encrypted += 1
        } catch (err) {
          errors.push({ id: row.id, err: err instanceof Error ? err.message : String(err) })
        }
      }

      cursor = rows[rows.length - 1].id
      console.log(
        `pii:backfill-notes: progress scanned=${scanned} encrypted=${encrypted} ` +
        `already=${alreadyEncrypted} null=${nullSkipped} errors=${errors.length}`,
      )
    }

    const summary = dry
      ? `pii:backfill-notes: DRY RUN — would encrypt ${encrypted} of ${scanned} notes (already encrypted: ${alreadyEncrypted}, null: ${nullSkipped}, errors: ${errors.length})`
      : `pii:backfill-notes: encrypted ${encrypted} of ${scanned} notes (already encrypted: ${alreadyEncrypted}, null: ${nullSkipped}, errors: ${errors.length})`
    console.log(summary)

    if (errors.length > 0) {
      console.error('pii:backfill-notes: errors:')
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
    console.error('pii:backfill-notes: unexpected error', err)
    process.exit(2)
  })
