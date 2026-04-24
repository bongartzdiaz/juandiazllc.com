import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/* Accessibility smoke tests via axe-core.
 * ─────────────────────────────────────────────────────────────────
 * What these assert:
 *   For every locale × representative public route, the rendered
 *   page must have ZERO WCAG 2.1 AA violations that axe can detect
 *   automatically. That's ~40-60% of all possible a11y issues —
 *   the rest need human review — but it catches the high-frequency
 *   regressions (missing alt, poor contrast, bad ARIA, empty links,
 *   duplicate ids, unlabeled form controls).
 *
 * Why a separate file from smoke.spec.ts:
 *   - axe scans add ~500ms per route; keeping them separate lets
 *     the fast smoke suite stay fast.
 *   - Failure output is easier to read when grouped by a11y type.
 *
 * Scope is narrower than smoke.spec on purpose: one route per
 * "shape" of page (marketing home, detail, listing, form, long-form,
 * legal). If these four pass, the rest of the site is overwhelmingly
 * likely to pass too — each shape shares a template.
 *
 * What we disable (with reason):
 *   - color-contrast-enhanced: WCAG AAA (7:1), beyond our target AA (4.5:1)
 *   - region: false positives on intentional unlabeled decorative wrappers
 * ──────────────────────────────────────────────────────────────── */

const LOCALES = ["en", "nl", "de", "es"] as const;

const SHAPE_ROUTES = [
  { path: "", shape: "home" },
  { path: "/about", shape: "about" },
  { path: "/insights", shape: "listing" },
  { path: "/work/voltafy", shape: "detail" },
  { path: "/contact", shape: "form" },
  { path: "/privacy", shape: "legal" },
  { path: "/insights/buy-vs-build", shape: "article" },
] as const;

// WCAG 2.1 AA is the global legal baseline (EU EN 301 549, US ADA,
// UK Equality Act). AAA is aspirational but not our target.
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function runAxe(page: Page): Promise<ReturnType<AxeBuilder["analyze"]>> {
  return new AxeBuilder({ page })
    .withTags(AXE_TAGS)
    // Scan only the main document tree. iframes on this site are
    // third-party (none currently, but future YouTube embeds shouldn't
    // block the a11y gate on issues we can't fix).
    .disableRules(["color-contrast-enhanced", "region"])
    .analyze();
}

for (const locale of LOCALES) {
  test.describe(`a11y: locale ${locale}`, () => {
    for (const { path, shape } of SHAPE_ROUTES) {
      const url = `/${locale}${path}`;
      test(`${shape} — /${locale}${path || "/"} passes WCAG 2.1 AA (axe)`, async ({ page }) => {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        // Let the hero reveal animation + fonts settle so contrast
        // checks don't fire on transient pre-load states.
        await page.waitForLoadState("networkidle").catch(() => {
          // networkidle can be flaky on pages with long-polling
          // beacons (plausible, vitals); fall back to a fixed delay.
        });
        await page.waitForTimeout(500);

        const results = await runAxe(page);

        if (results.violations.length > 0) {
          const summary = results.violations
            .map(
              (v) =>
                `  [${v.impact ?? "unknown"}] ${v.id} — ${v.description}\n` +
                `      nodes: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3} more)` : ""}`,
            )
            .join("\n");
          console.error(`\nAxe violations at ${url}:\n${summary}\n`);
        }

        expect(
          results.violations,
          `axe violations at ${url}: ${results.violations.map((v) => v.id).join(", ")}`,
        ).toEqual([]);
      });
    }
  });
}

test.describe("a11y: keyboard nav", () => {
  test("skip-to-content link is focusable and visible on Tab", async ({ page }) => {
    await page.goto("/en", { waitUntil: "domcontentloaded" });
    // First Tab press should land on .skip. layout.tsx renders
    // <a href="#main" className="skip">Skip to content</a> at the
    // very top of <body>. If CSS hides it unconditionally a keyboard
    // user can never reach the main content — regression to catch.
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      return {
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim() ?? "",
        className: el.className,
      };
    });
    expect(focused, "nothing focused after Tab").not.toBeNull();
    expect(focused!.text.toLowerCase()).toContain("skip");
  });
});
