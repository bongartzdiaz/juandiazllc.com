#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Backfill: encrypt Contact.email + Contact.phone, populate hashes
   ---------------------------------------------------------------
   Bundle P introduces blind-index search for Contact.email and
   Contact.phone. New writes (POST/PATCH) automatically encrypt the
   value and populate emailHash/phoneHash. This CLI migrates the
   legacy rows.

   Usage:
     npm run pii:backfill-hashes                  # all orgs
     npm run pii:backfill-hashes -- --org=<id>    # one tenant only
     npm run pii:backfill-hashes -- --dry         # report counts, no writes
     npm run pii:backfill-hashes -- --batch=500   # tune batch size

   Idempotent: rows where email is already encrypted AND emailHash
   is set are skipped. Per-row errors do not abort. Exit codes:

     0 — clean run (or dry-run)
     1 — at least one row failed
     2 — BLIND_INDEX_SECRET is not configured (cannot compute hashes)
     3 — transient error
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import { encryptPii, isEncryptedPii } from '../lib/philly/pii'
import { hashEmail, hashPhone } from '../lib/philly/blind-index'

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

  if (!process.env.BLIND_INDEX_SECRET) {
    console.error('pii:backfill-hashes: BLIND_INDEX_SECRET is not set — refusing to run')
    return 2
  }

  const prisma = new PrismaClient()

  let scanned = 0
  let alreadyMigrated = 0
  let migrated = 0
  let skippedNoValues = 0
  const errors: Array<{ id: string; err: string }> = []

  try {
    let cursor: string | undefined = undefined
    while (true) {
      const rows: Array<{
        id: string
        email: string | null
        phone: string | null
        emailHash: string | null
        phoneHash: string | null
      }> = await prisma.contact.findMany({
        where: org ? { organizationId: org } : {},
        select: { id: true, email: true, phone: true, emailHash: true, phoneHash: true },
        orderBy: { id: 'asc' },
        take: batch,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })
      if (rows.length === 0) break

      for (const row of rows) {
        scanned += 1
        const emailIsEnc = isEncryptedPii(row.email)
        const phoneIsEnc = isEncryptedPii(row.phone)
        const hasEmailHash = !!row.emailHash
        const hasPhoneHash = !!row.phoneHash

        // Has neither value at all — nothing to do.
        if ((!row.email || row.email === '') && (!row.phone || row.phone === '')) {
          skippedNoValues += 1
          continue
        }

        // Fully migrated — skip.
        if (
          (!row.email || row.email === '' || (emailIsEnc && hasEmailHash)) &&
          (!row.phone || row.phone === '' || (phoneIsEnc && hasPhoneHash))
        ) {
          alreadyMigrated += 1
          continue
        }

        // Compute the new state. The "source of truth" for the hash is
        // whatever plaintext we can recover today: if the column is
        // encrypted but the hash is missing, that means the value
        // entered the system before BLIND_INDEX_SECRET was configured;
        // we'd need to decrypt to rehash. Skip those — the operator
        // should rerun once the secret is in place.
        if (emailIsEnc && !hasEmailHash) {
          errors.push({ id: row.id, err: 'email is encrypted but hash is missing — was BLIND_INDEX_SECRET unset at the time of write?' })
          continue
        }
        if (phoneIsEnc && !hasPhoneHash) {
          errors.push({ id: row.id, err: 'phone is encrypted but hash is missing' })
          continue
        }

        const data: Record<string, unknown> = {}

        // Email path: if plaintext, hash + encrypt. If empty/null leave alone.
        if (row.email && row.email !== '' && !emailIsEnc) {
          const eh = hashEmail(row.email)
          const ec = encryptPii(row.email)
          if (eh && ec) {
            data.email = ec
            data.emailHash = eh
          } else {
            // Unparseable email — encrypt anyway so it's at-rest
            // protected, but skip the hash (search by email won't
            // find it; that's better than nothing).
            if (ec) data.email = ec
          }
        }

        // Phone path same.
        if (row.phone && row.phone !== '' && !phoneIsEnc) {
          const ph = hashPhone(row.phone)
          const pc = encryptPii(row.phone)
          if (ph && pc) {
            data.phone = pc
            data.phoneHash = ph
          } else if (pc) {
            data.phone = pc
          }
        }

        if (Object.keys(data).length === 0) {
          alreadyMigrated += 1
          continue
        }

        if (dry) {
          migrated += 1
          continue
        }

        try {
          await prisma.contact.update({ where: { id: row.id }, data })
          migrated += 1
        } catch (err) {
          errors.push({ id: row.id, err: err instanceof Error ? err.message : String(err) })
        }
      }

      cursor = rows[rows.length - 1].id
      console.log(
        `pii:backfill-hashes: progress scanned=${scanned} migrated=${migrated} ` +
          `already=${alreadyMigrated} no-values=${skippedNoValues} errors=${errors.length}`,
      )
    }

    const summary = dry
      ? `pii:backfill-hashes: DRY RUN — would migrate ${migrated} of ${scanned} contacts ` +
        `(already migrated: ${alreadyMigrated}, empty: ${skippedNoValues}, errors: ${errors.length})`
      : `pii:backfill-hashes: migrated ${migrated} of ${scanned} contacts ` +
        `(already migrated: ${alreadyMigrated}, empty: ${skippedNoValues}, errors: ${errors.length})`
    console.log(summary)

    if (errors.length > 0) {
      console.error('pii:backfill-hashes: errors:')
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
    console.error('pii:backfill-hashes: unexpected error', err)
    process.exit(3)
  })
