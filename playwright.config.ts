import { defineConfig, devices } from "@playwright/test";

/* Playwright config — smoke tests for the public marketing site.
 * Scope is deliberately narrow: one worker, one browser (Chromium),
 * one headless run per locale. The point is to catch regressions
 * that typecheck + Vitest can't — hydration errors, missing images,
 * 5xxs, title drift — without turning into a slow e2e suite.
 *
 * Local dev:   npm run test:e2e
 * Debug UI:    npm run test:e2e:ui
 * CI:          handled by .github/workflows/e2e.yml (builds + serves
 *              via `npm run start` so we test the production bundle). */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

// On CI the workflow builds first and runs `next start` in front of
// Playwright; locally we fall back to `next dev` for fast iteration.
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1280, height: 800 },
    // Honour the app's safety headers but don't fail on dev-only
    // CSP reports or beacon posts.
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI ? "npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    // Keep stdout quiet — only surface server logs when a test fails.
    stdout: "ignore",
    stderr: "pipe",
  },
});
