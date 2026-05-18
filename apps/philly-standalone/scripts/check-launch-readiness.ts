#!/usr/bin/env tsx
/**
 * Launch-readiness checker.
 *
 * Walks the items in docs/operations/GO-LIVE-CHECKLIST.md and runs the
 * ones that can be verified programmatically against the local repo and
 * (optionally) the production DB + Vercel env. The rest are listed with
 * a reference to the manual section.
 *
 * Usage:
 *   tsx scripts/check-launch-readiness.ts          # full report
 *   tsx scripts/check-launch-readiness.ts --json   # machine-readable
 *   tsx scripts/check-launch-readiness.ts --strict # exit 1 on ANY non-green (incl. manual unverified)
 *
 * Exit codes:
 *   0   all automated checks green
 *   1   one or more automated checks red
 *   2   the script itself errored (e.g. couldn't read a file)
 *
 * This is a gauge, not a gate. The operator still decides whether
 * manual items (counsel review, Stripe Dashboard config, etc.) are
 * truly done — the script can only verify what code + filesystem
 * expose. Use it as the "did I miss anything obvious" check at the
 * end of the launch walkthrough.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, type Dirent } from 'node:fs';
import { join, relative } from 'node:path';

type Status = 'PASS' | 'FAIL' | 'WARN' | 'MANUAL' | 'SKIP';

interface CheckResult {
  id: string;
  category: string;
  title: string;
  status: Status;
  detail?: string;
  reference?: string;
}

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const strictMode = args.includes('--strict');

const ROOT = process.cwd();
// Script must run from apps/philly-standalone/ (matches the rest of
// the script directory's convention).
const REPO_ROOT = ROOT.endsWith('philly-standalone')
  ? join(ROOT, '..', '..')
  : ROOT;

// Detect whether we're in the monorepo (apps/philly-standalone/ inside
// juandiazllc.com) or a standalone extract (DEUS-SHARED mirror, partner
// deploy clone). Several checks behave differently in each context — the
// monorepo has .github/workflows at REPO_ROOT and a working git repo;
// the standalone extract usually has neither.
const IS_STANDALONE_EXTRACT = !existsSync(join(REPO_ROOT, '.github', 'workflows'));
const HAS_GIT = existsSync(join(REPO_ROOT, '.git')) || existsSync(join(ROOT, '.git'));

const results: CheckResult[] = [];

function check(
  id: string,
  category: string,
  title: string,
  fn: () => Omit<CheckResult, 'id' | 'category' | 'title'>,
): void {
  try {
    const r = fn();
    results.push({ id, category, title, ...r });
  } catch (err) {
    results.push({
      id,
      category,
      title,
      status: 'FAIL',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

function fileContains(path: string, needle: string | RegExp): boolean {
  if (!existsSync(path)) return false;
  const content = readFileSync(path, 'utf8');
  return needle instanceof RegExp ? needle.test(content) : content.includes(needle);
}

/**
 * Recursively enumerate files under `dir`, skipping noise dirs like
 * node_modules, .next, .git. Used when git is unavailable (standalone
 * extract or partner-deploy clone without git history).
 */
function walkFiles(dir: string, baseForRelative: string = dir, out: string[] = []): string[] {
  const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', '.turbo', 'coverage']);
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

function safeExec(cmd: string, cwd = ROOT): { ok: boolean; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { ok: false, stdout: (e.stdout ?? '').toString().trim(), stderr: (e.stderr ?? '').toString().trim() };
  }
}

/* ── §1 Code state ───────────────────────────────────────────── */

check('1.1', 'Code state', 'Branch tip points at a tagged release', () => {
  const tag = safeExec('git describe --exact-match --tags HEAD', REPO_ROOT);
  if (!tag.ok) {
    return {
      status: 'WARN',
      detail: 'HEAD is not on a tagged commit. For first launch this is acceptable; for subsequent customer onboards, tag a release first.',
      reference: 'GO-LIVE-CHECKLIST §1.1',
    };
  }
  return { status: 'PASS', detail: `tag: ${tag.stdout}` };
});

