---
name: lighthouse-fix
description: Fix common Lighthouse-issues op een page — LCP, CLS, INP, TBT, accessibility, best-practices, SEO. Pakt concrete fixes uit lighthouse-rapport en converteert naar code-edits. Anders dan /perf-audit (die diagnose); deze fixt. Gebruik wanneer Juan een Lighthouse-rapport heeft en wil weten "fix het".
trigger: /lighthouse-fix
---

# /lighthouse-fix

Fix-side van Lighthouse-rapport. Input is een rapport (HTML of JSON), output is concrete diff per finding.

## Usage
```
/lighthouse-fix <url-of-rapport>
/lighthouse-fix <url> --metric <lcp|cls|inp|a11y|seo|all>
/lighthouse-fix <url> --apply              # genereer Edit-actions ipv suggesties
```

## Common fixes per metric

### LCP — Largest Contentful Paint

**Hero-image niet `priority`**
```tsx
// VOOR
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} />
// NA
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

**Hero-image te zwaar**
```tsx
// Genereer modern formaten + size
import Image from "next/image";
<Image
  src="/hero.webp"
  alt="..."
  width={1200} height={600}
  priority
  sizes="(max-width: 768px) 100vw, 1200px"
  quality={85}
/>
```

**Custom font blokkeert render**
```tsx
// VOOR (in head)
<link href="https://fonts.googleapis.com/..." rel="stylesheet" />
// NA (Next.js)
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap" });
// In layout: <body className={inter.className}>
```

**Geen preconnect naar 3rd party origins**
```tsx
// app/layout.tsx
<head>
  <link rel="preconnect" href="https://www.googletagmanager.com" />
  <link rel="preconnect" href="https://connect.facebook.net" />
</head>
```

**Server-render niet gebruikt**
```tsx
// VOOR
"use client";
useEffect(() => { fetch("/api/data").then(...) }, []);
// NA (Next.js Server Component)
const data = await fetch("...").then(r => r.json());
return <Hero data={data} />;
```

### CLS — Cumulative Layout Shift

**Image dimensions ontbreken**
```tsx
// VOOR
<img src="/x.jpg" />
// NA
<Image src="/x.jpg" width={400} height={300} alt="..." />
// Of:
<img src="/x.jpg" width="400" height="300" style={{ aspectRatio: "4/3" }} />
```

**Late-loaded font shift**
```tsx
import { Inter } from "next/font/google";
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,   // matcht fallback metrics
});
```

**Ad/embed slot zonder reservatie**
```tsx
// VOOR
{loaded && <Embed />}
// NA
<div style={{ minHeight: 400 }}>
  {loaded ? <Embed /> : <EmbedSkeleton />}
</div>
```

**Skeleton dimensies fout**
```tsx
// Skeleton MOET exact dezelfde grootte hebben als eindstaat
<div className="h-9 w-32 rounded bg-gray-100 animate-pulse" />
// In de echte component: <div className="h-9 w-32"><h2>...</h2></div>
```

### INP / TBT — Interaction to Next Paint

**Heavy JS in main-thread**
```tsx
// VOOR
const result = expensiveCalc(data);  // sync, blocks
// NA (move to Web Worker of useDeferredValue)
const deferredData = useDeferredValue(data);
const result = useMemo(() => expensiveCalc(deferredData), [deferredData]);
```

**Long tasks bij hydration**
```tsx
// Lazy-load below-fold
import dynamic from "next/dynamic";
const HeavyChart = dynamic(() => import("./HeavyChart"), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

**Re-renders bij elke key-press**
```tsx
// Debounce filter input
const [search, setSearch] = useState("");
const debouncedSearch = useDeferredValue(search);
const filtered = useMemo(() => filter(items, debouncedSearch), [items, debouncedSearch]);
```

### Accessibility

**Form-input zonder label**
```tsx
// VOOR
<input type="email" placeholder="Email" />
// NA
<label htmlFor="email">Email</label>
<input id="email" type="email" autoComplete="email" />
```

**Color contrast onvoldoende**
```css
/* VOOR */
.muted { color: #999; background: #fff; }  /* 2.85:1 — fail */
/* NA */
.muted { color: #6b7280; background: #fff; } /* 4.7:1 — AA pass */
```

**Image zonder alt**
```tsx
// VOOR
<Image src="/icon.svg" />
// NA — informational
<Image src="/icon.svg" alt="Pijl naar rechts" />
// Of decorative:
<Image src="/icon.svg" alt="" />
```

**Heading hierarchy spring**
```tsx
// VOOR
<h1>Page</h1>
<h3>Sub</h3>  // sprong h1 → h3
// NA
<h1>Page</h1>
<h2>Sub</h2>
```

### SEO

**Meta description ontbreekt**
```tsx
export const metadata = {
  title: "...",
  description: "Concrete uitkomst, ≤155 char, eindigt met CTA.",
};
```

**Canonical mist**
```tsx
alternates: { canonical: "https://your-domain.nl/page" }
```

**`<html lang>` ontbreekt**
```tsx
// app/layout.tsx
<html lang="nl">
```

### Best practices

**HTTPS niet enforced**
```nginx
# nginx
return 301 https://$host$request_uri;
```

**Console errors in productie**
```tsx
// Strip console.log in build
// next.config.js
compiler: {
  removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
},
```

## Output flow

1. Parse Lighthouse-rapport (input)
2. Per finding → fix-suggestion (vóór/na)
3. Group per file (zodat 1× per file editen)
4. Sorteer op impact (LCP > CLS > INP > a11y > SEO > best-practices)
5. Output als markdown rapport of als directe Edit-calls (met `--apply`)

## Combineer met
- `/perf-audit` — voor de diagnose-stap
- `/a11y-audit` — voor diepere a11y dan Lighthouse-niveau
- `/responsive-check` — perf-targets verschillen mobile vs desktop
- `/refactor` — als fix grotere herstructurering vraagt
