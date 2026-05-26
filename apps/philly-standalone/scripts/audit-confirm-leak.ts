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

   2026-05-26 baseline: 20 leaks remain in app/ + components/ (8 pages
   + 1 settings + 1 GDPR component, see KNOWN_LEAKS below). They are
   tolerated until follow-up PR. New leaks (file not in the list) fail
   this audit immediately.

   Run via:
     npm run audit:confirm-leak       # report mode
     npm run audit:confirm-leak --ci  # exit 1 on any leak (after grace period) */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, sep } from 'path'

const ROOT = process.cwd()
const SCAN_DIRS = [join(ROOT, 'app'), join(ROOT, 'components')]
const SCAN_EXT = new Set(['.ts', '.tsx'])

// Allowed string-literal confirm() leaks (followup work).
// As each file is migrated to useConfirm(), remove its entry here.
// When the array is empty → audit is "clean," remove this allowlist
// and make the audit a permanent CI gate.
const KNOWN_LEAKS: ReadonlySet<string> = new Set([
  // First wave — discovered by single-quote audit grep on 2026-05-26.
  'app/action-plans/page.tsx',
  'app/assistant/page.tsx',
  'app/calendar/page.tsx',
  'app/client-portal/page.tsx',
  'app/cma/page.tsx',
  'app/deals/[id]/page.tsx',
  'app/dialer/page.tsx',
  'app/email/page.tsx',
  'app/grants/page.tsx',
  'app/inbox/page.tsx',
  'app/kanban/page.tsx',
  'app/lead-routing/page.tsx',
  'app/lead-scoring/page.tsx',
  'app/offers/page.tsx',
  'app/properties/page.tsx',
  'app/realtime-test/page.tsx',
  'app/settings/api-keys/page.tsx',
  'app/showings/page.tsx',
  'app/sms/page.tsx',
  // Second wave — surfaced by this very audit script's stricter regex
  // (also catches single-quote calls in components/, not just app/).
  'app/pages/page.tsx',
  'app/properties/[id]/page.tsx',
  'app/rooms/page.tsx',
  'app/scoring-rules/page.tsx',
  'app/settings/webhooks/page.tsx',
  'app/soi/page.tsx',
  'app/transactions/[id]/page.tsx',
  'components/philly/gdpr/GdprActions.tsx',
  // ↑ This is the highest-risk leak in the allowlist: a GDPR data-erasure
  // confirm. If shown in English to a German DPO, they'd reasonably refuse
  // to deploy DEUS. Priority for the follow-up PR.
])

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