check('1.2', 'Code state', 'Migrations applied to local DB', () => {
  // We can only check status if DATABASE_URL is set + reachable.
  if (!process.env.DATABASE_URL) {
    return {
      status: 'MANUAL',
      detail: 'DATABASE_URL not set in this shell — run `prisma migrate status` against your production DB manually.',
      reference: 'GO-LIVE-CHECKLIST §1.2',
    };
  }
  const status = safeExec('npx prisma migrate status');
  if (status.ok && /Database schema is up to date/i.test(status.stdout)) {
    return { status: 'PASS', detail: 'all migrations applied' };
  }
  return {
    status: 'FAIL',
    detail: status.stdout || status.stderr || 'unknown migrate status output',
    reference: 'GO-LIVE-CHECKLIST §1.2',
  };
});

check('1.4', 'Code state', 'audit:tenant clean', () => {
  const r = safeExec('npm run --silent audit:tenant 2>&1');
  if (r.ok) return { status: 'PASS', detail: 'no findings' };
  return {
    status: 'FAIL',
    detail: (r.stdout || r.stderr).split('\n').slice(-3).join('\n'),
    reference: 'GO-LIVE-CHECKLIST §1.4',
  };
});

check('1.7', 'Code state', 'No leftover [TO FILL] markers outside docs/legal/', () => {
  // Prefer `git ls-files` when git is available (faster, respects .gitignore).
  // Fall back to a filesystem walk for standalone extracts (DEUS-SHARED
  // mirror, partner deploy clones) where there's no git history.
  let candidates: string[];
  const gitList = HAS_GIT ? safeExec('git ls-files') : { ok: false, stdout: '', stderr: '' };
  if (gitList.ok) {
    candidates = gitList.stdout.split('\n').filter(Boolean);
  } else {
    candidates = walkFiles(ROOT);
  }
  candidates = candidates
    .filter((f) => /\.(ts|tsx|md)$/.test(f))
    // Exclude both legal AND operations docs: §1.7's intent is "code paths
    // the customer will touch". The operations runbooks legitimately mention
    // the `[TO FILL:` pattern when describing the marker convention, and
    // GO-LIVE-CHECKLIST.md itself has sign-off lines that stay unfilled
    // until launch.
    .filter((f) => !f.startsWith('docs/legal/') && !f.startsWith('docs/operations/'))
    // Exclude this script itself — it contains `[TO FILL:` as the literal
    // needle of its own grep, which would always self-trigger.
    .filter((f) => f !== 'scripts/check-launch-readiness.ts');
  const offenders: string[] = [];
  for (const f of candidates) {
    if (fileContains(join(ROOT, f), '[TO FILL:')) offenders.push(f);
  }
  if (offenders.length === 0) return { status: 'PASS' };
  return {
    status: 'FAIL',
    detail: `${offenders.length} file(s) with [TO FILL: outside docs/legal/: ${offenders.slice(0, 3).join(', ')}${offenders.length > 3 ? '...' : ''}`,
    reference: 'GO-LIVE-CHECKLIST §1.7',
  };
});

/* ── §2 Encryption + secrets (operator owns) ─────────────────── */

// App-level secrets the standalone code reads via process.env. Each
// one MUST be declared in .env.example (as a placeholder; real value
// lives in Vercel env + your vault). DEUS_SHARED_PAT is intentionally
// excluded — it's a GitHub Actions repository secret, not an app
// runtime env.
const REQUIRED_SECRETS = [
  'INTEGRATION_SECRET',
  'BLIND_INDEX_SECRET',
  'CRON_SECRET',
  'SENTRY_DSN',
  'SLACK_ALERTS_WEBHOOK',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_OPERATOR',
  'STRIPE_PRICE_TEAM',
  'STRIPE_PRICE_BUSINESS',
] as const;

