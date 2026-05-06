---
name: content-refresh
description: Refresh een bestaand artikel — update cijfers/datums, voeg interne links toe, verbeter schema, herschrijf decaying secties. Gebruik op pagina's uit /audit-content "decaying" of jaarlijkse refresh.
trigger: /content-refresh
---

# /content-refresh

Refresh van bestaand HMB artikel.

## Usage

```
/content-refresh <url-or-id>
/content-refresh <url-or-id> --reason decaying|outdated|seo
/content-refresh <url-or-id> --light    # alleen quick wins
```

## Flow

### 1. Diagnose
- Wanneer laatst bijgewerkt?
- Huidige ranking voor target keyword
- Traffic trend laatste 30/90d
- Pages die naar dit artikel linken (kunnen anchors aangepast?)
- /seo-audit-page draaien op deze URL

### 2. Inhoud-update areas
- [ ] Datums in body actueel? (vb "in 2024 verandert" → check huidig jaar)
- [ ] Cijfers actueel? (kWh prijzen, subsidies, BTW tarieven)
- [ ] Saldering 2027 info up-to-date?
- [ ] Concurrent producten genoemd? (Sigenergy, Sessy, Powerwall, Zonneplan Nexus, 1KOMMA5° Heartbeat) — features veranderen
- [ ] Wettelijke wijzigingen sinds laatste edit
- [ ] Bronnen >2 jaar oud → vervangen

### 3. SEO-update areas
- [ ] Title tag nog optimaal? (volume/intent verschoven?)
- [ ] Meta description CTA fris?
- [ ] H2/H3 toevoegen voor PAA opportunities (uit /audit-content)
- [ ] Schema (Article + FAQ) compleet?
- [ ] Interne links: 5+ aanwezig naar bestaande content?
- [ ] Externe authority links nog levend?
- [ ] Anchor text variatie OK?

### 4. UX/conversion
- [ ] CTA's nog passend en zichtbaar?
- [ ] Calculator/tool embed werkt?
- [ ] Above-the-fold info correct?

### 5. Compliance check
- [ ] Geen prijsgaranties geslopen
- [ ] Geen negatief over concurrenten
- [ ] B1 niveau intact
- [ ] Geen emojis

### 6. Save
Ofwel:
- Direct edit live (kleine wijziging) — confirm Juan
- Of: nieuwe versie als draft → review → publish via /supabase-publish

### 7. Memory + log
- `published_at` updaten in Supabase (signal aan Google)
- Notitie in `project_content_refreshes_<jaarmaand>.md`

## Output

```
CONTENT REFRESH — <url>
Laatste edit: [datum]
Diagnose: <reden refresh>

═══ WIJZIGINGEN ═══
Datums geupdate: N
Cijfers geupdate: N
Interne links: ±N
Externe links: ±N
H2/H3 toegevoegd: N
Schema fixes: N
Compliance: PASS

═══ DIFF SUMMARY ═══
+/- N regels
Toegevoegde secties: ...
Verwijderde secties: ...

═══ NEXT ═══
- Publish: /supabase-publish <id>
- Notify Search Console (sitemap ping)
```

## Hard rules
- ALTIJD compliance check (NEXUS BOS regels)
- Behoud canonical en URL — geen redirect chains zonder reden
- Update `published_at` voor freshness signal
