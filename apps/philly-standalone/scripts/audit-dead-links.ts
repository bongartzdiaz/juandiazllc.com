/* scripts/audit-dead-links.ts — detect customer-facing dead-end links.
   ──────────────────────────────────────────────────────────────────
   Crawls every <Link href="..."> and router.push("...") + Sidebar /
   MobileNav NAV item hrefs, then cross-references each target against
   the actual filesystem routes under app/.

   Reports targets that resolve to NO page.tsx (= 404 when clicked).

   Exit code:
     0   no dead links found
     1   ≥1 dead link found — CI should fail
     2   script error (file read, parse failure)

   Run via:
     npm run audit:dead-links
     npm run audit:dead-links --json   (machine-readable)
     npm run audit:dead-links --allow-known   (skip the known-deferred list) */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, sep } from 'path'

// ── Configuration ─────────────────────────────────────────────────

const ROOT = process.cwd()
const APP_DIR = join(ROOT, 'app')
const SCAN_DIRS = [
  join(ROOT, 'app'),
  join(ROOT, 'components'),
  join(ROOT, 'hooks'),
  join(ROOT, 'lib'),
]
const SCAN_EXT = new Set(['.ts', '.tsx'])

/**
 * URLs the audit deliberately skips:
 *   - external (http://, mailto:, tel:)
 *   - anchor-only (#section)
 *   - dynamic with placeholders we can't statically resolve
 *   - known-deferred routes documented in the PR body that ship the link
 */
const SKIP_PATTERNS = [
  /^https?:\/\//, // external
  /^mailto:/, // email links
  /^tel:/, // phone links
  /^#/, // page anchors
  /^\/api\//, // API routes (no UI page)
  /\$\{/, // template-literal hrefs we can't statically resolve
]

const KNOWN_DEFERRED: Array<{ href: string; reason: string }> = [
  // Routes that ship a link BEFORE the page exists, intentionally.
  // Add entries as: { href: '/foo/bar', reason: 'shipped in PR #N before route lands' }
]

interface LinkRef {
  href: string
  file: string
  line: number
  source: 'next-link' | 'router-push' | 'nav-item' | 'a-tag'
}

// ── File discovery ────────────────────────────────────────────────

function walk(dir: string): string[] {
  const result: string[] = []
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue
      result.push(...walk(full))
    } else if (st.isFile() && SCAN_EXT.has(getExt(entry))) {
      result.push(full)
    }
  }
  return result
}

function getExt(name: string): string {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i)
}

// ── Link extraction ───────────────────────────────────────────────

const LINK_PATTERNS: Array<{ regex: RegExp; source: LinkRef['source'] }> = [
  // <Link href="/contacts"> or <Link href={"/contacts"}>
  { regex: /<Link\s[^>]*href\s*=\s*["']([^"'$]+)["']/g, source: 'next-link' },
  { regex: /<Link\s[^>]*href\s*=\s*\{["']([^"'$]+)["']\}/g, source: 'next-link' },
  // router.push('/contacts') or .push("/contacts")
  { regex: /\brouter\.(?:push|replace)\(["']([^"'$]+)["']/g, source: 'router-push' },
  // href: '/contacts' (in nav config objects)
  { regex: /\bhref:\s*["']([^"'$]+)["']/g, source: 'nav-item' },
  // <a href="/contacts"> (less common in Next.js but exists)
  { regex: /<a\s[^>]*href\s*=\s*["']([^"'$]+)["']/g, source: 'a-tag' },
]

function extractLinksFromFile(file: string): LinkRef[] {
  let content: string
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    return []
  }

  const links: LinkRef[] = []
  const lines = content.split('\n')

  for (const { regex, source } of LINK_PATTERNS) {
    const fresh = new RegExp(regex.source, regex.flags) // reset state
    let match
    while ((match = fresh.exec(content)) !== null) {
      const href = match[1]
      if (!href) continue
      if (SKIP_PATTERNS.some(p => p.test(href))) continue
      if (!href.startsWith('/')) continue // relative or hash-like — skip

      // Find which line this match landed on.
      const idx = match.index
      let line = 1
      let cursor = 0
      for (let i = 0; i < lines.length; i++) {
        const nextCursor = cursor + (lines[i] ?? '').length + 1 // +1 for the \n
        if (idx < nextCursor) {
          line = i + 1
          break
        }
        cursor = nextCursor
      }

      links.push({
        href,
        file: relative(ROOT, file).split(sep).join('/'),
        line,
        source,
      })
    }
  }

  return links
}