for (const secret of REQUIRED_SECRETS) {
  check(`2.${secret}`, 'Secrets', `${secret} declared in .env.example`, () => {
    if (fileContains(join(ROOT, '.env.example'), new RegExp(`^${secret}=`, 'm'))) {
      return {
        status: 'PASS',
        detail: 'name present in .env.example — real value lives in your vault / Vercel env',
      };
    }
    return {
      status: 'FAIL',
      detail: `${secret} not declared in .env.example`,
      reference: 'GO-LIVE-CHECKLIST §2',
    };
  });
}

check('2.PII', 'Secrets', 'PII backfill scripts exist and are executable', () => {
  const scripts = [
    'scripts/encrypt-contact-notes.ts',
    'scripts/encrypt-contact-note-content.ts',
    'scripts/backfill-contact-blind-index.ts',
  ];
  const missing = scripts.filter((s) => !existsSync(join(ROOT, s)));
  if (missing.length) {
    return {
      status: 'FAIL',
      detail: `missing scripts: ${missing.join(', ')}`,
      reference: 'GO-LIVE-CHECKLIST §2.6',
    };
  }
  return { status: 'PASS', detail: `${scripts.length}/${scripts.length} scripts present` };
});

check('2.STRIPE.live', 'Secrets', 'Stripe webhook setup runbook documented', () => {
  const path = join(ROOT, 'docs/operations/STRIPE-SETUP.md');
  if (!existsSync(path)) {
    return { status: 'FAIL', detail: 'docs/operations/STRIPE-SETUP.md missing' };
  }
  return {
    status: 'MANUAL',
    detail: 'Follow STRIPE-SETUP.md to (a) create 3 Stripe products, (b) register webhook endpoint, (c) subscribe to 4 events, (d) run test-mode subscription end-to-end.',
    reference: 'STRIPE-SETUP.md §A-C',
  };
});

/* ── §3 Legal documentation ──────────────────────────────────── */

check('3.legal', 'Legal', 'docs/legal/ documents are present', () => {
  const legalDir = join(ROOT, 'docs/legal');
  if (!existsSync(legalDir)) {
    return { status: 'FAIL', detail: 'docs/legal/ directory does not exist' };
  }
  const stat = statSync(legalDir);
  if (!stat.isDirectory()) return { status: 'FAIL', detail: 'docs/legal is not a directory' };
  return { status: 'PASS' };
});

