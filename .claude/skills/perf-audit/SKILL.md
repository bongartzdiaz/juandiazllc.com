---
name: perf-audit
description: Performance audit van een page of component — Lighthouse scores, Core Web Vitals (LCP/CLS/INP), bundle-size, lazy-loading, image-optimization, font-loading, render-blocking, memoization-kansen. Output is gerangschikte fix-lijst per metric. Werkt voor HMB site, funnel-app, PT, Philly. Gebruik wanneer Juan vraagt "optimaliseer X", "Lighthouse score Y", "LCP te hoog", of vóór ads-launch.
trigger: /perf-audit
---

# /perf-audit

Performance-audit van een specifieke pagina of component. Pakt 4 lagen: Network, Render, JS-execution, Memoization.

## Usage

```
/perf-audit <url-of-pad>
/perf-audit <url> --target <mobile|desktop>     # default mobile
/perf-audit <url> --metric <lcp|cls|inp|tbt|fcp|all>
/perf-audit <url> --budget                       # check tegen budget (90+/2.5s/0.1)
```

## Hard rules

### Wat checken (in volgorde van impact)

1. **LCP (Largest Contentful Paint)** — target <2.5s mobile
2. **CLS (Cumulative Layout Shift)** — target <0.1
3. **INP (Interaction to Next Paint)** — target <200ms
4. **TBT (Total Blocking Time)** — proxy voor INP
5. **Bundle-size** — First Load JS <100KB voor pages
6. **Render-blocking resources** — fonts, CSS, sync scripts

### Targets per stack

| Stack | LCP | CLS | INP | First Load JS |
|---|---|---|---|---|
| HMB site (statisch) | ≤2.0s | ≤0.05 | n.v.t. | ≤80KB |
| funnel-app (Next.js 14) | ≤2.5s | ≤0.1 | ≤200ms | ≤100KB |
| PT dashboard (Vite) | ≤3.0s | ≤0.1 | ≤300ms | ≤200KB |
| Philly (Next.js 16) | ≤2.5s | ≤0.1 | ≤200ms | ≤120KB |

## Audit-checklist

### Network-laag
- [ ] HTML response <100KB compressed
- [ ] Fonts via `next/font` (auto preload + display:swap) of `<link rel="preload">`
- [ ] Hero-image: `priority` of `<link rel="preload" as="image">`
- [ ] Above-the-fold images: WebP/AVIF, exact afmetingen, `srcset` voor responsive
- [ ] Below-the-fold images: lazy (default in `<Image>`, anders `loading="lazy"`)
- [ ] Geen redirect-chains (max 1 hop)
- [ ] HTTP/2 (controleer headers)
- [ ] Compression (gzip/brotli) actief
- [ ] CDN voor statische assets

### Render-laag
- [ ] Geen render-blocking JS in `<head>` zonder `defer`/`async`
- [ ] Critical CSS inline, rest async
- [ ] Geen layout-shift door late-loaded fonts (FOUT)
- [ ] Image dimensies vooraf (`width`/`height` of aspect-ratio container)
- [ ] Geen layout-shift door ads/embeds — reserveer ruimte
- [ ] `font-display: swap` of betere strategy

### JS-execution
- [ ] Bundle-analyzer gerund (`@next/bundle-analyzer` of `vite-bundle-visualizer`)
- [ ] Lazy-load below-the-fold componenten met `next/dynamic` of `lazy()`
- [ ] Verzwaarde libs: `@vercel/og`, `chart.js`, `gsap`, `confetti`, `howler` — defer tot interaction
- [ ] Geen `import * as` van grote libs (treeshake-blocker)
- [ ] Polyfills alleen voor browser-targets die nodig zijn
- [ ] Server Components voor static content (Next.js)
- [ ] `'use client'` boundaries minimaal

### Memoization & re-renders
- [ ] `useMemo` voor expensive derive-calls in render-pad
- [ ] `useCallback` voor functions in `dependencies` van memoized children
- [ ] `React.memo` op leaf components met dure render
- [ ] TanStack Query `staleTime` ingesteld (default 0 = altijd refetch)
- [ ] Lijst-rendering met stabiele `key`-prop
- [ ] Geen inline `style={{...}}` in lange lijsten

## Bevindingen-format

```markdown
# Perf-audit: <url> — score X/100 (mobile)

## Metrics
| Metric | Waarde | Target | Status |
|---|---|---|---|
| LCP | 3.4s | 2.5s | RED |
| CLS | 0.02 | 0.1 | GREEN |
| ... | | | |

## HIGH-impact fixes (volgorde)
1. **Hero-image lazy ipv priority** — LCP 3.4s → ~2.1s
   - File: `app/page.tsx:24`
   - Voeg `priority` toe aan `<Image>`
2. ...

## MEDIUM-impact fixes
- ...

## LOW-impact fixes  
- ...

## Budget-check
- First Load JS: 142KB / budget 100KB — BUDGET OVERSCHREDEN
- Lazy-load `BatteryFitCalculator` (-45KB) → 97KB
```

## Tools per stack

### Lokaal Lighthouse
```bash
npx lighthouse https://helpmijbesparen.nl/thuisbatterij \
  --preset=mobile \
  --output=html \
  --output-path=./lh-report.html
```

### Next.js bundle-analyzer
```bash
ANALYZE=true npm run build
# of in next.config.js:
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
```

### Vite (PT)
```bash
npx vite-bundle-visualizer
```

### Real-user metrics
- Vercel Analytics (Speed Insights) — gratis tier
- Google Search Console → Core Web Vitals report
- Sentry beacon (huidig) — server-side, geen RUM

## Common fixes per smell

### LCP > 2.5s
- Hero-image `priority` (Next/Image)
- Preload hero font (`<link rel="preload" as="font">`)
- Server-render boven-fold content
- Cache-Control headers op HTML (`public, max-age=300, must-revalidate`)
- CDN voor statische assets
- Preconnect naar 3rd party origins (`<link rel="preconnect">`)

### CLS > 0.1
- Image `width`/`height` of aspect-ratio CSS
- Reserveer ruimte voor late-loaded ads/embeds
- `font-display: optional` of `swap` met `size-adjust`
- Geen content-injection na load

### INP > 200ms
- Defer hydration van non-critical componenten
- Web Workers voor zware berekeningen
- Debounce in form-input handlers
- Virtualization voor lange lijsten (TanStack Virtual)

### Bundle te groot
- `next/dynamic` voor route-specifieke heavy components
- Vervang Moment door date-fns of native Intl
- Vervang Lodash door native ES2020+ of `lodash-es` met treeshaking
- Lazy-init analytics/pixel (alleen na cookie-consent)

## Output flow
1. **Brief** — bevestig URL, target-device, scope
2. **Lighthouse run** of geestelijk-audit van code
3. **Metrics-tabel** met red/yellow/green
4. **Fix-lijst** gerangschikt op impact (HIGH/MED/LOW)
5. **Budget-check** als `--budget` flag
6. **Diff-suggestie** voor top-3 fixes als concrete code
7. **Volgende-stap** — wat eerst implementeren

## Combineer met
- `/audit-site` — voor breder dan alleen perf (security + SEO + a11y)
- `/refactor` — om memoization-kansen te realiseren
- `/lighthouse-fix` (TODO) — geautomatiseerde fixes
- `/ui-component` — voor lazy-load wrappers
