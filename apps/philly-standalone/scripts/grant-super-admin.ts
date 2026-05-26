/* scripts/grant-super-admin.ts — promote one user to role='superAdmin'.
   ──────────────────────────────────────────────────────────────────
   Usage:
     npx tsx scripts/grant-super-admin.ts <email>
     npx tsx scripts/grant-super-admin.ts juan@kompasagency.nl

   Optional env:
     GRANTOR_EMAIL  — who is performing the grant (lands in AuditLog).
                      Defaults to the grantee for self-grants (bootstrap).
                      For non-bootstrap grants, set this so the audit
                      trail shows WHO promoted whom.

   Examples:
     # Bootstrap (first super-admin, self-grant):
     npx tsx scripts/grant-super-admin.ts juan@kompasagency.nl

     # Subsequent grant (Juan promotes a new staff member):
     GRANTOR_EMAIL=juan@kompasagency.nl \
       npx tsx scripts/grant-super-admin.ts new-staff@lucenai.eu

   Idempotent: re-running on an already-superAdmin user is a no-op
   (no duplicate AuditLog row, no error). */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { grantSuperAdmin } from '../lib/philly/auth/super-admin-grant'

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/grant-super-admin.ts <email>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const grantorEmail = process.env.GRANTOR_EMAIL?.trim() || null

async function main() {
  console.log(`Granting superAdmin role`)
  console.log(`  Grantee: ${email}`)
  console.log(`  Grantor: ${grantorEmail ?? `${email} (self-grant — bootstrap mode)`}`)
  console.log()

  const result = await grantSuperAdmin({ prisma, granteeEmail: email, grantorEmail })

  if (!result.ok) {
    if (result.reason === 'user-not-found') {
      console.error(`✗ No User row found for email "${email}".`)
      console.error(`  The user must complete Supabase sign-up first.`)
      console.error(`  Verify with: SELECT id, email FROM User WHERE email='${email}';`)
      process.exit(1)
    }
    if (result.reason === 'grantor-not-found') {
      console.error(`✗ Grantor email "${grantorEmail}" has no User row.`)
      console.error(`  Either fix GRANTOR_EMAIL, or unset it to fall back to self-grant.`)
      process.exit(1)
    }
  } else if (result.action === 'granted') {
    console.log(`✓ Granted: ${email} role changed ${result.previousRole} → superAdmin`)
    console.log(`  AuditLog entry written. The user can now reach /admin/orgs/*.`)
    if (process.env.NODE_ENV === 'production') {
      console.log(`  Reminder: super-admin requires MFA — verify with:`)
      console.log(`    SELECT email, twoFactorEnabled FROM User WHERE id='${result.userId}';`)
    }
  } else if (result.action === 'already-super-admin') {
    console.log(`• ${email} already has role='superAdmin' (no-op).`)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Grant failed:', err)
  process.exit(1)
})