check('3.legal.fillins', 'Legal', '[TO FILL:] markers in legal docs remain', () => {
  // Enumerate docs/legal/*.md via git when available, filesystem otherwise.
  const legalDir = join(ROOT, 'docs', 'legal');
  if (!existsSync(legalDir)) {
    return { status: 'SKIP', detail: 'docs/legal/ does not exist in this extract' };
  }
  let files: string[];
  const gitList = HAS_GIT ? safeExec('git ls-files docs/legal') : { ok: false, stdout: '', stderr: '' };
  if (gitList.ok) {
    files = gitList.stdout.split('\n').filter((f) => f.endsWith('.md'));
  } else {
    files = walkFiles(legalDir, ROOT).filter((f) => f.endsWith('.md'));
  }
  let totalMarkers = 0;
  for (const f of files) {
    if (!existsSync(join(ROOT, f))) continue;
    const content = readFileSync(join(ROOT, f), 'utf8');
    const matches = content.match(/\[TO FILL:/g);
    if (matches) totalMarkers += matches.length;
  }
  if (totalMarkers === 0) {
    return { status: 'PASS', detail: 'all [TO FILL:] markers resolved' };
  }
  return {
    status: 'MANUAL',
    detail: `${totalMarkers} [TO FILL:] marker(s) remain across ${files.length} legal doc(s). Counsel review required before customer #1 — but DPO countersign on RoPA + DPIA can be deferred to milestone "post first customer" if you accept the risk in writing (see ACCEPTED-RISKS.md).`,
    reference: 'GO-LIVE-CHECKLIST §3',
  };
});

/* ── §4 Mirror sync (DEUS-SHARED) ────────────────────────────── */

check('4.mirror.workflow', 'Mirror', 'sync-deus-shared workflow exists on the deployed branch', () => {
  // Only meaningful in the monorepo context — partner deploys (standalone
  // extracts) ARE the mirror, so they don't ship the sync workflow itself.
  if (IS_STANDALONE_EXTRACT) {
    return {
      status: 'SKIP',
      detail: 'standalone extract / partner deploy — sync workflow lives in upstream monorepo, not here',
    };
  }
  const path = join(REPO_ROOT, '.github/workflows/sync-deus-shared.yml');
  if (!existsSync(path)) {
    return {
      status: 'FAIL',
      detail: '.github/workflows/sync-deus-shared.yml not found at repo root',
      reference: 'GO-LIVE-CHECKLIST §1.6',
    };
  }
  return { status: 'PASS', detail: relative(REPO_ROOT, path) };
});

check('4.mirror.token', 'Mirror', 'DEUS_SHARED_PAT secret reachable (manual)', () => {
  if (IS_STANDALONE_EXTRACT) {
    return {
      status: 'SKIP',
      detail: 'standalone extract / partner deploy — DEUS_SHARED_PAT is only meaningful upstream',
    };
  }
  return {
    status: 'MANUAL',
    detail: 'DEUS_SHARED_PAT must be set as a repository secret on bongartzdiaz/juandiazllc.com. Verify via gh secret list or in the repo Settings → Secrets and variables.',
    reference: 'GO-LIVE-CHECKLIST §1.6',
  };
});

/* ── §5 Backup-restore drill ─────────────────────────────────── */

check('5.backup-doc', 'Backups', 'BACKUP-RESTORE.md runbook present', () => {
  const path = join(ROOT, 'docs/operations/BACKUP-RESTORE.md');
  if (!existsSync(path)) return { status: 'FAIL', detail: 'BACKUP-RESTORE.md missing' };
  return { status: 'MANUAL', detail: 'Run the drill described in BACKUP-RESTORE.md and capture sign-off.' };
});

/* ── Summary ─────────────────────────────────────────────────── */

const tally: Record<Status, number> = { PASS: 0, FAIL: 0, WARN: 0, MANUAL: 0, SKIP: 0 };
for (const r of results) tally[r.status]++;

if (jsonMode) {
  console.log(JSON.stringify({ tally, results }, null, 2));
} else {
  const STATUS_COLOR: Record<Status, string> = {
    PASS: '\x1b[32m✓\x1b[0m',
    FAIL: '\x1b[31m✗\x1b[0m',
    WARN: '\x1b[33m!\x1b[0m',
    MANUAL: '\x1b[36m·\x1b[0m',
    SKIP: '\x1b[90m∼\x1b[0m',
  };
  console.log('Launch readiness — automated portion of GO-LIVE-CHECKLIST.md\n');
  let lastCategory = '';
  for (const r of results) {
    if (r.category !== lastCategory) {
      console.log(`\n  \x1b[1m${r.category}\x1b[0m`);
      lastCategory = r.category;
    }
    console.log(`    ${STATUS_COLOR[r.status]} [${r.id}] ${r.title}`);
    if (r.detail) console.log(`        ${r.detail}`);
    if (r.reference) console.log(`        ref: ${r.reference}`);
  }
  console.log('\n  ───────────');
  console.log(
    `  ${tally.PASS} pass · ${tally.FAIL} fail · ${tally.WARN} warn · ${tally.MANUAL} manual · ${tally.SKIP} skip`,
  );
  console.log('');
  if (tally.FAIL > 0) {
    console.log('  \x1b[31mAutomated checks: NOT READY\x1b[0m — see ✗ above.');
  } else if (tally.MANUAL > 0 || tally.WARN > 0) {
    console.log(
      '  \x1b[33mAutomated checks pass.\x1b[0m Manual items remain — see · and ! above. Walk them with LAUNCH-WALKTHROUGH.md.',
    );
  } else {
    console.log('  \x1b[32mEverything automatable is green.\x1b[0m Operator manual items still required before customer #1.');
  }
}

if (tally.FAIL > 0) process.exit(1);
if (strictMode && (tally.MANUAL > 0 || tally.WARN > 0)) process.exit(1);
process.exit(0);
