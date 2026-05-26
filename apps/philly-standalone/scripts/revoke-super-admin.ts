/* scripts/revoke-super-admin.ts — demote a super-admin back to role='admin'.
   ──────────────────────────────────────────────────────────────────
   Usage:
     npx tsx scripts/revoke-super-admin.ts <email>
     npx tsx scripts/revoke-super-admin.ts old-staff@lucenai.eu

   Optional env:
     GRANTOR_EMAIL    — who is performing the revoke (audit trail).
                        Defaults to the grantee (self-revoke is valid;
                        e.g., a super-admin stepping down).
     REVOKE_TO_ROLE   — what role to set after revoke. Defaults to 'admin'.
                        Use 'viewer' for a deeper demotion, or 'manager'
                        for an in-between.

   Idempotent: re-running on a non-superAdmin user is a no-op. */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { revokeSuperAdmin } from '../lib/philly/auth/super-admin-grant'

const email = process.argv[2]
if (!email) {
  console.error('Usage: npx tsx scripts/revoke-super-admin.ts <email>')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
const prisma = new PrismaClient({ adapter })

const grantorEmail = process.env.GRANTOR_EMAIL?.trim() || null
const revokeToRole = process.env.REVOKE_TO_ROLE?.trim() || 'admin'

async function main() {
  console.log(`Revoking superAdmin role`)
  console.log(`  Target:    ${email}`)
  console.log(`  New role:  ${revokeToRole}`)
  console.log(`  Actor:     ${grantorEmail ?? `${email} (self-revoke)`}`)
  console.log()

  const result = await revokeSuperAdmin({
    prisma,
    granteeEmail: email,
    grantorEmail,
    revokeToRole,
  })

  if (!result.ok) {
    if (result.reason === 'user-not-found') {
      console.error(`✗ No User row found for email "${email}".`)
      process.exit(1)
    }
    if (result.reason === 'grantor-not-found') {
      console.error(`✗ Grantor email "${grantorEmail}" has no User row.`)
      process.exit(1)
    }
  } else if (result.action === 'revoked') {
    console.log(`✓ Revoked: ${email} role changed superAdmin → ${revokeToRole}`)
    console.log(`  AuditLog entry written. User no longer has platform access.`)
  } else if (result.action === 'not-super-admin') {
    console.log(`• ${email} is not currently superAdmin (current role: ${result.previousRole}). No-op.`)
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Revoke failed:', err)
  process.exit(1)
})
