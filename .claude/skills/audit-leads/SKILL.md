---
name: audit-leads
description: Diepe leads pipeline audit — stuck leads, sync drift GHL↔Supabase, no-response, hand-off failures, gemiste callbacks, dedup issues, missing tags. Gebruik wanneer Juan lead pipeline health wil weten of opportunities mist.
trigger: /audit-leads
---

# /audit-leads

Diepe leads + pipeline audit (HMB).

## Usage

```
/audit-leads
/audit-leads --since 7d
/audit-leads --stage stuck
/audit-leads --source <campagne>
```

## Checks (10)

### 1. Pipeline distribution
GHL stages volgens CLAUDE.md §5:
- Gekwalificeerd
- Afgewezen (3x nee)
- Terugbellen
- Buitendienst gepland
- (impliciet) In bot conversation
- (impliciet) No response

Per stage: count + avg age + delta vs vorige week.

### 2. Stuck leads
- In bot conversation >48u zonder reply
- Terugbellen status zonder follow-up >7d
- Buitendienst gepland zonder bevestiging <24u voor afspraak
- Gekwalificeerd zonder call booked >24u

### 3. Sync drift (GHL ↔ Supabase ↔ DM Champ)
- Leads in GHL niet in Supabase (en vice versa)
- Status mismatch tussen systemen
- Tags missing in 1 van de 3 systemen
- WhatsApp messages in DM Champ zonder GHL contact

### 4. Dedup health
Vereist na backfill 16 apr (logboek_2026_04_16: 129 msgs backfilled):
- Duplicate phone numbers
- Duplicate emails
- Duplicate WhatsApp gesprekken
- Window: 10min dedup (project_outbound_canary)

### 5. Hand-off quality
- Bot → adviseur: kwalificatie data compleet?
- Adviseur → buitendienst: notes meegegeven?
- Buitendienst → admin: outcome teruggekoppeld?
- Missing field per hand-off type

### 6. No-response analysis
Leads zonder reply binnen N dagen:
- Per source (welke campaign produceert deze leads?)
- Per opener variant (welke openers krijgen geen reply?)
- Per dag/uur verzonden
- Bot fase waar drop-off plaatsvindt

### 7. Bot regel-violations (compliance)
Gesprekken waar bot:
- Prijs heeft genoemd
- Concurrent heeft genoemd
- Direct buitendienst heeft aangeboden i.p.v. call
- Afkortingen heeft gebruikt (feedback_chatbot_geen_afkortingen)
- AI-natuur heeft onthuld
- Door 3x-nee regel is gegaan

### 8. Tag routing health
Vergelijk verwachte tag → workflow met werkelijkheid:
- Leads zonder verwachte tag
- Workflows die niet gefired hebben
- Reference: project_ghl_workflows_status

### 9. Latency metrics
- Lead form submit → first WhatsApp message
- WhatsApp reply → bot response (target <30s, burst-berichten zie logboek_2026_04_10)
- Lead qualified → call booked
- Call booked → call completed

### 10. Outcome attribution
Per buitendienst-afspraak: terug naar bron campaign?
- Conversion attribution chain
- LTV per source (indien data)
- Best converting opener variant

## Output

```
LEADS AUDIT — 2026-05-02

═══ PIPELINE DISTRIBUTION ═══
| Stage | Count | Avg age | Δ vs vorige week |
| Gekwalificeerd | N | Xd | ±N |
| Afgewezen | N | Xd | ±N |
| Terugbellen | N | Xd | ±N |
| Buitendienst gepland | N | Xd | ±N |
| In bot | N | Xd | ±N |
| No response | N | Xd | ±N |

═══ STUCK LEADS (PRIORITEIT) ═══
Bot >48u stil: N
Terugbellen overdue: N
Buitendienst <24u zonder confirm: N
Gekwalificeerd >24u zonder call: N
Top 10 lijst: ...

═══ SYNC DRIFT ═══
GHL only: N
Supabase only: N
Status mismatch: N
Missing tags: N

═══ DEDUP ═══
Dup phone: N
Dup email: N
Dup conversation: N

═══ HAND-OFF QUALITY ═══
Bot→adviseur incomplete: N
Adviseur→buitendienst incomplete: N
Buitendienst→admin no-outcome: N

═══ NO-RESPONSE ═══
Worst source: <campaign> (X% no-response)
Worst opener: <variant> (X%)
Worst time: <uur>

═══ BOT VIOLATIONS ═══
Prijs genoemd: N (KRITIEK indien >0)
Concurrent: N
Direct buitendienst: N
Afkortingen: N
AI onthuld: N (KRITIEK indien >0)
Voorbij 3x-nee: N

═══ TAG ROUTING ═══
Missing tags: N
Failed workflows: N

═══ LATENCY ═══
Lead → first msg: median Xs (target <60s)
Reply → bot response: median Xs (target <30s)
Qualified → call: median Xh
Call booked → completed: X% no-show

═══ ATTRIBUTION ═══
Buitendienst per source: ...
Best ROI source: ...

═══ TOP 15 ACTIES ═══
1. [KRITIEK] Compliance fix: <gesprek-id>
2. Re-engage stuck leads: N
3. Fix sync drift batch: ...

═══ MEMORY UPDATE ═══
project_leads_audit_<datum>.md
```

## Hard rules
- Bot violations (prijs, AI onthullen, 3x-nee gepasseerd) = KRITIEK
- ALTIJD lead-status check op stuck leads voor next-action
- ALTIJD memory updaten
- Bij sync drift >5%: escalate naar Juan
- NOOIT auto-actie op leads — alle suggesties zijn voor Juan om te triggeren
