#!/usr/bin/env node
/* scripts/deus-extraction/rename-philly.mjs
   ──────────────────────────────────────────────────────────────────
   Renames the historical "philly" identifier to "deus" across the
   codebase, in preparation for the DEUS-SHARED extraction (task #6).

   ## Three categories of replacement

   1. **Folder paths** — `lib/philly/` → `lib/deus/`, plus components +
      hooks. Done as git-mv operations so blame is preserved.
   2. **Import specifiers** — `@/lib/philly/X` → `@/lib/deus/X` across
      every .ts / .tsx / .test.ts file. Applied via text replacement.
   3. **Identifier strings in code** — package.json `name: "philly-crm"`
      → `"deus-crm"`, env-var prefix `PHILLY_` (if any) → `DEUS_`,
      class names like `PhillyError` (if any) → `DeusError`.

   ## What this script does NOT do

   - Edit memory files (`~/.claude/projects/.../memory/*.md`) — those
     are historical-context docs and the "philly" appearances there
     are correct.
   - Edit `docs/operations/REBRAND-PLAN.md` — same historical context
     reason.
   - Edit comments that reference bundle names like "Bundle PHILLY"
     or historical commit names — these are blame anchors.
   - Touch the `apps/philly-standalone/` outer folder. That rename
     happens during `git filter-repo --subdirectory-filter` (extract.sh).

   ## Safety

   Dry-run by default. Pass `--apply` to actually write. Pass
   `--target=path/to/repo` to operate on a different working tree
   (default: cwd).

   ## Usage

     node scripts/deus-extraction/rename-philly.mjs                # dry-run
     node scripts/deus-extraction/rename-philly.mjs --apply        # write
     node scripts/deus-extraction/rename-philly.mjs --apply --target=/tmp/deus-extracted

   --------------------------------------------------------------- */

import { readFileSync, writeFileSync, readdirSync, statSync, renameSync, existsSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const targetArg = args.find(a => a.startsWith('--target='))
const ROOT = targetArg ? targetArg.slice(9) : join(__dirname, '..', '..')

const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'])

// ── Replacement rules ──
//
// `from` is matched as a literal substring (case-sensitive). Order
// matters — more-specific rules first. The "ImportSpecifier" rules
// catch `@/lib/philly/` references; the "FolderPath" rules cover
// physical move operations and any remaining bare paths in scripts.
const REPLACEMENTS = [
  // Package name (package.json)
  { from: '"philly-crm"', to: '"deus-crm"', label: 'package.json name' },

  // Import specifiers (the highest-volume category)
  { from: '@/lib/philly/',        to: '@/lib/deus/',        label: 'import specifier (lib)' },
  { from: '@/components/philly/', to: '@/components/deus/', label: 'import specifier (components)' },
  { from: '@/hooks/philly/',      to: '@/hooks/deus/',      label: 'import specifier (hooks)' },
  { from: '@/app/api/philly/',    to: '@/app/api/deus/',    label: 'import specifier (api/philly — likely empty)' },

  // Bare folder paths that show up in scripts / CI / config (not @/ prefixed)
  { from: 'lib/philly/',         to: 'lib/deus/',         label: 'bare path (lib)' },
  { from: 'components/philly/',  to: 'components/deus/',  label: 'bare path (components)' },
  { from: 'hooks/philly/',       to: 'hooks/deus/',       label: 'bare path (hooks)' },
]

// Files / folders the rename should SKIP — preserved-history docs,
// memory files, and the tooling itself.
const SKIP_PATTERNS = [
  /\bnode_modules\b/,
  /\.next\b/,
  /\bdist\b/,
  /\bbuild\b/,
  /^scripts\/deus-extraction\//,    // don't rewrite this script
  /^docs\/operations\/REBRAND-PLAN\.md$/,
  /^docs\/operations\/EXTRACTION-PLAN\.md$/,
  /^memory\//,                      // ~/.claude/... memory dir (when run there)
  /\.lock$/,
  /\.log$/,
]

function shouldSkip(rel) {
  return SKIP_PATTERNS.some(re => re.test(rel.split(sep).join('/')))
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const rel = relative(ROOT, full)
    if (shouldSkip(rel)) continue
    let st
    try { st = statSync(full) } catch { continue }
    if (st.isDirectory()) {
      walk(full, out)
    } else if (st.isFile()) {
      const dot = entry.lastIndexOf('.')
      const ext = dot === -1 ? '' : entry.slice(dot).toLowerCase()
      if (EXT.has(ext)) out.push(full)
    }
  }
  return out
}

console.log(`DEUS extraction rename — ${apply ? 'APPLY' : 'DRY-RUN'} mode`)
console.log(`Target: ${ROOT}`)
console.log(`Replacements: ${REPLACEMENTS.length}`)
console.log()

if (!existsSync(ROOT)) {
  console.error(`✗ Target does not exist: ${ROOT}`)
  process.exit(2)
}

const files = walk(ROOT)
console.log(`Scanning ${files.length} files…`)

const byRule = new Map(REPLACEMENTS.map(r => [r.label, 0]))
const filesTouched = new Set()

for (const f of files) {
  const original = readFileSync(f, 'utf8')
  let next = original
  let touched = false

  for (const r of REPLACEMENTS) {
    if (!next.includes(r.from)) continue
    const before = next
    next = next.split(r.from).join(r.to)
    if (next !== before) {
      // Count occurrences in the original (so we report what *was* there)
      const count = original.split(r.from).length - 1
      byRule.set(r.label, byRule.get(r.label) + count)
      touched = true
    }
  }

  if (touched) {
    filesTouched.add(relative(ROOT, f).split(sep).join('/'))
    if (apply) {
      writeFileSync(f, next, 'utf8')
    }
  }
}

console.log()
console.log('Replacement counts (per rule):')
for (const [label, n] of byRule) {
  console.log(`  ${String(n).padStart(5)}  ${label}`)
}
console.log()
console.log(`Files affected: ${filesTouched.size}`)
if (filesTouched.size <= 30) {
  for (const f of [...filesTouched].sort()) console.log(`  ${f}`)
} else {
  for (const f of [...filesTouched].sort().slice(0, 25)) console.log(`  ${f}`)
  console.log(`  … and ${filesTouched.size - 25} more`)
}

if (!apply) {
  console.log()
  console.log('Dry-run — no files modified. Pass --apply to write.')
}

// Note: folder moves (lib/philly/ → lib/deus/) are NOT done by this
// script — they MUST be done as `git mv` so blame is preserved. See
// docs/operations/EXTRACTION-PLAN.md for the operator step list.
console.log()
console.log('REMINDER: This script only rewrites file contents. The actual')
console.log('folder moves (lib/philly/ → lib/deus/, etc.) must be done via')
console.log('`git mv` in a SEPARATE commit so git tracks them as renames')
console.log('(see EXTRACTION-PLAN.md §3).')
