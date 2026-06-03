#!/usr/bin/env tsx
/**
 * 04-export-supabase-users.ts
 * What this does:
 *   Dumps the rows we need from Supabase Auth (auth.users) to JSON on
 *   stdout, ready for 05-import-lucia-users.ts. Strips everything we
 *   can't (or shouldn't) carry over — refresh tokens, access tokens,
 *   identities (we re-OAuth on first login), encrypted JWT secrets.
 *
 *   Output is one JSON object per line (NDJSON) so it streams without
 *   loading the whole result set into memory.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL    e.g. https://xyzabc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   the service-role key (NOT the anon key)
 *
 * Usage:
 *   tsx 04-export-supabase-users.ts > /tmp/supabase-users.json
 *   tsx 04-export-supabase-users.ts --diff /tmp/supabase-users.json \
 *     > /tmp/supabase-users-delta.json
 *
 * The --diff flag dumps only users created or updated since the
 * last_sign_in_at + updated_at maxima in the file passed to it.
 * Used for the T-15-min delta sync in the cutover ceremony.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as readline from 'node:readline'

interface SupabaseAuthUserRow {
  id: string
  email: string | null
  encrypted_password: string | null
  email_confirmed_at: string | null
  created_at: string
  updated_at: string | null
  last_sign_in_at: string | null
  raw_app_meta_data: Record<string, unknown> | null
  raw_user_meta_data: Record<string, unknown> | null
}

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function normaliseProviders(meta: Record<string, unknown> | null): string[] {
  if (!meta) return []
  const providers = meta.providers
  if (Array.isArray(providers)) {
    return providers.filter((p): p is string => typeof p === 'string')
  }
  const provider = meta.provider
  if (typeof provider === 'string') return [provider]
  return []
}

function rowToExport(row: SupabaseAuthUserRow): ExportedUser | null {
  if (!row.email) return null // skip users without an email — useless to us
  return {
    supabase_id: row.id,
    email: row.email.toLowerCase(),
    bcrypt_legacy: row.encrypted_password,
    email_verified: row.email_confirmed_at !== null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    last_sign_in_at: row.last_sign_in_at,
    oauth_providers: normaliseProviders(row.raw_app_meta_data),
  }
}

async function readDiffFloor(diffPath: string): Promise<Date> {
  let maxUpdatedAt = new Date(0)
  const stream = fs.createReadStream(diffPath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    try {
      const u = JSON.parse(line) as ExportedUser
      const t = new Date(u.updated_at)
      if (t > maxUpdatedAt) maxUpdatedAt = t
    } catch {
      // ignore malformed lines
    }
  }
  return maxUpdatedAt
}

async function main() {
  const args = process.argv.slice(2)
  let diffSince: Date | null = null
  if (args[0] === '--diff' && args[1]) {
    diffSince = await readDiffFloor(args[1])
    console.error(`exporting only users updated_at > ${diffSince.toISOString()}`)
  }

  // We use the admin API for paginated listUsers — it walks auth.users
  // safely without us having to wire raw SQL through PostgREST.
  let page = 1
  const perPage = 1000
  let total = 0
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error) {
      console.error('ERROR fetching page', page, error.message)
      process.exit(2)
    }
    if (!data.users.length) break

    for (const u of data.users) {
      const row = rowToExport(u as unknown as SupabaseAuthUserRow)
      if (!row) continue
      if (diffSince) {
        const updatedAt = new Date(row.updated_at)
        if (updatedAt <= diffSince) continue
      }
      console.log(JSON.stringify(row))
      total++
    }

    if (data.users.length < perPage) break
    page++
  }
  console.error(`exported ${total} users`)
}

main().catch((err) => {
  console.error(err)
  process.exit(3)
})
