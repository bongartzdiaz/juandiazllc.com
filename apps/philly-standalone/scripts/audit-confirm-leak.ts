/* scripts/audit-confirm-leak.ts — fail CI on native window.confirm() leaks.
   ──────────────────────────────────────────────────────────────────
   Native window.confirm() is hardcoded-English (browser locale, not
   the app locale) and bypasses Modal a11y. Every destructive
   confirmation in the app MUST use useConfirm() from hooks/philly/
   useConfirm.tsx instead.

   This audit greps for `confirm(["'`]` patterns — calls to the
   global confirm() with a string-literal argument. The new
   useConfirm() pattern looks like `await confirm({ title: ... })` —
   passes an object, never a string literal.

   2026-05-26: PERMANENT GATE. The original 20-leak allowlist has been
   fully cleared. Any new confirm() leak fails CI immediately — there
   is no grace period and no per-file exception. If you legitimately
   need to bypass (you won't), discuss with the operator first.

   Run via:
     npm run audit:confirm-leak       # any leak → exit 1 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, sep } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = [join(ROOT, 'app'), join(ROOT, 'components')]
const SCAN_EXT = new Set(['.ts', '.tsx'])

// Permanent gate as of 2026-05-26 — no allowlist, no exceptions.
// The original 20-leak baseline was cleared in a single sweep. Any new
// confirm() leak fails this audit immediately.
const KNOWN_LEAKS: ReadonlySet<string> = new Set()

interface Leak {
  file: string
  line: number
  text: string
}

function walk(dir: string): string[] {
  const result: string[] = []
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let st
    try { st = statSync(full) } catch { continue }
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

// Match `confirm(['"`])` — naked confirm() with a string literal.
// Negative-lookbehind to skip `useConfirm(` / `setConfirm(` / member calls
// (which would be our own hook, not the native browser one).
// JS regex doesn't support variable-width lookbehind everywhere, so we
// post-filter instead.
const CONFIRM_RE = /\bconfirm\s*\(\s*['"`]/g
const PRECEDING_BLOCKLIST = ['useConfirm', 'setConfirm', 'getConfirm', '.confirm']

function scanFile(file: string): Leak[] {
  let content: string
  try { content = readFileSync(file, 'utf8') } catch { return [] }
  const leaks: Leak[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    CONFIRM_RE.lastIndex = 0
    let match
    while ((match = CONFIRM_RE.exec(line)) !== null) {
      const idx = match.index
      const preceding = line.slice(Math.max(0, idx - 16), idx)
      if (PRECEDING_BLOCKLIST.some(p => preceding.endsWith(p))) continue
      leaks.push({
        file: relative(ROOT, file).split(sep).join('/'),
        line: i + 1,
        text: line.trim(),
      })
    }
  }
  return leaks
}

const args = process.argv.slice(2)
const ciMode = args.includes('--ci')

const allLeaks: Leak[] = []
for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    allLeaks.push(...scanFile(file))
  }
}

// Group by file. A file appearing in KNOWN_LEAKS is allowed; one
// not in the list fails the audit (regression).
const byFile = new Map<string, Leak[]>()
for (const leak of allLeaks) {
  const existing = byFile.get(leak.file) ?? []
  existing.push(leak)
  byFile.set(leak.file, existing)
}

const newLeaks: Leak[] = []
const knownLeaks: Leak[] = []
for (const [file, leaks] of byFile.entries()) {
  if (KNOWN_LEAKS.has(file)) {
    knownLeaks.push(...leaks)
  } else {
    newLeaks.push(...leaks)
  }
}

console.log(`Scanned ${SCAN_DIRS.length} directories`)
console.log(`Total confirm() leaks found: ${allLeaks.length}`)
console.log(`  Known (allowed, follow-up scope): ${knownLeaks.length} across ${KNOWN_LEAKS.size} files`)
console.log(`  NEW (regression): ${newLeaks.length}`)

if (newLeaks.length > 0) {
  console.log('\n✗ NEW confirm() leaks — these files are NOT in the KNOWN_LEAKS allowlist:\n')
  for (const leak of newLeaks) {
    console.log(`  ${leak.file}:${leak.line}`)
    console.log(`    ${leak.text}`)
  }
  console.log('\nReplace with `await confirm({ title, body, confirmLabel, cancelLabel, danger })`')
  console.log('from hooks/philly/useConfirm.tsx. See app/automations/page.tsx for an example.')
}

if (allLeaks.length === 0) {
  console.log('\n✓ No confirm() leaks. Remove KNOWN_LEAKS and make this audit permanent.')
}

process.exit(newLeaks.length > 0 ? 1 : 0)
