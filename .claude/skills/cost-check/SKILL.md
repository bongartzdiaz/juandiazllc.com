---
name: cost-check
description: Multi-vendor cost overview — Anthropic, Supabase, Meta Ads, DigitalOcean, GitHub, GHL — met trend en burn-rate. Gebruik wanneer Juan kosten wil checken, budget bewaken, of kandidaten voor cost-cutting wil vinden.
trigger: /cost-check
---

# /cost-check

Cross-vendor cost overview.

## Usage

```
/cost-check                  # huidige maand
/cost-check --period 30d
/cost-check --forecast       # projectie eind maand
/cost-check --vendor <naam>
```

## Vendors
- Anthropic API (Claude usage)
- Supabase (3 projecten: PT, HMB, NEXUS)
- Meta Ads (account 932039344875575)
- DigitalOcean (2 droplets + snapshots)
- GitHub (Actions minutes, storage — daily-seo-publisher geblokkeerd op billing)
- GoHighLevel (subscription)
- Trade Republic — persoonlijk, NIET in business cost
- Domain registrars
- Anthropic API
- Vercel (PT)

## Output

```
COST OVERVIEW — mei 2026 (running totals)

═══ VENDOR ═══
| Vendor | MTD | Vorige maand | Forecast eom |
| Meta Ads | €X | €X | €X |
| Anthropic | €X | €X | €X |
| Supabase (3 proj) | €X | €X | €X |
| DigitalOcean | €X | €X | €X |
| GitHub | $X | $X | $X (Actions billing!) |
| GHL | €X (sub) | €X | €X |
| Vercel | $X | $X | $X |
| Domains | €X | €X | €X |
| Totaal | €X | €X | €X |

═══ BURN RATE ═══
Per dag MTD: €X
Vergelijking budget: ±X%

═══ ALERTS ═══
- GitHub Actions: BILLING BLOCKED — daily-seo-publisher down
- Anthropic spike: +N% vs vorige week (oorzaak?)
- ...

═══ COST-CUTTING KANDIDATEN ═══
1. Edge function X invocations: N/dag, kosten €X — kan minder vaak?
2. Snapshot retention: N old snapshots × $0.05/GB
3. ...
```

## Hard rules
- Nooit destructive cost actions (cancel sub, delete snapshot) zonder confirm
- Memory updaten maandelijks: `project_costs_<jaarmaand>.md`
- Bij forecast >120% van vorige maand: WARN
