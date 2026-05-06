---
name: schema-gen
description: Genereer JSON-LD schema markup (Article, FAQ, BreadcrumbList, Product, LocalBusiness, HowTo) voor HMB pagina's. Output is direct in <head> plakbaar. Gebruik wanneer een pagina schema mist of upgrade nodig heeft.
trigger: /schema-gen
---

# /schema-gen

JSON-LD schema generator voor NEXUS BOS sites.

## Usage

```
/schema-gen <type> <input>
```

Types:
- `article` — Article + Author + Publisher
- `faq` — FAQPage + Question/Answer pairs
- `breadcrumb` — BreadcrumbList
- `product` — Product + Offer + AggregateRating
- `localbusiness` — LocalBusiness (Voltafy)
- `howto` — HowTo + steps
- `webpage` — generic WebPage met sameAs
- `combo` — Article + FAQ + Breadcrumb in 1 bundle

## Input
URL of artikel-ID (Supabase). Tool fetcht body en extraheert auto:
- Article: title, datePublished, author, image, body
- FAQ: H2/H3 als question? + paragraph als answer
- Breadcrumb: van URL pad
- Product: prijs (NIET voor HMB — geen prijzen!)

## Output (article voorbeeld)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "...",
  "description": "...",
  "image": "https://helpmijbesparen.nl/images/...",
  "datePublished": "2026-05-02T08:00:00+02:00",
  "dateModified": "2026-05-02T08:00:00+02:00",
  "author": {
    "@type": "Person",
    "name": "...",
    "url": "https://helpmijbesparen.nl/auteurs/..."
  },
  "publisher": {
    "@type": "Organization",
    "name": "Help Mij Besparen",
    "logo": {
      "@type": "ImageObject",
      "url": "https://helpmijbesparen.nl/logo.png"
    }
  },
  "mainEntityOfPage": "https://helpmijbesparen.nl/..."
}
</script>
```

## Validation
- Test via Google Rich Results test
- Schema.org validator
- Output: PASS/FAIL met findings

## Hard rules
- Voor HMB: geen Product schema met prijs (CLAUDE.md prijsverbod)
- Voor BesparenBelgie: BTW-waarden 6% correct
- AggregateRating alleen met écht aanwezige reviews
- Author moet bestaande persoon zijn (geen fakes voor E-E-A-T)
- mainEntityOfPage moet matchen met canonical
- Datums in ISO 8601 met timezone (Europe/Amsterdam)
