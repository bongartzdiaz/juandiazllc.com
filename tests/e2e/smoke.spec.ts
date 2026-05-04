import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/* Public-site smoke tests.
 * ─────────────────────────────────────────────────────────────────
 * What these assert (for every locale × public route):
 *   1. HTTP 200 — no 404s, no 500s
 *   2. <html lang> matches the URL locale — no mismatched SSR
 *   3. <title> is present and non-empty — no blank OG tab titles
 *   4. No unhandled console errors — catches hydration crashes,
 *      missing assets, broken client-only code that Vitest can't see
 *
 * What they do NOT try to assert:
 *   - copy-level i18n correctness (covered by Vitest + dict parity)
 *   - perf / Lighthouse (covered by lighthouse.yml workflow)
 *   - deep interactive flows (cost outweighs the signal at this
 *     stage; revisit if we start getting interactive-regression bugs)
 * ──────────────────────────────────────────────────────────────── */

const LOCALES = ["en", "nl", "de", "es"] as const;

// Shared static routes — every locale is expected to serve these.
// Detail pages (`/work/[slug]`, `/insights/[slug]`, etc.) are sampled
// separately below via a single known slug per type so the test set
// stays bounded as content grows.
const STATIC_ROUTES = [
  "",
  "/about",
  "/contact",
  "/story",
  "/now",
  "/uses",
  "/work",
  "/insights",
  "/sectors",
  "/signals",
  "/tools",
  "/tools/energy-roi",
  "/tools/peak-shift",
  "/tools/deal-cycle",
  "/privacy",
];

// One representative detail slug per type. If any of these get
// renamed the test fails loudly — which is what we want, because
// sitemap + internal links would silently break too.
const SAMPLE_DETAIL_ROUTES = [
  "/work/voltafy",
  "/work/philly",
  "/sectors/energy",
  "/sectors/real-estate",
  "/insights/the-build-vs-buy-trap",
  "/signals/instruments-not-saas",
];

type ConsoleBucket = { errors: string[]; warnings: string[] };

/** Block every request that isn't to our own origin so CI's network
 *  throttling on Plausible / Google Fonts / Sentry beacons can't flake
 *  the suite. Smoke is a structural test of our SSR — it does not
 *  care whether a third-party CDN happened to 429 or hit an SSL
 *  handshake bug during a particular run. The previous attempt to
 *  filter these errors out after they were already logged lost track
 *  of which message/location pairs Chromium emits, so we now stop
 *  the requests at the network layer instead. */
async function blockExternalRequests(page: Page) {
  const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);
  await page.route("**/*", (route) => {
    try {
      const host = new URL(route.request().url()).hostname;
      if (ALLOWED_HOSTS.has(host)) {
        return route.continue();
      }
      return route.abort();
    } catch {
      return route.continue();
    }
  });
}

/** Collect console errors/warnings while the page loads so we can
 *  assert on them after navigation. Browser-level errors surface
 *  here too (network, CORS, CSP, etc.). */
function attachConsoleBucket(page: Page): ConsoleBucket {
  const bucket: ConsoleBucket = { errors: [], warnings: [] };
  const onMsg = (msg: ConsoleMessage) => {
    const text = msg.text();
    const url = msg.location()?.url ?? "";
    if (msg.type() === "error" && !isIgnorableConsoleMessage(text, url)) {
      bucket.errors.push(text);
    } else if (msg.type() === "warning" && !isIgnorableConsoleMessage(text, url)) {
      bucket.warnings.push(text);
    }
  };
  page.on("console", onMsg);
  page.on("pageerror", (err) => {
    bucket.errors.push(`[pageerror] ${err.message}`);
  });
  return bucket;
}

// Hosts whose console-logged "Failed to load resource" / 429 / SSL
// errors are environmental noise from CI's network, not regressions
// in our app. Keep this list narrow — anything not on it should still
// trip the assertion.
const EXTERNAL_NOISE_HOSTS = [
  "plausible.io",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "sentry.io",
  "ingest.sentry.io",
];

function isIgnorableConsoleMessage(text: string, url = ""): boolean {
  // Filter by location URL first — Chrome's "Failed to load resource"
  // message doesn't include the host in the body text, only in the
  // location field. Without this check, a 429 on a Plausible beacon
  // would slip past the text-substring filter below.
  if (url) {
    const host = (() => { try { return new URL(url).host; } catch { return ""; } })();
    if (EXTERNAL_NOISE_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return true;
    }
  }
  const noise = [
    "Download the React DevTools",
    "next-dev",
    "Fast Refresh",
    // Plausible fails in local dev when NEXT_PUBLIC_PLAUSIBLE_DOMAIN isn't set
    "plausible",
    // CSP report-only warnings during dev
    "Content Security Policy",
    // Google fonts race warnings on slow networks
    "fonts.googleapis.com",
  ];
  return noise.some((n) => text.toLowerCase().includes(n.toLowerCase()));
}

