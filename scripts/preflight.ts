/* scripts/preflight.ts
   ───────────────────────────────────────────────────────────
   Run before first boot (or in CI) to verify the app can actually start.

   Checks:
     1. Required env vars are set
     2. DATABASE_URL reaches the DB
     3. Schema is in sync (checks presence of key tables)
     4. At least one admin user exists
     5. NEXTAUTH_SECRET is long enough

   Exit codes:
     0  — all checks passed
     1  — at least one required check failed

   Usage:
     npm run preflight
*/

import 'dotenv/config'

const REQUIRED_ENV = ['DATABASE_URL', 'NEXTAUTH_SECRET'] as const

type Check = {
  name: string
  ok: boolean
  detail: string
  critical?: boolean
}

const checks: Check[] = []

function pass(name: string, detail = '', critical = true) {
  checks.push({ name, ok: true, detail, critical })
}
function fail(name: string, detail: string, critical = true) {
  checks.push({ name, ok: false, detail, critical })
}
function warn(name: string, detail: string) {
  checks.push({ name, ok: false, detail, critical: false })
}

function printReport() {
  const critical = checks.filter(c => c.critical)
  const soft = checks.filter(c => !c.critical)
  const passed = critical.filter(c => c.ok).length
  const failed = critical.filter(c => !c.ok).length

  console.log('REQUIRED:')
  for (const c of critical) {
    const icon = c.ok ? '  ✓' : '  ✗'
    const pad = c.name.padEnd(22)
    console.log(`${icon} ${pad} ${c.detail}`)
  }

  if (soft.length > 0) {
    console.log('\nWARNINGS:')
    for (const c of soft) {
      const pad = c.name.padEnd(22)
      console.log(`  ! ${pad} ${c.detail}`)
    }
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${soft.length} warnings`)

  if (failed > 0) {
    console.log('\n✗ Preflight FAILED. Fix the issues above before starting the app.\n')
  } else {
    console.log('\n✓ Preflight PASSED. App is ready to boot.\n')
  }
}

async function main() {
  console.log('\nPhilly Dashboard — preflight checks\n')

  /* 1. Required env vars */
  for (const key of REQUIRED_ENV) {
    const v = process.env[key]
    if (!v || !v.trim()) {
      fail(`env:${key}`, 'not set')
    } else if (key === 'NEXTAUTH_SECRET' && v.length < 32) {
      fail(`env:${key}`, `too short (${v.length} chars; min 32 — generate with: openssl rand -base64 32)`)
    } else if (key === 'NEXTAUTH_SECRET' && v.startsWith('generate-a-secret')) {
      fail(`env:${key}`, 'placeholder value — replace with a real secret')
    } else {
      pass(`env:${key}`, key === 'DATABASE_URL' ? v.replace(/:[^:@]+@/, ':***@') : 'set')
    }
  }

  /* 2. NEXTAUTH_URL (required in production, https enforced) */
  const isProd = process.env.NODE_ENV === 'production'
  const url = process.env.NEXTAUTH_URL
  if (!url) {
    if (isProd) fail('env:NEXTAUTH_URL', 'REQUIRED in production')
    else warn('env:NEXTAUTH_URL', 'not set (ok for dev)')
  } else if (isProd && url.startsWith('http://') && !url.startsWith('http://localhost')) {
    fail('env:NEXTAUTH_URL', 'must be https:// in production (auth cookies require it)')
  } else if (isProd && !url.startsWith('https://') && !url.startsWith('http://localhost')) {
    fail('env:NEXTAUTH_URL', `invalid URL: ${url}`)
  } else {
    pass('env:NEXTAUTH_URL', url)
  }

  /* 3. Database connection + schema presence */
  if (!process.env.DATABASE_URL) {
    fail('db:connect', 'skipped — DATABASE_URL not set')
  } else {
    try {
      const { PrismaClient } = await import('@prisma/client')
      const { PrismaMariaDb } = await import('@prisma/adapter-mariadb')
      const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
      const prisma = new PrismaClient({ adapter })

      const connectTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
          ),
        ])

      try {
        await connectTimeout(prisma.$queryRawUnsafe('SELECT 1'), 5000)
        pass('db:connect', 'reached database')
      } catch (err) {
        fail('db:connect', err instanceof Error ? err.message : 'connection failed')
        await prisma.$disconnect().catch(() => {})
        // Print the partial report and exit
        printReport()
        process.exit(1)
      }

      /* Key-table presence — if any of these throw, schema needs `db:push` */
      const keyChecks: Array<[string, () => Promise<unknown>]> = [
        ['Organization', () => prisma.organization.count()],
        ['User', () => prisma.user.count()],
        ['Pipeline', () => prisma.pipeline.count()],
        ['Contact', () => prisma.contact.count()],
      ]

      for (const [name, fn] of keyChecks) {
        try {
          const n = await fn()
          pass(`db:${name}`, `table exists (${n} rows)`)
        } catch (err) {
          const msg = err instanceof Error ? err.message.split('\n')[0] : 'unknown'
          fail(`db:${name}`, `table missing or broken — run: npm run db:push  (${msg})`)
        }
      }

      /* Admin user exists? */
      try {
        const admin = await prisma.user.findFirst({ where: { role: 'admin' }, select: { email: true } })
        if (admin) {
          pass('db:admin', `found: ${admin.email}`)
        } else {
          warn('db:admin', 'no admin user — run: npm run seed')
        }
      } catch {
        /* table check above already flagged */
      }

      await prisma.$disconnect()
    } catch (err) {
      fail('db:connect', err instanceof Error ? err.message : 'prisma import failed')
    }
  }

  /* 4. Optional feature detection */
  const optional = [
    { key: 'OPENAI_API_KEY', feat: 'AI insights LLM enhancement' },
    { key: 'ANTHROPIC_API_KEY', feat: 'AI insights LLM enhancement' },
    { key: 'TWILIO_ACCOUNT_SID', feat: 'SMS/WhatsApp outbound' },
    { key: 'EMAIL_API_KEY', feat: 'Email outbound' },
    { key: 'S3_BUCKET', feat: 'Direct file upload' },
    { key: 'GOOGLE_CLIENT_ID', feat: 'Google integration' },
    { key: 'SLACK_CLIENT_ID', feat: 'Slack integration' },
    { key: 'STRIPE_SECRET_KEY', feat: 'Stripe payments' },
  ]
  const enabled: string[] = []
  const disabled: string[] = []
  for (const o of optional) {
    if (process.env[o.key]) enabled.push(o.feat)
    else disabled.push(o.feat)
  }

  /* ── Print report ── */
  printReport()

  if (enabled.length > 0) {
    console.log('OPTIONAL FEATURES ENABLED:')
    enabled.forEach(e => console.log(`  • ${e}`))
    console.log()
  }
  if (disabled.length > 0) {
    console.log('OPTIONAL FEATURES DISABLED (env var unset):')
    disabled.forEach(e => console.log(`  · ${e}`))
    console.log()
  }

  const failed = checks.filter(c => c.critical && !c.ok).length
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('\nPreflight crashed unexpectedly:', err)
  process.exit(1)
})
