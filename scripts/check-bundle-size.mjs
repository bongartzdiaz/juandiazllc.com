#!/usr/bin/env node
/**
 * Bundle-size budget check. Runs after `next build` against the current
 * `.next/static/` output. Compares total + per-section sizes against
 * `bundle-size-baseline.json` and fails if any section grew more than
 * the threshold (default 10%).
 *
 * Per-route precision is not yet available with Next 16's Turbopack
 * (no `app-build-manifest.json` emitted), so the gate operates on
 * three coarse metrics:
 *   - total — every file under `.next/static/`
 *   - js    — every `.js` file (the dominant bloat vector)
 *   - css   — every `.css` file
 *   - other — everything else (media, fonts, source maps if any)
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs            # check against baseline
 *   node scripts/check-bundle-size.mjs --update   # write current sizes back to baseline
 *   node scripts/check-bundle-size.mjs --threshold=15  # custom % threshold
 */

import { readFileSync, writeFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STATIC_DIR = '.next/static';
const BASELINE_FILE = 'bundle-size-baseline.json';
const DEFAULT_THRESHOLD_PCT = 10;

const args = process.argv.slice(2);
const updateMode = args.includes('--update');
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const thresholdPct = thresholdArg
  ? Number(thresholdArg.split('=')[1])
  : DEFAULT_THRESHOLD_PCT;

if (!existsSync(STATIC_DIR)) {
  console.error(`✗ ${STATIC_DIR} not found — run \`next build\` first.`);
  process.exit(2);
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  let out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function bucketize(files) {
  const out = { total: 0, js: 0, css: 0, other: 0, fileCount: files.length };
  for (const f of files) {
    const size = statSync(f).size;
    out.total += size;
    if (f.endsWith('.js')) out.js += size;
    else if (f.endsWith('.css')) out.css += size;
    else out.other += size;
  }
  return out;
}

const current = bucketize(walk(STATIC_DIR));

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

if (updateMode) {
  const payload = {
    measuredAt: new Date().toISOString().slice(0, 10),
    note:
      'Snapshot of `.next/static/` after `next build`. Update by running ' +
      '`node scripts/check-bundle-size.mjs --update` after deliberately ' +
      'changing bundle content. The CI gate fails any PR that grows any ' +
      'section more than the configured threshold percent.',
    thresholdPct: DEFAULT_THRESHOLD_PCT,
    sizes: {
      total: current.total,
      js: current.js,
      css: current.css,
      other: current.other,
    },
    fileCount: current.fileCount,
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log(`✓ Baseline updated. Sizes:`);
  console.log(`  total: ${fmt(current.total)}`);
  console.log(`  js:    ${fmt(current.js)}`);
  console.log(`  css:   ${fmt(current.css)}`);
  console.log(`  other: ${fmt(current.other)}`);
  console.log(`  files: ${current.fileCount}`);
  process.exit(0);
}

if (!existsSync(BASELINE_FILE)) {
  console.error(`✗ ${BASELINE_FILE} not found. Run with --update to seed it.`);
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
const baselineSizes = baseline.sizes;

const sections = ['total', 'js', 'css', 'other'];
const results = sections.map((s) => {
  const cur = current[s];
  const base = baselineSizes[s] || 0;
  const delta = cur - base;
  const pct = base === 0 ? (cur === 0 ? 0 : Infinity) : (delta / base) * 100;
  const status = pct > thresholdPct ? 'FAIL' : 'OK';
  return { section: s, current: cur, baseline: base, delta, pct, status };
});

const failures = results.filter((r) => r.status === 'FAIL');

console.log(
  `Bundle-size check — threshold: +${thresholdPct}% per section`,
);
console.log('');
console.log(
  '  section  baseline      current       delta         pct      status',
);
console.log(
  '  -------  ------------  ------------  ------------  -------  ------',
);
for (const r of results) {
  const sign = r.delta >= 0 ? '+' : '';
  console.log(
    `  ${r.section.padEnd(7)}  ${fmt(r.baseline).padEnd(12)}  ${fmt(r.current).padEnd(12)}  ${(sign + fmt(r.delta)).padEnd(12)}  ${(sign + r.pct.toFixed(2) + '%').padEnd(7)}  ${r.status}`,
  );
}

if (failures.length > 0) {
  console.error('');
  console.error(`✗ ${failures.length} section(s) exceeded threshold:`);
  for (const f of failures) {
    console.error(`  - ${f.section}: ${f.pct.toFixed(2)}% growth (> ${thresholdPct}%)`);
  }
  console.error('');
  console.error(
    'If the growth is intentional, run `node scripts/check-bundle-size.mjs --update` and commit the new baseline.',
  );
  process.exit(1);
}

console.log('');
console.log('✓ All sections within budget.');
process.exit(0);
