#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   DB slow-query report — Philly CRM
   ---------------------------------------------------------------
   Walks the `pg_stat_statements` view (Postgres extension; available
   on every Supabase project by default) and reports the slowest
   queries by mean execution time, total time, or call rate. Designed
   to run daily via Vercel Cron or any plain cron runner.

   Usage:
     npm run db:slow                       # top 20 slowest by mean
     npm run db:slow -- --limit=50         # top 50
     npm run db:slow -- --order=total      # sort by total time
     npm run db:slow -- --threshold=200    # only rows where mean ≥ 200ms
     npm run db:slow -- --json             # JSON for CI / pipeline
     npm run db:slow -- --alert            # post a Slack alert if any
                                            row crosses the threshold

   Exit codes:
     0  no row crossed the threshold
     1  at least one row above threshold (intentional — for cron alerting)
     2  pg_stat_statements not enabled / connection failed

   Setup (Supabase): the extension is enabled in every project; check
   under Database → Extensions if it isn't. No additional grants needed
   when this script connects with the same DATABASE_URL the app uses.
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import { sendAlert } from '../lib/philly/alerts'

interface Args {
  limit: number
  order: 'mean' | 'total' | 'calls'
  /** Mean exec time in ms below which rows are excluded (and never alerted). */
  threshold: number
  json: boolean
  alert: boolean
}

interface Row {
  query: string
  calls: number
  total_exec_ms: number
  mean_exec_ms: number
  rows_returned: number
  shared_blks_hit: number
  shared_blks_read: number
}

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 20, order: 'mean', threshold: 100, json: false, alert: false }
  for (const tok of argv.slice(2)) {
    if (tok === '--json') a.json = true
    else if (tok === '--alert') a.alert = true
    else if (tok.startsWith('--limit=')) a.limit = Math.max(1, parseInt(tok.slice(8), 10) || 20)
    else if (tok.startsWith('--threshold=')) a.threshold = Math.max(0, parseInt(tok.slice(12), 10) || 0)
    else if (tok.startsWith('--order=')) {
      const v = tok.slice(8)
      if (v === 'mean' || v === 'total' || v === 'calls') a.order = v
    }
  }
  return a
}

function orderColumn(order: Args['order']): string {
  switch (order) {
    case 'total': return 'total_exec_time DESC'
    case 'calls': return 'calls DESC'
    default: return 'mean_exec_time DESC'
  }
}

function snip(s: string, n = 200): string {
  const compact = s.replace(/\s+/g, ' ').trim()
  return compact.length > n ? compact.slice(0, n - 1) + '…' : compact
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv)
  const prisma = new PrismaClient()

  try {
    // Detect extension availability up-front so missing pg_stat_statements
    // gives a clear error instead of a generic "relation does not exist".
    const ext = (await prisma.$queryRawUnsafe<Array<{ extname: string }>>(
      "SELECT extname FROM pg_extension WHERE extname = 'pg_stat_statements'",
    )) as Array<{ extname: string }>
    if (ext.length === 0) {
      console.error(
        'db:slow: pg_stat_statements extension is not enabled. ' +
        'Enable it in Supabase Dashboard → Database → Extensions, ' +
        'or run `CREATE EXTENSION pg_stat_statements;`',
      )
      return 2
    }

    const sql = `
      SELECT
        query,
        calls,
        ROUND(total_exec_time::numeric, 1)  AS total_exec_ms,
        ROUND(mean_exec_time::numeric, 1)   AS mean_exec_ms,
        rows                                AS rows_returned,
        shared_blks_hit,
        shared_blks_read
      FROM pg_stat_statements
      WHERE mean_exec_time >= $1
        AND query NOT ILIKE 'COMMIT%'
        AND query NOT ILIKE 'BEGIN%'
        AND query NOT ILIKE 'ROLLBACK%'
        AND query NOT ILIKE 'SET %'
        AND query NOT ILIKE 'SELECT pg_stat_statements%'
      ORDER BY ${orderColumn(args.order)}
      LIMIT $2
    `
    const rows = (await prisma.$queryRawUnsafe<Row[]>(sql, args.threshold, args.limit)) as Row[]

    if (args.json) {
      process.stdout.write(JSON.stringify({ threshold: args.threshold, count: rows.length, rows }, null, 2) + '\n')
    } else if (rows.length === 0) {
      console.log(`db:slow: no queries with mean ≥ ${args.threshold}ms`)
    } else {
      console.log(`db:slow: ${rows.length} quer${rows.length === 1 ? 'y' : 'ies'} with mean ≥ ${args.threshold}ms (sorted by ${args.order})`)
      for (const r of rows) {
        const cacheRatio =
          r.shared_blks_hit + r.shared_blks_read > 0
            ? `${Math.round((Number(r.shared_blks_hit) / (Number(r.shared_blks_hit) + Number(r.shared_blks_read))) * 100)}%`
            : '—'
        console.log(
          `  mean=${r.mean_exec_ms}ms  total=${r.total_exec_ms}ms  calls=${r.calls}  ` +
          `rows=${r.rows_returned}  cache=${cacheRatio}\n    ${snip(r.query)}`,
        )
      }
    }

    if (args.alert && rows.length > 0) {
      const top = rows[0]
      await sendAlert({
        severity: rows.length >= 5 ? 'error' : 'warning',
        source: 'db-slow-queries',
        title: `${rows.length} slow quer${rows.length === 1 ? 'y' : 'ies'} above ${args.threshold}ms`,
        body: `Top: \`${snip(top.query, 140)}\``,
        fields: {
          threshold_ms: args.threshold,
          count: rows.length,
          top_mean_ms: top.mean_exec_ms,
          top_calls: top.calls,
        },
      })
    }

    return rows.length > 0 ? 1 : 0
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('db:slow: unexpected error', err)
    process.exit(2)
  })
