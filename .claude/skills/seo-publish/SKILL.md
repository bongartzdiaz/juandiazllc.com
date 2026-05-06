---
name: seo-publish
description: Volledige HMB content publicatie flow — schrijf artikel → SEO checklist → Supabase insert (pending_review) → Slack notif. Gebruik wanneer Juan een nieuw artikel wil publiceren voor helpmijbesparen.nl, salderingsregeling2027.nl of voltafy.nl.
trigger: /seo-publish
---

# /seo-publish

End-to-end content publicatie flow voor NEXUS BOS sites. Volgt CLAUDE.md §3 en §11.

## Usage

```
/seo-publish <topic>                         # nieuw artikel rond topic
/seo-publish <topic> --site helpmijbesparen # specificeer site (default: helpmijbesparen)
/seo-publish <topic> --type pillar          # pillar|cluster|calculator|nieuws
/seo-publish --draft <pad>                  # bestaande draft door flow halen
```

## Flow (verplicht in deze volgorde)

### 1. Brief opstellen
- Bepaal primair keyword uit §12 keyword tabel
- Identificeer cluster (Thuisbatterij / Saldering / Teruglever / Zelfverbruik / Voltafy)
- Bepaal lengte op basis van type:
  - pillar: 2.500–3.000 woorden
  - cluster: 1.200–1.800
  - calculator: 1.000–1.500
  - nieuws: 600–900
- Zoek 5+ bestaande artikelen voor interne links
- Vind 2–3 externe authority bronnen (.gov, .nl overheid, kennisplatforms)

### 2. Artikel schrijven (volg tone of voice §2)
- B1-niveau Nederlands, geen emojis, geen marketing-hype
- Concrete cijfers (kWh, euro's, jaren)
- GEEN prijsgaranties, GEEN exacte installatiekosten
- GEEN negatieve uitspraken over concurrenten
- Schrijf als betrouwbare energieadviseur
- Gebruik semantische begrippen uit §12 (terugleverkosten, zelfverbruik, peak shaving, etc.)

### 3. SEO Checklist — ALLE items moeten ✓ zijn
```
[ ] title_tag ≤ 60 tekens, bevat primair keyword
[ ] meta description ≤ 155 tekens, bevat CTA
[ ] h1 bevat primair keyword, uniek per pagina
[ ] H2-H3 hebben semantisch gerelateerde keywords
[ ] ≥5 interne links naar bestaande content
[ ] 2-3 externe authority links
[ ] ≥3 CTA's geplaatst
[ ] Schema markup: Article + FAQ JSON-LD
[ ] Canonical tag correct
[ ] Zoekintentie correct beantwoord
[ ] Geen prijsgaranties of verboden content
```

Print checklist met ✓/✗ en STOP als één item ✗.

### 4. Supabase insert
Gebruik EXACT deze kolomnamen (publisher-agent regel uit §3):
- `title_tag` (NIET meta_title)
- `h1` (NIET title)
- `hero_text` (NIET excerpt)
- `status: 'pending_review'` (NOOIT direct 'published')
- `published_at`: NULL bij insert

```sql
INSERT INTO articles (title_tag, h1, hero_text, body, status, cluster, primary_keyword, internal_links, external_links, schema_jsonld)
VALUES (..., 'pending_review', ..., NULL);
```

### 5. Slack notificatie naar Juan
Format:
```
NIEUW ARTIKEL — REVIEW NODIG
Site: <site>
Type: <type>
Cluster: <cluster>
Primair keyword: <keyword>
Lengte: <woorden>
Supabase ID: <id>
Approve: UPDATE articles SET status='published', published_at=now() WHERE id=<id>;
```

## Hard rules
- Status NOOIT direct 'published' — altijd pending_review
- NOOIT publiceren zonder volledig groene checklist
- Bij twijfel over claim: weglaten of bron noemen

## Memory check
Lees voor start: feedback_geen_batterij_prijzen, project_hmb_site_april20, project_hmb_content_machine
