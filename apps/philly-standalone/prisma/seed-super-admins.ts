/* prisma/seed-super-admins.ts — bulk-promote super-admins from env.
   ──────────────────────────────────────────────────────────────────
   Reads SUPER_ADMIN_EMAILS (comma-separated list) and calls
   grantSuperAdmin() for each. Designed to be idempotent — safe to
   re-run on every deploy, won't write duplicate audit rows for
   already-promoted users.

   Run via:
     SUPER_ADMIN_EMAILS=juan@kompasagency.nl npm run seed:super-admins

   Or as part of a fuller seed flow:
     npm run seed && npm run seed:super-admins

   Optional env:
     GRANTOR_EMAIL  — who is performing the grant. Defaults to the
                      grantee (self-grant — appropriate for the FIRST
                      super-admin only; subsequent grants should set
                      this explicitly for audit clarity).
*/

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { grantSuperAdmin, type GrantResult } from '../lib/philly/auth/super-admin-grant'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.')
  process.exit(1)
}

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const GRANTOR_EMAIL = process.env.GRANTOR_EMAIL?.trim() || null

if (SUPER_ADMIN_EMAILS.length === 0) {
  console.warn('SUPER_ADMIN_EMAILS is empty — nothing to do.')
  console.warn('Set SUPER_ADMIN_EMAILS=email1@example.com,email2@example.com and re-run.')
  process.exit(0)
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

/**
 * Decide what to do when an email in SUPER_ADMIN_EMAILS doesn't match
 * any User row in the database.
 *
 * TODO(Juan): pick the policy. This function is called for every
 * `result.reason === 'user-not-found'` in the seed loop. Three viable
 * approaches:
 *
 *   (A) STRICT — return { fatal: true }
 *       Aborts the whole seed with exit code 1. Use when SUPER_ADMIN_EMAILS
 *       drift is unacceptable (e.g., prod CI/CD where missing user
 *       means env var is stale).
 *
 *   (B) LENIENT — return { fatal: false, log: 'warn' }
 *       Logs a warning + continues to next email. Use when the seed
 *       runs across multiple environments (dev/staging/prod) where the
 *       same env var lists users that only exist in some of them.
 *
 *   (C) HYBRID — fatal in prod, lenient elsewhere
 *       return { fatal: process.env.NODE_ENV === 'production', log: 'warn' }
 *       Strictest where it matters (prod), forgiving where it doesn't.
 *
 * The trade-off: STRICT catches stale config but blocks deploys on
 * "the new hire's User row doesn't exist yet" — which is a real,
 * common race. LENIENT is permissive but means "silently no super-admin
 * was granted" is possible. HYBRID is the safest default but adds
 * environment-coupling to a seed script that should be portable.
 */
function handleUserNotFound(email: string): { fatal: boolean; log: 'warn' | 'error' } {
  // HYBRID policy (Juan's choice 2026-05-26):
  //   - Production deploys MUST abort if env var is stale — silently
  //     skipping a super-admin grant is the worst failure mode (you
  //     discover it when /admin/orgs returns 403 to everyone)
  //   - Dev/staging are forgiving — local seeding shouldn't break when
  //     a new lucenai.eu hire is in the list but hasn't completed
  //     Supabase first-login yet (no User row exists until first auth)
  //
  // The race we're guarding against:
  //   1. Juan adds new-hire@lucenai.eu to SUPER_ADMIN_EMAILS in Vercel
  //   2. Deploy ships before new-hire has clicked their Supabase invite
  //   3. Seed runs, can't find the User row
  //   4. STRICT would abort prod deploy — operator must invite first, then deploy.
  //      Slow but correct.
  //   5. LENIENT in dev means Juan can iterate locally without faking User rows.
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    fatal: isProduction,
    log: isProduction ? 'error' : 'warn',
  }
}

async function main() {
  console.log(`Seeding super-admins from SUPER_ADMIN_EMAILS (${SUPER_ADMIN_EMAILS.length} entries)`)
  console.log(`  Grantor: ${GRANTOR_EMAIL ?? '(self-grant — bootstrap mode)'}`)
  console.log()

  let granted = 0
  let alreadyAdmin = 0
  let notFound = 0
  let aborted = false

  for (const email of SUPER_ADMIN_EMAILS) {
    const result: GrantResult = await grantSuperAdmin({
      prisma,
      granteeEmail: email,
      grantorEmail: GRANTOR_EMAIL,
    })

    if (!result.ok) {
      if (result.reason === 'user-not-found') {
        notFound++
        const policy = handleUserNotFound(email)
        const msg = `  ✗ ${email} — no User row found`
        if (policy.log === 'error') console.error(msg)
        else console.warn(msg)

        if (policy.fatal) {
          aborted = true
          console.error(`\nAborting — STRICT policy + missing user.`)
          break
        }
        continue
      }
      if (result.reason === 'grantor-not-found') {
        console.error(`  ✗ ${email} — grantor ${GRANTOR_EMAIL} not found in User table. Aborting.`)
        aborted = true
        break
      }
    } else if (result.action === 'granted') {
      granted++
      console.log(`  ✓ ${email} — granted superAdmin (was: ${result.previousRole})`)
    } else if (result.action === 'already-super-admin') {
      alreadyAdmin++
      console.log(`  • ${email} — already superAdmin (no-op)`)
    }
  }

  console.log()
  console.log(`Summary: ${granted} granted, ${alreadyAdmin} already-admin, ${notFound} not-found`)
  console.log()

  if (granted > 0 || aborted) {
    console.log(`Next step: confirm via SQL — SELECT email, role FROM User WHERE role='superAdmin';`)
  }
  if (notFound > 0) {
    console.log(`Note: ${notFound} email(s) had no User row. Either the env var is stale, or the users`)
    console.log(`      need to sign up first (a User row is created on first Supabase auth).`)
  }

  process.exit(aborted ? 1 : 0)
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
