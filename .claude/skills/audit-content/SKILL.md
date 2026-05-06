---
name: audit-content
description: Diepe content audit — ranking trends (Ahrefs), keyword gaps, cannibalization, decaying content, topic cluster compleetheid, internal link health, content freshness. Gebruik wanneer Juan content strategie wil evalueren of content opportunities zoekt.
trigger: /audit-content
---

# /audit-content

Content portfolio audit voor helpmijbesparen / salderingsregeling / voltafy / besparenbelgie.

## Usage

```
/audit-content                     # alle sites
/audit-content --site helpmijbesparen.nl
/audit-content --scope rankings
/audit-content --scope cannibalization
/audit-content --since 30d
```

## Checks (10)

### 1. Ranking trends (Ahrefs)
Via `mcp__claude_ai_Ahrefs__rank-tracker-overview`:
- Total tracked keywords
- Avg position trend (vs 7d, 30d)
- Top stijgers (>5 posities)
- Top dalers (<-5 posities) — escalatie level 2/3
- Keywords nieuw in top 10
- Keywords gevallen uit top 10

### 2. Pillar cluster compleetheid
Voor elke pillar in CLAUDE.md §3:
- Pillar artikel aanwezig?
- Cluster artikelen count vs target
- Interne links per pillar (target 5+)
- Missing topics in semantische set

Pillars:
- Thuisbatterij kopen 2026
- Salderingsregeling 2027
- Terugleververgoeding zonnepanelen vergelijken
- Zelfverbruik zonnepanelen verhogen
- Voltafy producten

### 3. Cannibalization detection
Multiple pages ranking voor zelfde keyword:
```
keyword: "thuisbatterij kosten"
- /thuisbatterij-kopen (pos 4)
- /thuisbatterij-prijs (pos 7)  ← cannibal
- /kosten-thuisbatterij (pos 12) ← cannibal
```
Voorstel: consolideren of differentiëren.

### 4. Decaying content
Pages waar traffic >20% gedaald (vs 30d geleden):
- Reden: ranking daling? SERP feature change? Outdated content?
- Refresh suggestie

### 5. Content freshness
- Pages ouder dan 12 maanden zonder update
- Pages met datum >2 jaar zichtbaar in content
- Saldering 2027 content: actualiteits-check

### 6. Internal linking
- Pages met <3 inbound interne links
- Orphan pages (geen interne links naar)
- Hub pages (>50 outbound — overload?)
- Anchor text diversity per pagina
- Broken interne links

### 7. Keyword gaps
Via Ahrefs competitors:
- Keywords waar Zonneplan / 1KOMMA5° / Sessy ranken maar HMB niet
- Volume + difficulty filter
- Quick-win opportunities (KD <30, volume >500)

### 8. SERP feature opportunities
- Keywords waar People Also Ask kan worden gewonnen (FAQ schema!)
- Featured snippet kandidaten
- Image pack opportunities
- Knowledge panel claims

### 9. Pending review queue health
```sql
SELECT COUNT(*), MIN(created_at), MAX(created_at)
FROM articles WHERE status = 'pending_review';
```
- Aantal pending
- Oudste pending (review backlog)
- Per cluster verdeling

### 10. Compliance scan (NEXUS BOS regels)
Crawl gepubliceerde content voor:
- Prijsgaranties / exacte installatiekosten (verboden)
- Negatieve uitspraken concurrenten
- Emojis in body
- Niet-onderbouwde claims
- Missing schema (Article + FAQ JSON-LD)

## Output

```
CONTENT AUDIT — 2026-05-02

═══ RANKINGS (laatste 7d) ═══
Tracked KW: N
Avg pos delta: ±X.X
Top 5 stijgers: ...
Top 5 dalers: ...
Nieuw in top 10: N
Gevallen uit top 10: N

═══ PILLAR CLUSTERS ═══
Thuisbatterij:    pillar ✓ | cluster X/8 | links X/5+
Saldering 2027:   pillar ✓ | cluster X/6 | links X/5+
Teruglever:       pillar ✗ | cluster X/5
Zelfverbruik:     pillar ✓ | cluster X/4
Voltafy:          pillar ✓ | cluster X/6

═══ CANNIBALIZATION ═══
Detected: N keywords met multi-rank
Top conflicts: ...
Voorstel: consolideer N → merge naar M URLs

═══ DECAYING CONTENT ═══
Pages traffic -20%+: N
Top 5 priority refresh: ...

═══ FRESHNESS ═══
Outdated (>12 mnd): N
Datum-verwijzingen >2 jaar: N

═══ INTERNAL LINKS ═══
Underlinked (<3 inbound): N
Orphans: N
Hub overload (>50 outbound): N
Broken: N

═══ KEYWORD GAPS ═══
Quick-wins (KD<30, vol>500): N
Top 10 opportunities: ...

═══ SERP FEATURES ═══
PAA opportunities: N
Featured snippet kandidaten: N

═══ QUEUE ═══
Pending review: N (oudste: N dagen)
Per cluster: ...

═══ COMPLIANCE ═══
Prijsgarantie violations: N (KRITIEK indien >0)
Concurrent-bashing: N
Emojis in body: N
Missing schema: N

═══ TOP 15 ACTIES ═══
1. [KRITIEK] Compliance fix: <pagina>
2. Refresh decaying: <pagina>
3. Cannibal merge: ...
...

═══ MEMORY UPDATE ═══
project_content_audit_<datum>.md
```

## Hard rules
- Compliance violations (prijzen, concurrenten) = KRITIEK, fix BEFORE next publish
- Ranking daling >5 = escalatie level 3 (CLAUDE.md §4)
- ALTIJD memory updaten met cannibalization map (groeit over tijd)
- Voor BesparenBelgie: andere keyword set (capaciteitstarief, Mijn VerbouwPremie, BTW 6%)