// Bundle CN — block external hosts globally for every test that
// uses the `page` fixture. Tests that only use `request` (the
// proxy/redirect block below) skip this hook automatically.
test.beforeEach(async ({ page }) => {
  await blockExternalRequests(page);
});

for (const locale of LOCALES) {
  test.describe(`locale: ${locale}`, () => {
    for (const path of STATIC_ROUTES) {
      const url = `/${locale}${path}`;
      test(`GET ${url} responds, has <title>, matches lang`, async ({ page }) => {
        const bucket = attachConsoleBucket(page);
        const res = await page.goto(url, { waitUntil: "domcontentloaded" });

        expect(res, `no response for ${url}`).not.toBeNull();
        expect(res!.status(), `non-2xx at ${url}`).toBeLessThan(400);

        const title = await page.title();
        expect(title.length, `empty <title> at ${url}`).toBeGreaterThan(0);

        const htmlLang = await page.locator("html").getAttribute("lang");
        expect(htmlLang, `missing <html lang> at ${url}`).toBeTruthy();
        // `translate()` cookie can override layout.tsx — but the URL
        // locale is authoritative for SSR rendering paths, so <html
        // lang> should match the URL prefix. Accept bare code or
        // region-qualified (en / en-US).
        expect(htmlLang!.toLowerCase().startsWith(locale), `html lang "${htmlLang}" does not match URL locale "${locale}" at ${url}`).toBe(true);

        expect(bucket.errors, `console errors at ${url}: ${bucket.errors.join(" | ")}`).toHaveLength(0);
      });
    }

    for (const path of SAMPLE_DETAIL_ROUTES) {
      const url = `/${locale}${path}`;
      test(`GET ${url} (detail) responds`, async ({ page }) => {
        const bucket = attachConsoleBucket(page);
        const res = await page.goto(url, { waitUntil: "domcontentloaded" });
        expect(res!.status(), `non-2xx at ${url}`).toBeLessThan(400);
        const title = await page.title();
        expect(title.length).toBeGreaterThan(0);
        expect(bucket.errors, `console errors at ${url}: ${bucket.errors.join(" | ")}`).toHaveLength(0);
      });
    }

    test(`per-locale OG image /${locale}/opengraph-image is reachable`, async ({ request }) => {
      const res = await request.get(`/${locale}/opengraph-image`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toMatch(/image\/(png|jpeg|jpg)/i);
    });
  });
}

test.describe("proxy (root redirect + locale detection)", () => {
  test("GET / with Accept-Language: nl redirects to /nl", async ({ request }) => {
    const res = await request.get("/", {
      headers: { "accept-language": "nl-NL,nl;q=0.9" },
      maxRedirects: 0,
    });
    // 307 per proxy.ts. We follow manually to assert the location.
    expect([301, 302, 307, 308]).toContain(res.status());
    const loc = res.headers()["location"];
    expect(loc, "no Location header on /").toBeTruthy();
    expect(loc!).toMatch(/\/nl(\/|$|\?)/);
  });

  test("GET / with Accept-Language: de redirects to /de", async ({ request }) => {
    const res = await request.get("/", {
      headers: { "accept-language": "de-DE,de;q=0.9" },
      maxRedirects: 0,
    });
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]!).toMatch(/\/de(\/|$|\?)/);
  });

  test("GET /about without locale redirects to /{locale}/about", async ({ request }) => {
    const res = await request.get("/about", {
      headers: { "accept-language": "en-US,en;q=0.9" },
      maxRedirects: 0,
    });
    expect([301, 302, 307, 308]).toContain(res.status());
    expect(res.headers()["location"]!).toMatch(/\/en\/about$/);
  });

  test("GET /sitemap.xml is locale-exempt (no redirect)", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/xml/);
  });

  test("GET /robots.txt is locale-exempt (no redirect)", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
  });
});

test.describe("seo metadata", () => {
  for (const locale of LOCALES) {
    test(`/${locale} emits full hreflang alternate set`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
        links.map((l) => (l as HTMLLinkElement).hreflang),
      );
      // Expect en, nl, de, es, x-default.
      for (const expected of ["en", "nl", "de", "es", "x-default"]) {
        expect(hreflangs, `missing hreflang=${expected} at /${locale}`).toContain(expected);
      }
    });

    test(`/${locale} includes Organization or Person JSON-LD`, async ({ page }) => {
      await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
      const blocks = await page.locator('script[type="application/ld+json"]').allInnerTexts();
      const parsed = blocks.map((b) => {
        try {
          return JSON.parse(b);
        } catch {
          return null;
        }
      });
      const types = parsed.filter((p) => p).map((p) => (p as { "@type"?: string })["@type"]);
      expect(types.length, `no valid JSON-LD on /${locale}`).toBeGreaterThan(0);
      // Homepage ships Organization + WebSite from layout.tsx plus
      // FAQPage from the /{locale} route itself.
      expect(types.some((t) => t === "Organization" || t === "WebSite" || t === "FAQPage")).toBe(true);
    });
  }
});
