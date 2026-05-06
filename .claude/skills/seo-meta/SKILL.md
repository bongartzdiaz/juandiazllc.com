---
name: seo-meta
description: Genereer Next.js Metadata API output voor een page — title, description, OpenGraph, Twitter Card, canonical, robots, alternates (i18n), schema.org JSON-LD. Combineert met /schema-gen voor JSON-LD. Werkt voor HMB site, funnel-app, salderingsregeling2027.nl. Gebruik wanneer Juan vraagt "voeg meta toe", "OG-tags voor X", of bij elke nieuwe page.
trigger: /seo-meta
---

# /seo-meta

Next.js Metadata + JSON-LD voor een pagina. Single source: `metadata` of `generateMetadata` in page-file.

## Usage
```
/seo-meta <pagina-pad>
/seo-meta <pagina-pad> --type <article|product|landing|calculator|listing>
/seo-meta <pagina-pad> --schema <Article|FAQ|HowTo|Product|LocalBusiness|BreadcrumbList>
/seo-meta <pagina-pad> --i18n "<locales>"
```

## Hard rules

### Title
- **≤60 tekens** (anders truncated in SERP)
- **Bevat primair keyword** (uit cluster-tabel)
- **Bevat brand** als ruimte: `... | Help Mij Besparen`
- **Pattern**: `<Concrete uitkomst> [Jaar] | <Brand>`

### Description
- **≤155 tekens**
- **Begint met benefit, niet brand**
- **Eindigt met CTA** ("Vraag rapport aan" / "Vergelijk in 2 min")
- **Geen quotes/extra spaces**

### Canonical
- **ALTIJD** zetten (voorkomt duplicate-content via UTM/?ref=)
- Pattern: `${process.env.NEXT_PUBLIC_SITE_URL}/<route-zonder-trailing-slash>`

### OpenGraph
- **og:image 1200×630** (16:9, geen tekst-in-image — overlay via OG-card route)
- **og:type** — `article`, `product`, of `website`
- **og:locale** — `nl_NL` voor HMB

### Twitter Card
- **`summary_large_image`** voor pages met hero-image
- **`summary`** voor functional pages

### Robots
- **`index: true, follow: true`** default
- **`index: false`** voor: thank-you pages, admin, login, internal tools
- **NOOIT `noindex` op landing-pages** (zonde van crawl-budget)

## Templates

### Static metadata (page weet meta vooraf)

```ts
// app/<route>/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thuisbatterij kopen 2026 — Vergelijk in 2 min | Help Mij Besparen",
  description: "Onafhankelijk advies, geen verkooppraat. Krijg in 2 min een persoonlijk besparingsrapport. Geen aankoopplicht.",
  alternates: {
    canonical: "https://helpmijbesparen.nl/thuisbatterij",
  },
  openGraph: {
    title: "Thuisbatterij kopen 2026",
    description: "Persoonlijk besparingsrapport in 2 minuten.",
    url: "https://helpmijbesparen.nl/thuisbatterij",
    siteName: "Help Mij Besparen",
    images: [{ url: "/og/thuisbatterij.png", width: 1200, height: 630, alt: "Thuisbatterij in meterkast" }],
    locale: "nl_NL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thuisbatterij kopen 2026",
    description: "Persoonlijk besparingsrapport in 2 minuten.",
    images: ["/og/thuisbatterij.png"],
  },
  robots: { index: true, follow: true },
};
```

### Dynamic metadata (afhankelijk van route-params)

```ts
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await fetchArticle(params.slug);
  if (!article) return { title: "Niet gevonden" };

  return {
    title: `${article.title} | Help Mij Besparen`,
    description: article.hero_text,
    alternates: { canonical: `https://helpmijbesparen.nl/blog/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.hero_text,
      type: "article",
      publishedTime: article.published_at,
      authors: [article.author],
      images: [article.featured_image],
    },
  };
}
```

### Dynamic OG image (Next.js)

```ts
// app/<route>/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div style={{ background: "#ffffff", display: "flex", padding: 80, height: "100%" }}>
        <h1 style={{ fontSize: 64, color: "#10b981" }}>Thuisbatterij Vergelijken</h1>
      </div>
    ),
    { ...size }
  );
}
```

## JSON-LD schema (combineer met /schema-gen)

```tsx
import Script from "next/script";

export default function Page() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Thuisbatterij kopen 2026",
    image: "https://helpmijbesparen.nl/og/thuisbatterij.png",
    datePublished: "2026-04-15",
    dateModified: "2026-05-04",
    author: { "@type": "Organization", name: "Help Mij Besparen" },
    publisher: {
      "@type": "Organization",
      name: "Help Mij Besparen",
      logo: { "@type": "ImageObject", url: "https://helpmijbesparen.nl/logo.png" },
    },
  };

  return (
    <>
      <Script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article>...</article>
    </>
  );
}
```

## i18n alternates

```ts
alternates: {
  canonical: "https://helpmijbesparen.nl/thuisbatterij",
  languages: {
    "nl-NL": "https://helpmijbesparen.nl/thuisbatterij",
    "nl-BE": "https://besparenbelgie.online/thuisbatterij",
    "x-default": "https://helpmijbesparen.nl/thuisbatterij",
  },
},
```

## Common-pages-defaults

| Page-type | title-pattern | robots | type |
|---|---|---|---|
| Pillar | `<Topic> [Jaar]: Volledige gids` | index | website |
| Cluster | `<Subtopic> uitgelegd` | index | article |
| Calculator | `<Iets> berekenen — gratis` | index | website |
| Landing | `<USP> — <CTA>` | index | website |
| Bedankt | `Bedankt — wat nu` | noindex | website |
| Privacy | `Privacy-verklaring` | index | website |
| 404 | `Pagina niet gevonden` | noindex | website |

## Output flow
1. **Brief** — bevestig page-type, primair keyword, doel
2. **`metadata` export** of `generateMetadata` function
3. **OG image** (link naar bestaand of `opengraph-image.tsx` snippet)
4. **JSON-LD** schema-blok (kies type)
5. **Test-suggestie** — Rich Results Test, Twitter Card Validator

## Combineer met
- `/schema-gen` — voor uitgebreide JSON-LD
- `/seo-audit-page` — review na live
- `/seo-publish` — voor HMB content-flow
- `/design-og-card` — voor visuele OG-design
