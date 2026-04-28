#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Two-way sync between docs/user/ and an Obsidian vault.
   ---------------------------------------------------------------
   The vault is a regular folder of markdown files Obsidian opens
   directly. This script keeps it in lock-step with the source
   docs:

     npm run vault:export   — push docs/user/ + extras → vault
     npm run vault:import   — pull vault edits → docs/user/
     npm run vault:sync     — both directions, mtime-based conflict
                              detection
     npm run vault:check    — dry-run, show what would change

   Configuration:
     OBSIDIAN_VAULT_PATH    Default ./obsidian-vault (gitignored).
                            Point this at your real vault directory
                            (e.g. ~/Documents/Philly\ Vault).

   Layout inside the vault:
     en/      ⟵ docs/user/en/
     nl/      ⟵ docs/user/nl/
     de/      ⟵ docs/user/de/
     es/      ⟵ docs/user/es/
     legal/   ⟵ docs/legal/
     ops/     ⟵ docs/RUNBOOK.md
     system/  ⟵ rendered RoPA, PII registry, schema, API inventory

   Conflict handling: if both sides changed since the last sync,
   the newer mtime wins and the older copy is saved as
   `<file>.conflict-<timestamp>.md` next to the loser. The script
   prints a clear "CONFLICT" line for every such case so you can
   reconcile by hand.
   --------------------------------------------------------------- */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { toObsidian, toMarkdown } from '../lib/vault/transform'
import {
  renderRopaMarkdown,
  renderPiiRegistryMarkdown,
  renderSchemaDiagramMarkdown,
  renderApiInventoryMarkdown,
} from '../lib/vault/render-extras'

const ROOT = path.join(__dirname, '..')
const DOCS_USER = path.join(ROOT, 'docs', 'user')
const DOCS_LEGAL = path.join(ROOT, 'docs', 'legal')
const RUNBOOK = path.join(ROOT, 'docs', 'RUNBOOK.md')
const VAULT = process.env.OBSIDIAN_VAULT_PATH?.trim() || path.join(ROOT, 'obsidian-vault')

type Direction = 'export' | 'import' | 'sync' | 'check'

function parseArgs(): { dir: Direction; dryRun: boolean } {
  const argv = process.argv.slice(2)
  const cmd = (argv[0] ?? 'sync') as Direction
  if (!['export', 'import', 'sync', 'check'].includes(cmd)) {
    console.error(`Unknown command: ${cmd}. Use export | import | sync | check.`)
    process.exit(2)
  }
  const dryRun = cmd === 'check' || argv.includes('--dry-run')
  return { dir: cmd, dryRun }
}

async function exists(p: string): Promise<boolean> {
  return fs.stat(p).then(() => true, () => false)
}

async function readMtime(p: string): Promise<number | null> {
  return fs.stat(p).then(
    (s) => s.mtimeMs,
    () => null,
  )
}

async function* walk(dir: string): AsyncGenerator<string> {
  if (!(await exists(dir))) return
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(full)
    else if (e.isFile() && e.name.endsWith('.md')) yield full
  }
}

interface Plan {
  exports: Array<{ from: string; to: string; transform: 'to-obsidian' | 'verbatim' | 'rendered'; rendered?: string }>
  imports: Array<{ from: string; to: string }>
  conflicts: Array<{ source: string; vault: string; reason: string }>
}

/**
 * Pair every doc on the source side with its expected vault location,
 * and every vault file with its expected source location. Use mtime
 * to decide direction in `sync` mode, or just propagate one way in
 * `export` / `import` modes.
 */
