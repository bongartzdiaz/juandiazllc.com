---
name: seo-audit-page
description: On-page SEO audit van een specifieke URL tegen NEXUS BOS verplichte elementen (meta lengte, H1, interne links, schema, CTA's). Gebruik wanneer Juan vraagt om een SEO check, on-page audit, of optimalisatie van bestaande pagina.
trigger: /seo-audit-page
---

# /seo-audit-page

On-page SEO audit volgens CLAUDE.md §3 en §11 kwaliteitscheck.

## Usage

```
/seo-audit-page <url>
/seo-audit-page <url> --fix    # genereer concrete fix-suggesties per finding
```

## Audit checks

Fetch de URL en valideer:

### Meta & headings
- [ ] `<title>` aanwezig en ≤ 60 tekens
- [ ] `<title>` bevat primair keyword
- [ ] `<meta name="description">` aanwezig en ≤ 155 tekens
- [ ] Meta description bevat CTA
- [ ] Exact één `<h1>` op de pagina
- [ ] H1 bevat primair keyword
- [ ] H2/H3 structuur logisch en hierarchisch
- [ ] H2/H3 bevatten semantisch gerelateerde keywords

### Links
- [ ] ≥5 interne links naar bestaande content op zelfde domein
- [ ] 2-3 externe authority links (.gov, .nl overheid, kennisplatforms)
- [ ] Geen broken links
- [ ] Geen nofollow op interne links (tenzij bewust)

### CTAs
- [ ] ≥3 CTA's zichtbaar op pagina
- [ ] Minimaal 1 CTA above the fold

### Schema markup
- [ ] JSON-LD Article schema in `<head>`
- [ ] JSON-LD FAQ schema (indien FAQ aanwezig)
- [ ] Schema valideert (geen syntax errors)

### Technisch
- [ ] Canonical tag aanwezig en correct
- [ ] `lang="nl"` op `<html>`
- [ ] Open Graph tags aanwezig
- [ ] Geen noindex (tenzij bewust)

### Content (NEXUS BOS regels)
- [ ] Geen emojis in zichtbare content
- [ ] Geen prijsgaranties of exacte installatiekosten
- [ ] Geen negatieve uitspraken over concurrenten
- [ ] Concrete cijfers aanwezig (kWh, euro's, jaren)
- [ ] B1-niveau Nederlands

## Output format

```
SEO AUDIT — <url>
Status: <PASS/FAIL — N findings>

KRITIEK (blokkeert publicatie):
- [item] — <bevinding> — <fix>

BELANGRIJK:
- [item] — <bevinding> — <fix>

OPTIMALISATIE:
- [item] — <bevinding> — <fix>

SCORE: N/N items pass
```

## Bij --fix flag
Per finding: concrete code/copy suggestie die direct geplakt kan worden.
