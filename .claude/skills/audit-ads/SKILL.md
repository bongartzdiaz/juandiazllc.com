---
name: audit-ads
description: Diepe Meta Ads + DM Champ + GHL pipeline audit (creative fatigue, audience overlap, frequency, CPL trends, drop-off per stap, ROI). Gebruik wanneer Juan ads performance wil onderzoeken, kosten wil verlagen, of conversie wil verbeteren.
trigger: /audit-ads
---

# /audit-ads

Diepe ads + sales pipeline audit. Account: 932039344875575.

## Usage

```
/audit-ads                       # laatste 7 dagen
/audit-ads --period 30d
/audit-ads --campaign "Thuisbatterijen plus"
/audit-ads --funnel              # focus pipeline drop-off
```

## Checks (10)

### 1. Spend & efficiency
- Totaal spend periode + per dag
- Per campagne, ad set, ad
- CPM trend (creative fatigue indicator)
- CPL trend (vs vorige periode)
- ROAS (indien sale data)
- Wasted spend (low-performer ads die nog draaien)

### 2. Creative fatigue
- Frequency >3 per ad → fatigue waarschuwing
- CTR daling >20% week-over-week
- CPM stijging >25%
- Ads ouder dan 30 dagen zonder refresh

### 3. Audience health
- Audience overlap tussen ad sets (>30% = waste)
- Audience size warnings (te klein / te groot)
- Lookalike performance vs interest
- Saturation indicator (reach vs audience size)

### 4. Placement
- Per placement CPL (Reels vs Stories vs Feed)
- Mobile vs desktop split
- Auto vs manual placements ROI

### 5. Funnel: Ad → Lead
- View → Click rate
- Click → Lead form open
- Lead form completion rate
- Lead form drop-off per veld

### 6. Funnel: Lead → WhatsApp contact (DM Champ)
- Lead → first WhatsApp contact attempt (latency)
- Contact rate (lead form → bericht ontvangen)
- Webhook success rate (DM Champ ↔ Meta)
- Bekend: account 932039344875575, GHL → DM Champ API → Meta

### 7. Funnel: WhatsApp → Reply
- Reply rate per opener variant
- Time-to-reply distribution
- Drop-off na N berichten zonder reply

### 8. Funnel: Reply → Call booked
- Reply → kwalificatie complete
- Kwalificatie → call booked rate
- 3x-nee triggers (zie /dm-script)

### 9. Funnel: Call → Buitendienst
- No-show rate
- Outcome distribution (Gekwalificeerd / Afgewezen / Terugbellen / Buitendienst)
- Conversie call → buitendienst

### 10. Comparative & cohort
- Week-over-week trend per stap
- Cohort retention (lead datum → buitendienst datum)
- Best/worst performing creative
- Best/worst performing audience
- Best uur voor outreach (op basis van reply rate)

## Output

```
ADS AUDIT — periode 2026-04-25 tot 2026-05-02

═══ SPEND ═══
Totaal: €X,XXX
Per dag: €X
ROAS: X.X (indien meetbaar)
Wasted spend (>3 fatigue): €X (X%)

═══ FUNNEL ═══
Ad views:        N
Ad clicks:       N (X% CTR)
Lead form open:  N (X%)
Leads (form):    N (X%)  — CPL €X
WA contact att.: N (X%)
WA replied:      N (X%)
Call booked:     N (X%)
Call completed:  N (X%)
Buitendienst:    N (X%)

Drop-off zwaarste: <stap> (X% verlies)

═══ CREATIVE FATIGUE ═══
Ads met freq >3: N
CTR daling top 5: ...
Refresh nodig: N ads

═══ AUDIENCE ═══
Top 3 best CPL: ...
Top 3 worst CPL: ...
Overlap >30%: N pairs

═══ PLACEMENT ═══
Best CPL: <placement> €X
Worst CPL: <placement> €X

═══ TIMING ═══
Best uur reply: HH:00 (X%)
Best dag reply: <dag>
Outreach business hours: 09-21 (zie project_outbound_canary)

═══ TOP 10 ACTIES ═══
1. Pause ad <id> — fatigue + CPL €X
2. Refresh creative <ad set>
3. ...

═══ MEMORY UPDATE ═══
project_ads_audit_<periode>.md
```

## Hard rules
- Bot regels (geen prijzen, 3x-nee, alleen call verkopen) ALTIJD respecteren in suggesties
- Geen suggesties die conflicteren met §5 sales funnel CLAUDE.md
- Webhook 400 errors: check JSON body niet leeg (CLAUDE.md §7)
- Outreach buiten business hours (09-21) flaggen
- Bij KRITIEK CPL stijging: alert Juan suggereren

## Memory check
Lees: project_outbound_canary_april22, project_chatbot_v3_insights, feedback_whatsapp_format, weekrapport_format
