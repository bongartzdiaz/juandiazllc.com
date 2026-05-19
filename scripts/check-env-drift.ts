#!/usr/bin/env tsx
/**
 * .env.example drift check for the root tree.
 *
 * Port of the `[2.envExampleDrift]` check in
 * `apps/philly-standalone/scripts/check-launch-readiness.ts` (PR #26).
 * Same regression class, applied to the marketing-site + /philly admin
 * tree. Catches `process.env.NEW_VAR` references that aren't declared
 * in `.env.example`, so operators setting up a fresh deployment know
 * every env var they need to provide.
 *
 * Usage:
 *   tsx scripts/check-env-drift.ts          # human-readable
 *   tsx scripts/check-env-drift.ts --json   # machine-readable for CI
 *
 * Exit codes:
 *   0   no drift (every code-referenced env var is declared OR ignored)
 *   1   drift detected
 *   2   script error (missing .env.example, unreadable source)
 */

import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');

const ROOT = process.cwd();

// Vars the runtime / host sets for us; never belong in .env.example.
// Same allow-list shape as the standalone's `ENV_EXAMPLE_IGNORE`.
const ENV_EXAMPLE_IGNORE = new Set([
  // Node.js / Next.js runtime
  'NODE_ENV',
  'NEXT_RUNTIME',
  // Vercel platform
  'NEXT_PUBLIC_VERCEL_ENV',
  // Build-time + bundle-analyzer toggle (set per-command, not vaulted)
  'ANALYZE',
  'GIT_COMMIT_SHA',
  // Dev-only escape hatch — deliberately undocumented in .env.example
  // so it doesn't ship to prod by accident. See ClientLayout.tsx's
  // ProtectedShell bypass.
  'NEXT_PUBLIC_BYPASS_AUTH',
]);

// Source areas to scan. Mirror the standalone's layout where it
// overlaps; add root-only directories (app/[locale], components/sections).
const SCAN_DIRS = ['app', 'lib', 'hooks', 'components', 'i18n', 'scripts'];
const SCAN_FILES_AT_ROOT = ['proxy.ts', 'instrumentation.ts', 'middleware.ts', 'next.config.mjs'];

// Directories to skip during walk.
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.turbo',
  'coverage',
  'playwright-report',
  'apps', // standalone has its own check
]);

function walkFiles(dir: string, baseForRelative: string = dir, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walkFiles(full, baseForRelative, out);
    else if (e.isFile()) out.push(relative(baseForRelative, full).replace(/\\/g, '/'));
  }
  return out;
}

function declaredKeys(): Set<string> {
  const envExample = join(ROOT, '.env.example');
  if (!existsSync(envExample)) {
    throw new Error('.env.example not found at root');
  }
  return new Set(
    readFileSync(envExample, 'utf8')
      .split('\n')
      .map((l) => l.match(/^([A-Z][A-Z0-9_]+)=/)?.[1])
      .filter((x): x is string => Boolean(x)),
  );
}

function referencedKeys(): Set<string> {
  const found = new Set<string>();
  const ENV_RE = /process\.env\.([A-Z][A-Z0-9_]+)/g;

  function scanFile(full: string, relativeName: string): void {
    // Skip test files (fixtures use vars that aren't real prod config).
    if (/\.(test|spec)\.(ts|tsx)$/.test(relativeName)) return;
    if (!/\.(ts|tsx|mjs)$/.test(relativeName)) return;
    // Don't scan this script itself (regex literal would self-trigger).
    if (full.endsWith(`scripts${sep}check-env-drift.ts`)) return;
    const content = readFileSync(full, 'utf8');
    let m: RegExpExecArray | null;
    while ((m = ENV_RE.exec(content))) found.add(m[1]);
  }

  for (const d of SCAN_DIRS) {
    const dirPath = join(ROOT, d);
    if (!existsSync(dirPath)) continue;
    for (const rel of walkFiles(dirPath, dirPath)) {
      scanFile(join(dirPath, rel), rel);
    }
  }
  for (const f of SCAN_FILES_AT_ROOT) {
    const full = join(ROOT, f);
    if (existsSync(full) && statSync(full).isFile()) scanFile(full, f);
  }
  return found;
}

let declared: Set<string>;
let referenced: Set<string>;
try {
  declared = declaredKeys();
  referenced = referencedKeys();
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

const missing = [...referenced]
  .filter((v) => !declared.has(v))
  .filter((v) => !ENV_EXAMPLE_IGNORE.has(v))
  .sort();

const totalNonIgnored = [...referenced].filter((v) => !ENV_EXAMPLE_IGNORE.has(v)).length;

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        ok: missing.length === 0,
        referenced: referenced.size,
        declared: declared.size,
        ignored: ENV_EXAMPLE_IGNORE.size,
        missing,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`Root .env.example drift check`);
  console.log(`  Referenced in code (non-test): ${referenced.size}`);
  console.log(`  Declared in .env.example:      ${declared.size}`);
  console.log(`  Ignored (runtime/platform):    ${ENV_EXAMPLE_IGNORE.size}`);
  console.log('');
  if (missing.length === 0) {
    console.log(`✓ No drift — all ${totalNonIgnored} non-ignored referenced vars are declared.`);
  } else {
    console.log(`✗ ${missing.length} env var(s) referenced in code but missing from .env.example:`);
    for (const v of missing) console.log(`    - ${v}`);
    console.log('');
    console.log('Fix one of:');
    console.log('  (a) add each to .env.example with a placeholder + comment explaining purpose, OR');
    console.log('  (b) add to ENV_EXAMPLE_IGNORE in this script (only for runtime/platform-set vars).');
  }
}

process.exit(missing.length === 0 ? 0 : 1);
