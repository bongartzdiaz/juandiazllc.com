---
name: metrics
description: Cross-system KPI dashboard pull — leads, conversies, rankings, traffic, server, kosten in 1 overzicht. Gebruik voor snapshot moment, daily standup input, of trendanalyse.
trigger: /metrics
---

# /metrics

Unified KPI snapshot.

## Usage

```
/metrics                       # vandaag
/metrics --period 7d
/metrics --compare prev        # delta tegen vorige periode
/metrics --slack               # post-ready format
```

## Bronnen
- Supabase: leads, articles, conversations
- Meta Ads: spend, leads, CPL (account 932039344875575)
- GHL: pipeline counts
- Ahrefs: avg position, top stijgers/dalers
- Web analytics: sessies, conversie
- Anthropic: API usage
- DigitalOcean: kosten

## Output

```
KPI SNAPSHOT — 2026-05-02 (vs 7d geleden)

═══ LEADS & SALES ═══
Leads totaal: N (±N)
CPL: €X (±€X)
Calls geboekt: N (±N)
Buitendienst: N (±N)
Conversie ad→buitendienst: X% (±X)

═══ CONTENT ═══
Pages live: N (±N nieuwe)
Pending review: N
Avg ranking: X.X (±X.X)
Top stijger: <kw> +N
Top daler: <kw> -N

═══ TRAFFIC ═══
Sessies: N (±N)
Bounce: X% (±X)
Conversie naar lead: X% (±X)

═══ SERVER ═══
NEXUS: ✓ N/9 agents | RAM X% | Disk X%
HMB: ✓ | RAM X% | Disk X%

═══ KOSTEN (laatste 7d) ═══
Meta Ads: €X
Supabase: €X
Anthropic: €X (~N tokens)
DigitalOcean: €X
Totaal: €X

═══ HEALTH ═══
Open KRITIEK findings: N
Stuck leads: N
Failed crons 24h: N
```

## Hard rules
- ALTIJD vergelijking met vorige periode
- Memory updaten als snapshot per week (`project_metrics_<week>.md`)
- Niet posten naar Slack zonder confirm
