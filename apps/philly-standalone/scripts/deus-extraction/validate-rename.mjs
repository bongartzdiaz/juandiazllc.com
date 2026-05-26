#!/usr/bin/env node
/* scripts/deus-extraction/validate-rename.mjs
   ──────────────────────────────────────────────────────────────────
   Post-rename audit. Run after rename-philly.mjs + folder moves to
   confirm no stragglers remain.

   Reports any residual reference to "philly" or "Philly" in the
   non-historical surface. Acceptable findings:
     - memory/* (historical context docs)
     - REBRAND-PLAN.md, EXTRACTION-PLAN.md (the docs ABOUT the rename)
     - Git blame comments (e.g. "// Bundle PHILLY — added in PR #X")
     - Past-tense narrative ("was called philly", "the old philly path")

   Anything else = bug — surface it. Exit code 1 on findings.

   ## Usage
     node scripts/deus-extraction/validate-rename.mjs           # human report
     node scripts/deus-extraction/validate-rename.mjs --json    # JSON output
     node scripts/deus-extraction/validate-rename.mjs --strict  # also fail on comment matches
   --------------------------------------------------------------- */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const strict = args.includes('--strict')

const EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml'])

// Surfaces where "philly" is intentionally preserved (historical context).
// Pass --strict to also flag these.
const HISTORICAL = [
  /^docs\/operations\/REBRAND-PLAN\.md$/,
  /^docs\/operations\/EXTRACTION-PLAN\.md$/,
  /^scripts\/deus-extraction\//,
  /^memory\//,
]

const SKIP = [
  /\bnode_modules\b/,
  /\.next\b/,
  /\bdist\b/,
  /\bbuild\b/,
  /package-lock\.json$/,
  /\.lock$/,
  /\.log$/,
]

function shouldSkip(rel) {
  return SKIP.some(re => re.test(rel.split(sep).join('/')))
}
function isHistorical(rel) {
  return HISTORICAL.some(re => re.test(rel.split(sep).join('/')))
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

const findings = []
const histFindings = []

for (const f of walk(ROOT)) {
  const rel = relative(ROOT, f).split(sep).join('/')
  const content = readFileSync(f, 'utf8')
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match "philly" or "Philly" (case-sensitive — preserving "PhilanthropyAI"
    // which the branding pass already removed from customer surfaces; if
    // PhilanthropyAI appears that's a separate concern).
    if (/\b[Pp]hilly\b/.test(line) || /\bPhilanthropyAI\b/.test(line)) {
      const target = isHistorical(rel) ? histFindings : findings
      target.push({ file: rel, line: i + 1, text: line.trim().slice(0, 160) })
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({ findings, historical: histFindings }, null, 2))
} else {
  console.log(`Validation result: ${findings.length} non-historical finding(s)`)
  if (findings.length > 0) {
    console.log()
    for (const f of findings.slice(0, 50)) {
      console.log(`  ${f.file}:${f.line}`)
      console.log(`    ${f.text}`)
    }
    if (findings.length > 50) console.log(`  … and ${findings.length - 50} more`)
  } else {
    console.log('  ✓ no straggler "philly" / "Philly" / "PhilanthropyAI" references in production surface')
  }
  console.log()
  console.log(`Historical references (acceptable): ${histFindings.length}`)
  if (strict && histFindings.length > 0) {
    console.log('  (strict mode — would fail here)')
  }
}

const hasFailures = findings.length > 0 || (strict && histFindings.length > 0)
process.exit(hasFailures ? 1 : 0)
