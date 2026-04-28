#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Online PII key rotation (Bundle Q)
   ---------------------------------------------------------------
   Re-encrypts every Contact.notes row that's currently sealed
   under a non-primary key, using the current primary key. Designed
   to run during phase 2 of an online rotation:

     phase 1:  set INTEGRATION_SECRET=<NEW>, INTEGRATION_SECRET_V2=<OLD>
     phase 2:  npm run pii:rotate                  ← this script
     phase 3:  unset INTEGRATION_SECRET_V2 once 100% migrated

   Usage:
     npm run pii:rotate                 # all orgs, batches of 200
     npm run pii:rotate -- --org=<id>   # one tenant only
     npm run pii:rotate -- --dry        # report counts, no writes
     npm run pii:rotate -- --batch=500  # tune batch size

   Idempotent: rows already encrypted under the primary key (keyIndex
   0) are skipped. Per-row errors do not abort the run — surfaced at
   the end. Exit codes:

     0 — every non-primary row re-encrypted (or dry-run completed)
     1 — at least one row failed
     2 — only one key configured (nothing to rotate from)
     3 — transient error
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import {
  encryptSecret,
  decryptSecretDetailed,
  configuredKeyCount,
} from '../lib/philly/crypto'
import { isEncryptedPii } from '../lib/philly/pii'

const PII_PREFIX = 'enc:v1:'

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

  const keyCount = configuredKeyCount()
  if (keyCount < 2) {
    console.error(
      `pii:rotate: only ${keyCount} key configured — nothing to rotate from. ` +
        `Set INTEGRATION_SECRET_V2 to your previous key before running.`,
    )
    return 2
  }
  console.log(`pii:rotate: ${keyCount} keys configured (primary=0, rotating-from=1..${keyCount - 1})`)

  const prisma = new PrismaClient()

  let scanned = 0
  let alreadyPrimary = 0
  let rotated = 0
  let nullSkipped = 0
  let plaintextSkipped = 0
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
        if (!isEncryptedPii(row.notes)) {
          // Legacy plaintext — leave it for `npm run pii:backfill`,
          // not this rotate script's job.
          plaintextSkipped += 1
          continue
        }
        const inner = row.notes.slice(PII_PREFIX.length)
        const result = decryptSecretDetailed(inner)
        if (result.plaintext == null || result.keyIndex < 0) {
          errors.push({ id: row.id, err: 'decrypt failed under every configured key' })
          continue
        }
        if (result.keyIndex === 0) {
          alreadyPrimary += 1
          continue
        }
        // Re-encrypt under the primary key.
        const reCt = encryptSecret(result.plaintext)
        if (!reCt) {
          errors.push({ id: row.id, err: 'encryptSecret returned null' })
          continue
        }
        if (dry) {
          rotated += 1
          continue
        }
        try {
          await prisma.contact.update({
            where: { id: row.id },
            data: { notes: `${PII_PREFIX}${reCt}` },
          })
          rotated += 1
        } catch (err) {
          errors.push({ id: row.id, err: err instanceof Error ? err.message : String(err) })
        }
      }

      cursor = rows[rows.length - 1].id
      console.log(
        `pii:rotate: progress scanned=${scanned} rotated=${rotated} ` +
          `already=${alreadyPrimary} plaintext=${plaintextSkipped} ` +
          `null=${nullSkipped} errors=${errors.length}`,
      )
    }

    const summary = dry
      ? `pii:rotate: DRY RUN — would re-encrypt ${rotated} rows under the primary key ` +
        `(already-primary: ${alreadyPrimary}, legacy plaintext: ${plaintextSkipped}, null: ${nullSkipped}, errors: ${errors.length})`
      : `pii:rotate: re-encrypted ${rotated} rows under the primary key ` +
        `(already-primary: ${alreadyPrimary}, legacy plaintext: ${plaintextSkipped}, null: ${nullSkipped}, errors: ${errors.length})`
    console.log(summary)

    if (errors.length > 0) {
      console.error('pii:rotate: errors:')
      for (const e of errors.slice(0, 50)) console.error(`  ${e.id}: ${e.err}`)
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
    console.error('pii:rotate: unexpected error', err)
    process.exit(3)
  })
