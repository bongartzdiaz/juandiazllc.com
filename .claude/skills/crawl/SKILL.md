---
name: crawl
description: Crawl een URL of hele site — extract structuur, links, metadata, schema, content. Output als markdown of JSON. Gebruik voor competitive research, content analyse, of input voor andere skills.
trigger: /crawl
---

# /crawl

Crawl en extract van URL's of hele sites.

## Usage

```
/crawl <url>                            # 1 pagina
/crawl <url> --depth 2                  # follow links N levels deep
/crawl <url> --site                     # hele domein (max 100 pagina's)
/crawl <url> --extract <links|schema|content|all>
/crawl <url> --output <md|json>
/crawl <url> --save vault               # save naar Obsidian vault
```

## Extract types

### `links`
- Internal links + anchor text
- External links + anchor text + dofollow/nofollow
- Broken (4xx/5xx) detection

### `schema`
- JSON-LD blocks
- Microdata
- Open Graph
- Twitter Cards

### `content`
- H1/H2/H3 hierarchy
- Body text (clean, no nav/footer)
- Word count
- Reading level (Flesch-NL)
- Images + alt-text

### `all`
Alles bovenstaande + meta tags + canonical + lang + viewport + headers.

## Site-mode (--site)
- Respecteert robots.txt
- Sitemap.xml als seed
- Max 100 pagina's default
- Crawl-delay 1s (vriendelijk)
- User-Agent: identificeer als jezelf

## Output

Markdown:
```markdown
# CRAWL — <url>

## Meta
- Title: ...
- Description: ...
- Canonical: ...
- Lang: nl

## Schema
- Article: ✓
- FAQ: ✗
- BreadcrumbList: ✓

## Content
- H1: ...
- H2 count: N
- Words: N
- Reading level: B1 ✓

## Links
- Internal: N (10 unieke targets)
- External: N (3 .gov, 2 commercial)
- Broken: N

## Images
- Total: N
- Without alt: N
```

JSON: structured equivalent.

## Use cases
- Voor `/audit-site`: pre-fetch data
- Voor competitor research: `/crawl zonneplan.nl/thuisbatterij --extract content`
- Voor research → vault: `/crawl <bron> --save vault`

## Hard rules
- Respecteer robots.txt
- Crawl-delay >=1s
- Max 100 pagina's per --site (anders: explicit confirm)
- Sla GEEN persoonsgegevens op (PII filter)
- Voor competitor sites: alleen public/marketing pagina's, geen klantportals
- User-Agent moet identificeerbaar zijn (geen impersonation)
