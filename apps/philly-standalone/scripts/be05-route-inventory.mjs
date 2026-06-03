// BE-05 facts-first inventory: classify every app/api/**/route.ts by
//   - HTTP methods exported
//   - reads request body (.json())
//   - reads query params (searchParams)
//   - already imports zod
//   - already calls safeParse/.parse on input
// Emits a clustered, batch-ordered table. Read-only; no mutations.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const API_ROOT = join(process.cwd(), 'app', 'api')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name === 'route.ts') out.push(p)
  }
  return out
}

// Strip line/block comments so commented-out code doesn't create false hits.
function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// Family = first path segment under app/api (or second for nested groups).
function familyOf(routePath) {
  const relPath = relative(API_ROOT, routePath).split(sep)
  return relPath[0]
}

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
const WRITE = ['POST', 'PUT', 'PATCH', 'DELETE']

const rows = []
for (const file of walk(API_ROOT)) {
  const raw = readFileSync(file, 'utf8')
  const src = strip(raw)
  const methods = METHODS.filter((m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src) ||
    new RegExp(`export\\s+const\\s+${m}\\b`).test(src),
  )
  const hasBody = /\.json\(\)|parseBody\(/.test(src)
  const hasQuery = /searchParams|nextUrl\.search/.test(src)
  const hasZodImport = /from\s+["']zod["']/.test(src)
  // A route counts as validated if it uses the shared helpers (parseBody/
  // parseQuery) OR validates inline (safeParse/.parse) OR delegates to a
  // purpose-built parser (SCIM RFC-7644 parsers, isValidPatchRequest, etc).
  const hasValidate =
    /\.safeParse\(|\.parse(Async)?\(|parseBody\(|parseQuery\(/.test(src) ||
    /parseScim\w*Input|isValidPatchRequest|validateApiKey|pickFields|isValidPlanSlug/.test(src)
  const isWrite = methods.some((m) => WRITE.includes(m))
  // "raw" = takes untrusted input but does NOT validate it
  const takesInput = hasBody || hasQuery
  const isRaw = takesInput && !hasValidate
  rows.push({
    rel: relative(join(process.cwd(), 'app'), file).replace(/\\/g, '/'),
    family: familyOf(file),
    methods: methods.join('+') || '—',
    body: hasBody ? 'Y' : '',
    query: hasQuery ? 'Y' : '',
    zod: hasZodImport ? 'Y' : '',
    validated: hasValidate ? 'Y' : '',
    isWrite,
    isRaw,
  })
}

// Documented intentional exceptions — routes that take input but deliberately
// do NOT use a Zod schema, each for a specific, reviewed reason. Adding a
// schema here would REGRESS behavior. Keyed by rel path; value = reason.
const ALLOW = {
  'api/audit/prune/route.ts':
    'cron contract: documented empty-body POST must not 400; swallows JSON errors, falls back to envRetentionDays(), days guarded by typeof + MIN floor',
  'api/integrations/oauth/callback/route.ts':
    'out-of-band OAuth: state is HMAC-verified (verifyState) + IP rate-limited; all failures redirect, never JSON 400 — a Zod 400 would break the OAuth redirect contract',
  'api/realtime/route.ts':
    'SSE stream: only reads an opaque presence label (path) passed to presence.heartbeat; no filterable/queryable surface',
  'api/email/sync/route.ts':
    'reads a single accountId from query, already guarded (!accountId => 400) + resolved against Prisma with org-scope ownership',
  'api/impact/route.ts':
    'GET already does explicit isNaN(date) validation on from/to with its own 400 + validates projectId ownership via Prisma',
}

const raws = rows.filter((r) => r.isRaw)
const rawWrites = raws.filter((r) => r.isWrite && r.body)
const rawQueryOnly = raws.filter((r) => !r.isWrite || (!r.body && r.query))
// Coverage gate: a raw route is only acceptable if it's on the ALLOW list.
const unexplained = raws.filter((r) => !(r.rel in ALLOW))

// Cluster raw routes by family
const byFamily = {}
for (const r of raws) (byFamily[r.family] ??= []).push(r)

console.log('=== BE-05 INVENTORY ===')
console.log(`total route.ts:        ${rows.length}`)
console.log(`take input (body|qry): ${rows.filter((r) => r.body || r.query).length}`)
console.log(`already validated:     ${rows.filter((r) => r.validated).length}`)
console.log(`RAW (input, no valid.): ${raws.length}`)
console.log(`  - raw write+body:    ${rawWrites.length}  <-- BE-05 priority`)
console.log(`  - raw query/other:   ${rawQueryOnly.length}`)
console.log('')
console.log('=== RAW ROUTES BY FAMILY (count desc) ===')
const fams = Object.entries(byFamily).sort((a, b) => b[1].length - a[1].length)
for (const [fam, list] of fams) {
  const writes = list.filter((r) => r.isWrite && r.body).length
  console.log(`\n## ${fam}  (${list.length} raw, ${writes} write+body)`)
  for (const r of list) {
    const tag = r.isWrite && r.body ? 'W' : (r.query ? 'q' : '?')
    const allow = r.rel in ALLOW ? '  [ALLOWLISTED]' : ''
    console.log(`  [${tag}] ${r.methods.padEnd(20)} ${r.rel}${allow}`)
  }
}

// --- Coverage gate (for launch:check) ---
console.log('\n=== COVERAGE GATE ===')
console.log(`allowlisted exceptions: ${raws.length - unexplained.length}`)
console.log(`unexplained raw routes: ${unexplained.length}`)
if (unexplained.length > 0) {
  console.log('\nFAIL — these routes take untrusted input but neither validate nor are allowlisted:')
  for (const r of unexplained) console.log(`  - ${r.rel} (${r.methods})`)
  console.log('\nFix: add parseBody/parseQuery + a Zod schema, OR add to ALLOW with a reason.')
  process.exit(1)
}
console.log('PASS — every input-taking route validates or is a documented exception.')
process.exit(0)
