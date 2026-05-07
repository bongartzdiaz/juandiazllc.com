#!/usr/bin/env tsx
/**
 * 05-import-lucia-users.ts
 * What this does:
 *   Reads the NDJSON file produced by 04-export-supabase-users.ts and
 *   inserts each row into lucia_auth.auth_user. The bcrypt hash from
 *   Supabase is stored in bcrypt_legacy; password_hash (argon2id)
 *   stays NULL until the user logs in successfully — at which point
 *   the login route lazy-rehashes (see auth lib comments).
 *
 *   No password rehash happens here, because we don't have plaintext.
 *
 * Required env:
 *   LUCIA_DATABASE_URL   postgres://lucia_app:...@127.0.0.1:5432/lucia_auth
 *
 * Usage:
 *   tsx 05-import-lucia-users.ts /path/to/supabase-users.json
 *   tsx 05-import-lucia-users.ts --upsert /path/to/supabase-users-final.json
 *
 * --upsert: ON CONFLICT DO UPDATE on email — used for the T-15-min
 *           final delta sync where the same user might already exist.
 *           Default is INSERT-only (errors on conflict — fail loud).
 */

import * as fs from 'node:fs'
import * as readline from 'node:readline'
import * as crypto from 'node:crypto'
import pg from 'pg'

interface ExportedUser {
  supabase_id: string
  email: string
  bcrypt_legacy: string | null
  email_verified: boolean
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  oauth_providers: string[]
}

const DATABASE_URL = process.env.LUCIA_DATABASE_URL

if (!DATABASE_URL) {
  console.error('ERROR: LUCIA_DATABASE_URL must be set')
  process.exit(1)
}

const args = process.argv.slice(2)
const isUpsert = args.includes('--upsert')
const inputPath = args.find((a) => !a.startsWith('--'))
if (!inputPath) {
  console.error('ERROR: pass the NDJSON file path as the last argument')
  process.exit(1)
}

// Lucia v3 user IDs are arbitrary text. We reuse the Supabase UUID
// verbatim so any FK from Prisma User.id → auth.users.id stays valid
// without rewrites. (Prisma User.id matches the Supabase auth UUID by
// design in this codebase — see prisma/schema.prisma.)
function newUserId(supabaseId: string): string {
  return supabaseId
}

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()

  const stream = fs.createReadStream(inputPath!, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const insertSql = `
    INSERT INTO auth_user (
      id, email, password_hash, bcrypt_legacy,
      email_verified, last_sign_in_at, created_at, updated_at
    )
    VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)
  `
  const upsertSql = `
    INSERT INTO auth_user (
      id, email, password_hash, bcrypt_legacy,
      email_verified, last_sign_in_at, created_at, updated_at
    )
    VALUES ($1, $2, NULL, $3, $4, $5, $6, $7)
    ON CONFLICT (email) WHERE deleted_at IS NULL
    DO UPDATE SET
      bcrypt_legacy   = COALESCE(EXCLUDED.bcrypt_legacy, auth_user.bcrypt_legacy),
      email_verified  = auth_user.email_verified OR EXCLUDED.email_verified,
      last_sign_in_at = GREATEST(
        COALESCE(auth_user.last_sign_in_at, '-infinity'::timestamptz),
        COALESCE(EXCLUDED.last_sign_in_at,  '-infinity'::timestamptz)
      ),
      updated_at      = now()
  `
  const oauthSql = `
    INSERT INTO auth_oauth_account (user_id, provider, provider_user_id, provider_email)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (provider, provider_user_id) DO NOTHING
  `

  let inserted = 0
  let skipped = 0
  let errors = 0

  await client.query('BEGIN')
  try {
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      let row: ExportedUser
      try {
        row = JSON.parse(trimmed) as ExportedUser
      } catch {
        errors++
        continue
      }
      if (!row.email) {
        skipped++
        continue
      }
      const id = newUserId(row.supabase_id)
      try {
        await client.query(isUpsert ? upsertSql : insertSql, [
          id,
          row.email,
          row.bcrypt_legacy,
          row.email_verified,
          row.last_sign_in_at,
          row.created_at,
          row.updated_at,
        ])

        // OAuth-provider stub. We don't have the provider's sub/oid
        // here, so we encode a synthetic one tagged 'pending-reconnect'.
        // The Lucia OAuth callback notices this on first sign-in and
        // upgrades the row with the real provider_user_id.
        for (const provider of row.oauth_providers) {
          if (provider === 'email') continue
          const stubId = `pending-reconnect:${crypto
            .createHash('sha256')
            .update(`${row.email}:${provider}`)
            .digest('hex')
            .slice(0, 32)}`
          await client.query(oauthSql, [id, provider, stubId, row.email])
        }
        inserted++
      } catch (err) {
        errors++
        console.error('row failed:', row.email, (err as Error).message)
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }

  console.error(
    `done — inserted/upserted: ${inserted}, skipped: ${skipped}, errors: ${errors}`
  )
  if (errors > 0) process.exit(2)
}

main().catch((err) => {
  console.error(err)
  process.exit(3)
})