// ── Route resolution (app/ directory) ─────────────────────────────

/**
 * Given a URL like '/admin/orgs/[orgId]/features', resolve it to an
 * app/admin/orgs/[orgId]/features/page.tsx path. Returns null if the
 * page.tsx doesn't exist.
 */
function pageExistsForRoute(routeHref: string): boolean {
  // Strip query string + hash
  const cleaned = routeHref.split('?')[0]?.split('#')[0] ?? ''
  if (!cleaned || cleaned === '/') {
    return existsSync(join(APP_DIR, 'page.tsx'))
  }

  // Convert URL segments to filesystem segments. For each path segment in
  // the URL, try (a) literal segment match, (b) dynamic [param] match.
  const segments = cleaned.split('/').filter(Boolean)
  let dir = APP_DIR

  for (const seg of segments) {
    // Try literal first.
    const literal = join(dir, seg)
    if (existsSync(literal) && statSync(literal).isDirectory()) {
      dir = literal
      continue
    }

    // Try dynamic [param] OR [...slug] OR ([group])
    const entries = existsSync(dir) ? readdirSync(dir) : []
    const dynamic = entries.find(e => /^\[.+\]$/.test(e))
    if (dynamic) {
      const dynPath = join(dir, dynamic)
      if (statSync(dynPath).isDirectory()) {
        dir = dynPath
        continue
      }
    }

    // Route groups (parens) — try every (group)/seg recursively (one level).
    const groups = entries.filter(e => /^\(.+\)$/.test(e))
    let groupMatched = false
    for (const group of groups) {
      const groupSegPath = join(dir, group, seg)
      if (existsSync(groupSegPath) && statSync(groupSegPath).isDirectory()) {
        dir = groupSegPath
        groupMatched = true
        break
      }
    }
    if (groupMatched) continue

    // Not found.
    return false
  }

  return existsSync(join(dir, 'page.tsx'))
}

// ── Main ──────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const wantJson = args.includes('--json')
const allowKnown = args.includes('--allow-known')

const files: string[] = []
for (const d of SCAN_DIRS) {
  files.push(...walk(d))
}

const allLinks: LinkRef[] = []
for (const file of files) {
  allLinks.push(...extractLinksFromFile(file))
}

// Group by unique href to avoid double-reporting the same target.
const byHref = new Map<string, LinkRef[]>()
for (const link of allLinks) {
  const existing = byHref.get(link.href) ?? []
  existing.push(link)
  byHref.set(link.href, existing)
}

const dead: Array<{ href: string; refs: LinkRef[]; knownDeferred?: string }> = []
const live: string[] = []

for (const [href, refs] of byHref.entries()) {
  if (pageExistsForRoute(href)) {
    live.push(href)
    continue
  }
  const knownEntry = KNOWN_DEFERRED.find(k => k.href === href)
  dead.push({
    href,
    refs,
    ...(knownEntry ? { knownDeferred: knownEntry.reason } : {}),
  })
}

const realDead = allowKnown ? dead.filter(d => !d.knownDeferred) : dead

if (wantJson) {
  console.log(
    JSON.stringify(
      {
        scanned: { files: files.length, links: allLinks.length, uniqueTargets: byHref.size },
        live: live.length,
        dead: realDead.map(d => ({
          href: d.href,
          knownDeferred: d.knownDeferred ?? null,
          firstRef: d.refs[0],
          refCount: d.refs.length,
        })),
      },
      null,
      2,
    ),
  )
} else {
  console.log(`Scanned ${files.length} files, found ${allLinks.length} link references`)
  console.log(`Unique targets: ${byHref.size} (${live.length} live, ${realDead.length} dead)\n`)

  if (realDead.length === 0) {
    console.log('✓ No dead links found.')
  } else {
    console.log('✗ Dead links — these href targets have NO matching app/.../page.tsx:\n')
    for (const d of realDead) {
      console.log(`  ${d.href}  (${d.refs.length} reference${d.refs.length === 1 ? '' : 's'})`)
      for (const ref of d.refs.slice(0, 3)) {
        console.log(`    → ${ref.file}:${ref.line}  [${ref.source}]`)
      }
      if (d.refs.length > 3) {
        console.log(`    → … and ${d.refs.length - 3} more`)
      }
      if (d.knownDeferred) {
        console.log(`    ⓘ known-deferred: ${d.knownDeferred}`)
      }
      console.log()
    }
  }
}

process.exit(realDead.length > 0 ? 1 : 0)
