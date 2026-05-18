import { test, expect, type Page } from "@playwright/test";

/* Memory-leak probe.
 * ─────────────────────────────────────────────────────────────────
 * Navigates 50 times between public marketing routes and asserts
 * that the JS heap grows by less than 30% from baseline (post-GC) to
 * final (also post-GC).
 *
 * Catches regressions where a refactor accidentally leaves event
 * listeners attached after unmount, retains React state in closures
 * that should have been freed, or holds DOM nodes via global stores.
 * These are silent in unit tests (which never navigate) but
 * accumulate in production users' tabs and slow them down.
 *
 * Routes chosen: only PUBLIC marketing routes — the philly/* CRM
 * routes need an authenticated Supabase session that we don't set
 * up in CI. The leak pattern these probes look for (React+Next
 * shared infra: router, intl, image pipeline, font loader) is
 * common across both surfaces, so a leak in marketing strongly
 * predicts a leak in CRM too.
 *
 * Why 30%: heap measurements in Chromium are bucketed to ~5 MB
 * without `--enable-precise-memory-info` (we don't enable it here
 * because it requires a special launch flag and the bucketing
 * doesn't hide leaks of the magnitude we care about). 30% gives
 * comfortable headroom for noise; a real leak typically shows
 * 100%+ growth over 50 navigations.
 *
 * Why CDP GC: `window.gc()` requires `--js-flags=--expose-gc` at
 * launch. CDP's `HeapProfiler.collectGarbage` is reliable without
 * any launch-time configuration.
 *
 * Flake budget: if this becomes flaky, FIRST raise the threshold
 * (35–40%), don't disable the test. A flaky leak test still gates
 * against the worst regressions even if it lets 25% leaks pass.
 * ──────────────────────────────────────────────────────────────── */

const ROUTES = [
  "/en",
  "/en/pricing",
  "/en/about",
  "/en/contact",
  "/en/sectors",
] as const;

const NAVIGATIONS = 50;
const GROWTH_THRESHOLD_PCT = 30;

interface MemorySample {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

async function readHeap(page: Page): Promise<MemorySample> {
  return await page.evaluate(() => {
    const m = (performance as unknown as { memory?: MemorySample }).memory;
    return {
      usedJSHeapSize: m?.usedJSHeapSize ?? 0,
      totalJSHeapSize: m?.totalJSHeapSize ?? 0,
      jsHeapSizeLimit: m?.jsHeapSizeLimit ?? 0,
    };
  });
}

test("memory leak probe — 50 navigations between marketing routes", async ({
  page,
  context,
}) => {
  // 50 navigations × ~1-2s each plus build/server warmup easily blows past
  // Playwright's 30s default. 3 minutes is a comfortable ceiling — if the
  // test ever needs the full 3 minutes something else is wrong (frozen
  // page, leaking event listeners pinning navigation).
  test.setTimeout(180_000);

  // CDP session for reliable GC. Not all Playwright contexts support
  // CDP — Chromium does (which is what our config uses).
  const cdp = await context.newCDPSession(page);

  // Warm up: load the first route and let the framework finish hydrating.
  // Using `load` (vs `networkidle`) because marketing pages do background
  // analytics/font/image work that never quite goes idle but doesn't
  // affect the framework's mount/unmount lifecycle we're measuring.
  await page.goto(ROUTES[0], { waitUntil: "load" });
  await page.waitForTimeout(500);

  // Drain any startup garbage, then measure baseline.
  await cdp.send("HeapProfiler.collectGarbage");
  // After GC, give v8 a moment to settle counters.
  await page.waitForTimeout(300);
  const baseline = await readHeap(page);

  test.info().annotations.push({
    type: "metric",
    description: `Baseline heap: ${(baseline.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
  });

  // Skip the test entirely if performance.memory isn't exposed —
  // some Chromium builds need a flag we don't set. Don't fail; the
  // probe's purpose is regression detection, not platform coverage.
  if (baseline.usedJSHeapSize === 0) {
    test.skip(
      true,
      "performance.memory not available on this Chromium build; " +
        "skipping the leak probe (would need --enable-precise-memory-info)."
    );
  }

  // 50 navigations cycling through the routes. Each `goto` triggers a
  // full document replacement which exercises the framework's
  // mount/unmount lifecycle — that's where leaks live.
  for (let i = 0; i < NAVIGATIONS; i++) {
    const route = ROUTES[i % ROUTES.length];
    await page.goto(route, { waitUntil: "load" });
  }

  // Final GC + measurement.
  await cdp.send("HeapProfiler.collectGarbage");
  await page.waitForTimeout(300);
  const final = await readHeap(page);

  const growthBytes = final.usedJSHeapSize - baseline.usedJSHeapSize;
  const growthPct = (growthBytes / baseline.usedJSHeapSize) * 100;

  test.info().annotations.push({
    type: "metric",
    description: `Final heap: ${(final.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
  });
  test.info().annotations.push({
    type: "metric",
    description: `Growth: ${growthPct.toFixed(2)}% (+${(growthBytes / 1024).toFixed(0)} KB) over ${NAVIGATIONS} navigations`,
  });

  // Visible in test output too — helpful when debugging.
  // eslint-disable-next-line no-console
  console.log(
    `[memory-leak] baseline=${(baseline.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB ` +
      `final=${(final.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB ` +
      `growth=${growthPct.toFixed(2)}% threshold=${GROWTH_THRESHOLD_PCT}%`
  );

  expect(
    growthPct,
    `JS heap grew ${growthPct.toFixed(2)}% over ${NAVIGATIONS} navigations ` +
      `(${(growthBytes / 1024).toFixed(0)} KB). Threshold: ${GROWTH_THRESHOLD_PCT}%. ` +
      `Likely cause: a recent change retains state across navigations — ` +
      `event listeners not removed on unmount, modules holding DOM refs in ` +
      `closures, or a global store accumulating entries without bounds.`
  ).toBeLessThan(GROWTH_THRESHOLD_PCT);
});
