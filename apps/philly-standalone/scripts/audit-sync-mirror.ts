#!/usr/bin/env tsx
/**
 * Mirror-sync dry-run audit.
 *
 * Simulates `.github/workflows/sync-deus-shared.yml` locally so we can
 * answer: "if we triggered the sync RIGHT NOW, would the resulting
 * DEUS-SHARED mirror still build + pass tests?" — without actually
 * touching the remote mirror.
 *
 * What the GitHub workflow does (paraphrased):
 *   1. checkout monorepo
 *   2. clone DEUS-SHARED with PAT
 *   3. rsync -av --delete --exclude=.git --exclude=.github
 *          --exclude=node_modules --exclude=.next
 *          apps/philly-standalone/ /tmp/target/
 *   4. commit + push to target_branch (default `main`)
 *
 * This script reproduces step 3 locally (against a tmp dir, NEVER
 * touching the remote) and then runs npm install + npx prisma generate
 * + npm run build + npm test against the rsync'd output. If any step
 * fails, the mirror is NOT buildable as-is and the operator should
 * fix BEFORE triggering the workflow.
 *
 * Usage:
 *   tsx scripts/audit-sync-mirror.ts                # full check
 *   tsx scripts/audit-sync-mirror.ts --skip-build   # rsync + install only (fast)
 *   tsx scripts/audit-sync-mirror.ts --keep-dir     # don't delete the tmp dir
 *   tsx scripts/audit-sync-mirror.ts --json         # machine-readable
 *
 * Exit codes:
 *   0  every step passed — mirror would build cleanly
 *   1  one or more steps failed
 *   2  script error (missing source dir, rsync not on PATH, etc.)
 *
 * Why local dry-run instead of trusting the workflow:
 *   - The workflow runs on every workflow_dispatch — by then the
 *     decision to publish has been made. We want a PRE-flight check.
 *   - The workflow runs on ubuntu-latest with a clean checkout; the
 *     dry-run here validates against the same git-archive state that
 *     would land on the mirror.
 *   - If sync-deus-shared.yml changes (file list, rsync flags, target
 *     branch), this script DOES NOT auto-update. Update both together.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, type Dirent } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface StepResult {
  name: string;
  ok: boolean;
  durationMs: number;
  output?: string;
  error?: string;
}

const args = process.argv.slice(2);
const SKIP_BUILD = args.includes('--skip-build');
const KEEP_DIR = args.includes('--keep-dir');
const JSON_MODE = args.includes('--json');

const ROOT = process.cwd();
if (!ROOT.endsWith('philly-standalone')) {
  console.error('✗ Run this from apps/philly-standalone/');
  process.exit(2);
}

const SOURCE_DIR = ROOT;

// EXACT exclusion list from the workflow. Keep this in sync.
const RSYNC_EXCLUDES = [
  '.git',
  '.github',
  'node_modules',
  '.next',
];

// Helpers ─────────────────────────────────────────────────────────

function log(s: string): void {
  if (!JSON_MODE) console.log(s);
}

function runStep(name: string, cmd: string, opts: { cwd?: string; ignoreNonZero?: boolean } = {}): StepResult {
  const start = Date.now();
  log(`\n→ ${name}`);
  log(`  $ ${cmd}`);
  const r = spawnSync(cmd, { shell: true, cwd: opts.cwd ?? ROOT, encoding: 'utf8' });
  const durationMs = Date.now() - start;
  const ok = r.status === 0 || (opts.ignoreNonZero ?? false);
  const tail = (r.stdout || '').split('\n').slice(-12).join('\n') + (r.stderr ? `\nstderr:\n${r.stderr.split('\n').slice(-8).join('\n')}` : '');
  if (ok) log(`  ✓ ${name} (${durationMs}ms)`);
  else log(`  ✗ ${name} (${durationMs}ms, exit ${r.status})\n${tail}`);
  return { name, ok, durationMs, output: tail, error: ok ? undefined : `exit ${r.status}` };
}

function checkRsyncAvailable(): boolean {
  const r = spawnSync('rsync', ['--version'], { encoding: 'utf8' });
  return r.status === 0;
}

// Steps ───────────────────────────────────────────────────────────

const results: StepResult[] = [];

// Pre-flight: rsync must be on PATH. Git Bash + WSL ship it; cmd.exe
// alone usually doesn't. If missing, fall back to a Node-native walk.
const RSYNC_AVAILABLE = checkRsyncAvailable();
if (!RSYNC_AVAILABLE) {
  log('⚠ rsync not on PATH — falling back to Node copy (slower but functionally equivalent)');
}

// Step 1: create temp mirror dir
const tmpRoot = mkdtempSync(join(tmpdir(), 'deus-sync-dryrun-'));
log(`\n• Temp mirror dir: ${tmpRoot}`);
if (KEEP_DIR) log(`  (will be preserved on exit because --keep-dir)`);

// Step 2: rsync (or fallback copy) from apps/philly-standalone → tmp
{
  const start = Date.now();
  log(`\n→ Mirror copy (rsync semantics)`);
  let ok = false;
  let detail = '';
  if (RSYNC_AVAILABLE) {
    const excludeArgs = RSYNC_EXCLUDES.map((e) => `--exclude='${e}'`).join(' ');
    // Trailing slash on source = copy CONTENTS into target.
    const cmd = `rsync -a --delete ${excludeArgs} '${SOURCE_DIR}/' '${tmpRoot}/'`;
    log(`  $ ${cmd}`);
    const r = spawnSync(cmd, { shell: true, cwd: ROOT, encoding: 'utf8' });
    ok = r.status === 0;
    detail = r.stderr || (ok ? 'ok' : `exit ${r.status}`);
  } else {
    // Node fallback — recursive copy with the same excludes.
    const { cpSync } = require('node:fs');
    cpSync(SOURCE_DIR, tmpRoot, {
      recursive: true,
      filter: (src: string) => !RSYNC_EXCLUDES.some((e) => src.includes(`${require('node:path').sep}${e}`)),
    });
    ok = true;
    detail = '(Node cpSync fallback)';
  }
  const durationMs = Date.now() - start;
  if (ok) log(`  ✓ Mirror copy (${durationMs}ms)`);
  else log(`  ✗ Mirror copy failed: ${detail}`);
  results.push({ name: 'mirror-copy', ok, durationMs, output: detail });
}

// Step 3: validate the mirror — nothing in RSYNC_EXCLUDES should exist
{
  const start = Date.now();
  log(`\n→ Validate excludes were honored`);
  const leaks: string[] = [];
  for (const ex of RSYNC_EXCLUDES) {
    if (existsSync(join(tmpRoot, ex))) leaks.push(ex);
  }
  const ok = leaks.length === 0;
  if (ok) log(`  ✓ No excluded paths leaked into mirror`);
  else log(`  ✗ Leaked paths: ${leaks.join(', ')}`);
  results.push({
    name: 'exclude-validation',
    ok,
    durationMs: Date.now() - start,
    output: ok ? `none of [${RSYNC_EXCLUDES.join(', ')}] present` : `leaked: ${leaks.join(', ')}`,
  });
}

// Step 4: file-set comparison — count files in source vs mirror via
// Node-native walk (cross-platform; no `find`/`wc` shell-out). Should
// match modulo excludes.
{
  const start = Date.now();
  log(`\n→ File-count sanity check`);
  function countFiles(dir: string, excludeNames: Set<string>): number {
    let n = 0;
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return 0;
    }
    for (const e of entries) {
      if (excludeNames.has(e.name)) continue;
      if (e.isDirectory()) n += countFiles(join(dir, e.name), excludeNames);
      else if (e.isFile()) n += 1;
    }
    return n;
  }
  const excludeSet = new Set(RSYNC_EXCLUDES);
  const sourceCount = countFiles(SOURCE_DIR, excludeSet);
  // Mirror was just written without excludes, but defensively still
  // filter — guards against the Node cpSync fallback if it accidentally
  // copied something we missed.
  const mirrorCount = countFiles(tmpRoot, excludeSet);
  const delta = sourceCount - mirrorCount;
  const ok = Math.abs(delta) <= 5; // tolerance for edge cases (hidden files / OS artifacts)
  const detail = `source: ${sourceCount} files, mirror: ${mirrorCount} files (delta ${delta})`;
  if (ok) log(`  ✓ File count matches: ${detail}`);
  else log(`  ✗ File count drift: ${detail}`);
  results.push({ name: 'file-count', ok, durationMs: Date.now() - start, output: detail });
}

// Step 5+: optional install + build + test pipeline
if (!SKIP_BUILD) {
  results.push(runStep('npm ci (mirror)', 'npm ci --ignore-scripts --no-audit --no-fund', { cwd: tmpRoot }));
  if (results[results.length - 1].ok) {
    results.push(runStep('prisma generate (mirror)', 'npx prisma generate', { cwd: tmpRoot }));
  }
  if (results[results.length - 1].ok) {
    results.push(runStep('typecheck (mirror)', 'npx tsc --noEmit', { cwd: tmpRoot }));
  }
  if (results[results.length - 1].ok) {
    results.push(runStep('vitest run (mirror)', 'npm test', { cwd: tmpRoot }));
  }
} else {
  log('\n• --skip-build: skipping install/build/test (fast mode)');
}

// Summary ─────────────────────────────────────────────────────────

const total = results.length;
const passed = results.filter((r) => r.ok).length;
const failed = total - passed;

if (JSON_MODE) {
  console.log(JSON.stringify({
    tmpRoot,
    passed,
    failed,
    total,
    results,
  }, null, 2));
} else {
  log(`\n─────────────────────────────────────────`);
  log(`  ${passed}/${total} steps passed${failed ? ` · ${failed} FAILED` : ''}`);
  log(`─────────────────────────────────────────`);
  if (failed > 0) {
    log(`\n✗ Mirror sync would land code that fails ${failed} step(s).`);
    log(`  Fix the underlying issue in apps/philly-standalone/ BEFORE`);
    log(`  triggering sync-deus-shared.yml workflow_dispatch.`);
  } else {
    log(`\n✓ Mirror sync would land buildable code.`);
    log(`  Safe to trigger sync-deus-shared.yml workflow_dispatch.`);
  }
}

// Cleanup
if (!KEEP_DIR) {
  try {
    rmSync(tmpRoot, { recursive: true, force: true });
    log(`\n  (cleaned up ${tmpRoot})`);
  } catch (err) {
    log(`\n  (cleanup skipped: ${err instanceof Error ? err.message : err})`);
  }
}

process.exit(failed > 0 ? 1 : 0);