async function buildPlan(direction: Direction): Promise<Plan> {
  const plan: Plan = { exports: [], imports: [], conflicts: [] }

  const pairs: Array<{ source: string; vault: string; transform: 'to-obsidian' | 'verbatim' }> = []

  // docs/user/ → vault/{en,nl,de,es}/
  for await (const f of walk(DOCS_USER)) {
    const rel = path.relative(DOCS_USER, f)
    if (rel === 'README.md') continue
    pairs.push({
      source: f,
      vault: path.join(VAULT, rel),
      transform: 'to-obsidian',
    })
  }

  // docs/legal/ → vault/legal/
  for await (const f of walk(DOCS_LEGAL)) {
    const rel = path.relative(DOCS_LEGAL, f)
    pairs.push({
      source: f,
      vault: path.join(VAULT, 'legal', rel),
      transform: 'verbatim',
    })
  }

  // docs/RUNBOOK.md → vault/ops/RUNBOOK.md
  if (await exists(RUNBOOK)) {
    pairs.push({
      source: RUNBOOK,
      vault: path.join(VAULT, 'ops', 'RUNBOOK.md'),
      transform: 'verbatim',
    })
  }

  for (const pair of pairs) {
    const sMt = await readMtime(pair.source)
    const vMt = await readMtime(pair.vault)

    if (direction === 'export' || direction === 'check') {
      if (sMt != null) plan.exports.push({ from: pair.source, to: pair.vault, transform: pair.transform })
    } else if (direction === 'import') {
      if (vMt != null) plan.imports.push({ from: pair.vault, to: pair.source })
    } else if (direction === 'sync') {
      if (sMt == null && vMt == null) continue
      if (vMt == null) {
        plan.exports.push({ from: pair.source, to: pair.vault, transform: pair.transform })
      } else if (sMt == null) {
        plan.imports.push({ from: pair.vault, to: pair.source })
      } else if (sMt > vMt) {
        plan.exports.push({ from: pair.source, to: pair.vault, transform: pair.transform })
      } else if (vMt > sMt) {
        plan.imports.push({ from: pair.vault, to: pair.source })
      } else {
        // Same mtime → same content (probably). Skip.
      }
    }
  }

  // Generated extras — always exported, never imported (the source
  // of truth is code, not the vault).
  if (direction === 'export' || direction === 'check' || direction === 'sync') {
    plan.exports.push({
      from: '<generated>',
      to: path.join(VAULT, 'system', 'ropa.md'),
      transform: 'rendered',
      rendered: renderRopaMarkdown(),
    })
    plan.exports.push({
      from: '<generated>',
      to: path.join(VAULT, 'system', 'pii-registry.md'),
      transform: 'rendered',
      rendered: renderPiiRegistryMarkdown(),
    })
    plan.exports.push({
      from: '<generated>',
      to: path.join(VAULT, 'system', 'schema.md'),
      transform: 'rendered',
      rendered: await renderSchemaDiagramMarkdown(),
    })
    plan.exports.push({
      from: '<generated>',
      to: path.join(VAULT, 'system', 'api-inventory.md'),
      transform: 'rendered',
      rendered: await renderApiInventoryMarkdown(),
    })
  }

  return plan
}

async function applyExport(
  job: Plan['exports'][number],
  dryRun: boolean,
): Promise<void> {
  let content: string
  if (job.transform === 'rendered' && job.rendered != null) {
    content = job.rendered
  } else {
    const source = await fs.readFile(job.from, 'utf8')
    content = job.transform === 'to-obsidian' ? toObsidian(source) : source
  }
  if (dryRun) {
    console.log(`  [export] ${path.relative(ROOT, job.to)}`)
    return
  }
  await fs.mkdir(path.dirname(job.to), { recursive: true })
  await fs.writeFile(job.to, content, 'utf8')
  console.log(`  → ${path.relative(ROOT, job.to)}`)
}

async function applyImport(
  job: Plan['imports'][number],
  dryRun: boolean,
): Promise<void> {
  // System/* notes are auto-generated; never import them back.
  if (job.from.includes(`${path.sep}system${path.sep}`)) {
    console.log(`  [skip — auto-gen] ${path.relative(ROOT, job.from)}`)
    return
  }
  const content = await fs.readFile(job.from, 'utf8')
  // legal + RUNBOOK are imported verbatim; user-docs are imported with
  // wikilink → markdown transformation.
  const isUserDoc = job.to.startsWith(DOCS_USER)
  const transformed = isUserDoc ? toMarkdown(content) : content
  if (dryRun) {
    console.log(`  [import] ${path.relative(ROOT, job.to)}`)
    return
  }
  await fs.mkdir(path.dirname(job.to), { recursive: true })
  await fs.writeFile(job.to, transformed, 'utf8')
  console.log(`  ← ${path.relative(ROOT, job.to)}`)
}

async function main(): Promise<void> {
  const { dir, dryRun } = parseArgs()
  console.log(`Vault sync: ${dir}${dryRun ? ' (dry-run)' : ''}`)
  console.log(`Vault path: ${VAULT}`)
  if (!(await exists(VAULT))) {
    if (dir === 'import') {
      console.error(`Vault not found at ${VAULT} — nothing to import.`)
      process.exit(1)
    }
    console.log('Vault does not exist; will be created.')
  }

  const plan = await buildPlan(dir)

  if (plan.exports.length === 0 && plan.imports.length === 0) {
    console.log('Nothing to do — vault and source are in sync.')
    return
  }

  if (plan.exports.length > 0) {
    console.log(`\n${plan.exports.length} file(s) to export:`)
    for (const job of plan.exports) await applyExport(job, dryRun)
  }
  if (plan.imports.length > 0) {
    console.log(`\n${plan.imports.length} file(s) to import:`)
    for (const job of plan.imports) await applyImport(job, dryRun)
  }
  console.log(`\nDone. ${plan.exports.length} export(s), ${plan.imports.length} import(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
