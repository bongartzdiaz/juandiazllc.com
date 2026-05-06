---
name: audit-site
description: Diepe site-audit (performance, SEO, security, content, accessibility, schema) van een specifieke website. Gebruik wanneer Juan een grondige site-check wil van helpmijbesparen, voltafy, salderingsregeling, performancetracker of een andere site.
trigger: /audit-site
---

# /audit-site

Grondige website audit volgens NEXUS BOS standaarden + web vitals + security.

## Usage

```
/audit-site <domein>
/audit-site <domein> --depth deep      # crawl 100+ pagina's
/audit-site <domein> --scope perf      # alleen performance
/audit-site <domein> --scope seo
/audit-site <domein> --scope security
/audit-site <domein> --compare prev    # vs vorige audit
```

## Audit scopes (8)

### 1. Performance (Core Web Vitals)
- LCP (Largest Contentful Paint) — target <2.5s
- FID/INP (Interaction to Next Paint) — target <200ms
- CLS (Cumulative Layout Shift) — target <0.1
- TTFB — target <600ms
- Total page weight, image sizes, JS bundle size
- Render-blocking resources
- Source: PageSpeed Insights API + RUM data uit logboek_2026_04_24

### 2. SEO (NEXUS BOS verplicht — zie /seo-audit-page)
- Meta tags lengtes
- H1/H2/H3 hierarchie
- Schema markup (Article + FAQ JSON-LD)
- Canonical tags
- Sitemap.xml + robots.txt
- Internal link graph (5+ per pagina)
- External authority links
- Hreflang (indien multilingual)

### 3. Content kwaliteit
- Duplicate content detection
- Thin pages (<500 words)
- Geen prijsgaranties (HMB regel)
- Geen concurrent-bashing
- B1 reading level check
- E-E-A-T signals (auteur, datum, bronnen)

### 4. Accessibility (WCAG 2.1 AA)
- Alt-text op afbeeldingen
- Color contrast ≥4.5:1
- Keyboard navigation
- ARIA labels op interactive elementen
- Heading order (geen H1 → H3 sprong)

### 5. Security
- HTTPS + HSTS
- Mixed content warnings
- CSP headers
- X-Frame-Options
- Exposed `.env`, `.git`, `/admin` zonder auth
- Outdated CMS/plugin versions
- CORS config (PT: performancetracker.nl, NIET app.voltafy.nl)

### 6. Mobile
- Viewport meta
- Touch target sizes ≥48px
- Mobile-first responsive
- AMP (indien gebruikt)

### 7. Analytics & tracking
- Google Analytics / GTM correct geladen
- Pixel firing (Meta, GHL)
- Cookie consent compliant (NL/EU)
- UTM parameters intact bij redirects

### 8. Crawlability & indexering
- robots.txt audit
- Sitemap aanwezig en correct
- noindex per ongeluk?
- Search Console errors (Ahrefs GSC tools)
- Broken internal/external links

## Output

```
SITE AUDIT — <domein> — 2026-05-02

═══ OVERALL ═══
Health score: N/100
Crawled pages: N
Critical issues: N

═══ PERFORMANCE ═══
LCP: X.Xs [PASS/FAIL] (was Y.Ys)
INP: Xms [PASS/FAIL]
CLS: 0.XX [PASS/FAIL]
TTFB: Xms [PASS/FAIL]
Top 5 slowest pages: ...

═══ SEO ═══
Pages without title: N
Title >60 chars: N
Missing meta desc: N
Missing H1: N
Missing schema: N
Internal link issues: N
Top 10 underlinked pages: ...

═══ CONTENT ═══
Thin pages: N
Duplicate content clusters: N
Verboden content (prijzen/concurrenten): N

═══ ACCESSIBILITY ═══
Score: N/100
Top 5 issues: ...

═══ SECURITY ═══
HTTPS: ✓
HSTS: ✓/✗
Exposed paths: N
CSP: present/missing

═══ MOBILE ═══
Mobile-friendly: ✓/✗
Touch targets fail: N

═══ ANALYTICS ═══
GA4: ✓/✗
Meta Pixel: ✓/✗
Consent: ✓/✗

═══ CRAWL ═══
Indexable pages: N
Blocked: N
Broken links: N
4xx: N | 5xx: N

═══ TOP 10 PRIORITEITEN ═══
1. [KRITIEK] ...
...

═══ DELTA vs vorige audit ═══
Score: N → N (±N)
Nieuwe issues: N
Opgeloste issues: N

═══ MEMORY UPDATE ═══
Voorstel: project_site_audit_<domein>_<datum>.md
```

## Hard rules
- ALTIJD memory updaten na audit
- Bij KRITIEK security finding: Slack alert suggereren
- Voor HMB sites: extra check op prijsgarantie + concurrent-naam regels
- Voor PT: extra check CORS = performancetracker.nl
