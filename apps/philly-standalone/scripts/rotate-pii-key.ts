#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Online PII key rotation (Bundle Q + U)
   ---------------------------------------------------------------
   Re-encrypts every encrypted PII column (Contact.notes,
   ContactNote.content) that's currently sealed under a non-primary
   key, using the current primary key. Designed to run during phase 2
   of an online rotation:

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

interface Stats {
  scanned: number
  alreadyPrimary: number
  rotated: number
  nullSkipped: number
  plaintextSkipped: number
  errors: Array<{ id: string; err: string }>
}

interface TableSpec {
  label: string
  // Stream rows in id-order for cursor-based pagination.
  fetchPage: (
    cursor: string | undefined,
    take: number,
  ) => Promise<Array<{ id: string; cipher: string | null }>>
  // Persist a re-encrypted row.
  updateRow: (id: string, cipher: string) => Promise<void>
}

async function rotateTable(spec: TableSpec, batch: number, dry: boolean): Promise<Stats> {
  const stats: Stats = {
    scanned: 0,
    alreadyPrimary: 0,
    rotated: 0,
    nullSkipped: 0,
    plaintextSkipped: 0,
    errors: [],
  }

  let cursor: string | undefined = undefined
  while (true) {
    const rows = await spec.fetchPage(cursor, batch)
    if (rows.length === 0) break

    for (const row of rows) {
      stats.scanned += 1
      if (row.cipher == null || row.cipher === '') {
        stats.nullSkipped += 1
        continue
      }
      if (!isEncryptedPii(row.cipher)) {
        // Legacy plaintext — leave it for `npm run pii:backfill*`.
        stats.plaintextSkipped += 1
        continue
      }
      const inner = row.cipher.slice(PII_PREFIX.length)
      const result = decryptSecretDetailed(inner)
      if (result.plaintext == null || result.keyIndex < 0) {
        stats.errors.push({ id: row.id, err: 'decrypt failed under every configured key' })
        continue
      }
      if (result.keyIndex === 0) {
        stats.alreadyPrimary += 1
        continue
      }
      const reCt = encryptSecret(result.plaintext)
      if (!reCt) {
        stats.errors.push({ id: row.id, err: 'encryptSecret returned null' })
        continue
      }
      if (dry) {
        stats.rotated += 1
        continue
      }
      try {
        await spec.updateRow(row.id, `${PII_PREFIX}${reCt}`)
        stats.rotated += 1
      } catch (err) {
        stats.errors.push({ id: row.id, err: err instanceof Error ? err.message : String(err) })
      }
    }

    cursor = rows[rows.length - 1].id
    console.log(
      `pii:rotate[${spec.label}]: scanned=${stats.scanned} rotated=${stats.rotated} ` +
        `already=${stats.alreadyPrimary} plaintext=${stats.plaintextSkipped} ` +
        `null=${stats.nullSkipped} errors=${stats.errors.length}`,
    )
  }
  return stats
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

  try {
    const contactSpec: TableSpec = {
      label: 'Contact.notes',
      fetchPage: async (cursor, take) => {
        const rows = await prisma.contact.findMany({
          where: org ? { organizationId: org } : {},
          select: { id: true, notes: true },
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        })
        return rows.map((r) => ({ id: r.id, cipher: r.notes }))
      },
      updateRow: async (id, cipher) => {
        await prisma.contact.update({ where: { id }, data: { notes: cipher } })
      },
    }
    const noteSpec: TableSpec = {
      label: 'ContactNote.content',
      fetchPage: async (cursor, take) => {
        const rows = await prisma.contactNote.findMany({
          where: org ? { contact: { organizationId: org } } : {},
          select: { id: true, content: true },
          orderBy: { id: 'asc' },
          take,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        })
        return rows.map((r) => ({ id: r.id, cipher: r.content }))
      },
      updateRow: async (id, cipher) => {
        await prisma.contactNote.update({ where: { id }, data: { content: cipher } })
      },
    }

    const contact = await rotateTable(contactSpec, batch, dry)
    const note = await rotateTable(noteSpec, batch, dry)

    const totalErrors = contact.errors.length + note.errors.length
    const summary = dry
      ? `pii:rotate: DRY RUN — would re-encrypt ${contact.rotated} Contact.notes + ${note.rotated} ContactNote.content rows`
      : `pii:rotate: re-encrypted ${contact.rotated} Contact.notes + ${note.rotated} ContactNote.content rows`
    console.log(summary)

    if (totalErrors > 0) {
      console.error('pii:rotate: errors:')
      for (const e of [...contact.errors, ...note.errors].slice(0, 50)) {
        console.error(`  ${e.id}: ${e.err}`)
      }
      if (totalErrors > 50) console.error(`  …and ${totalErrors - 50} more`)
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
