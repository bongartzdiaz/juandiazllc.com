---
name: debug-lead
description: Trace 1 specifieke lead door de volledige funnel — Meta Ads → GHL → DM Champ → WhatsApp → Supabase — om te vinden waar het stopt of misgaat. Gebruik bij "lead X is stuck" of "waarom is deze lead niet doorgekomen".
trigger: /debug-lead
---

# /debug-lead

Per-lead full-funnel trace. Vindt EXACT waar de lead is gestopt.

## Usage

```
/debug-lead <id-of-tel-of-email>
# vb: /debug-lead +31612345678
# vb: /debug-lead lead@example.com
# vb: /debug-lead ghl-contact-id-abc123
```

## Trace stappen (in volgorde)

### Stap 0 — Lookup keys
Probeer match op:
- Phone (E.164 + lokaal formaat)
- Email
- GHL contact ID
- Supabase lead ID
- WhatsApp wa_id

Output: alle gevonden keys + welke systeem ze hebben.

### Stap 1 — Meta Ads attribution
- Welke campaign genereerde deze lead? (UTM / GHL source field)
- Datum/tijd lead form submit
- Ad creative gezien?
- Lead form variant?

### Stap 2 — GoHighLevel
- Contact bestaat? (ja/nee)
- Tags huidig
- Workflow membership (welke workflows zijn fired)
- Custom fields populated correct?
- Opportunity / pipeline stage
- Activity log (sms/email/note timestamps)

### Stap 3 — DM Champ / WhatsApp webhook
- Webhook van GHL → DM Champ getriggerd? (timestamp)
- HTTP status response (200 / 400 / 5xx)
- Bekend issue: GHL standaard webhook ondersteunt geen vrije JSON body — check Make.com intermediair (CLAUDE.md §7)
- Welke template gebruikt voor opener

### Stap 4 — WhatsApp gesprek (DM Champ logs)
- First message sent timestamp
- Delivery status (sent / delivered / read)
- Reply received? (indien ja: timestamp + content samenvatting)
- Bot fase huidig (kwalificatie / hand-off / 3x-nee / etc.)
- Aantal berichten heen-en-weer
- Bot regel-violations?
  - Prijs genoemd?
  - Concurrent genoemd?
  - Direct buitendienst aangeboden?
  - 3x-nee gepasseerd?

### Stap 5 — Hand-off naar adviseur (indien gebeurd)
- Adviseur ge-notified?
- Call booked?
- Call outcome?
- Notes overgedragen?

### Stap 6 — Supabase
```sql
SELECT * FROM leads WHERE phone = ? OR email = ?;
SELECT * FROM conversations WHERE lead_id = ?;
SELECT * FROM activity_log WHERE lead_id = ? ORDER BY ts;
```
- Lead row aanwezig?
- Status sync met GHL?
- Activity log compleet?

### Stap 7 — Where did it stop?
Bouw timeline. Identificeer de break:
- Geen GHL contact → form submit issue
- GHL geen tag → workflow trigger issue
- Webhook 4xx/5xx → DM Champ integratie issue
- Bericht sent maar geen delivery → WhatsApp business issue
- Reply received maar bot stil → DM Champ AI failure
- Bot stuck in kwalificatie → script issue
- Hand-off zonder notificatie → routing issue
- Adviseur geen call binnen 24u → ops issue

## Output format

```
═══ LEAD TRACE — <key> ═══

KEYS GEVONDEN
- Phone: <val>
- Email: <val>
- GHL ID: <val>
- Supabase ID: <val>
- WA ID: <val>

TIMELINE
HH:MM <datum> — Meta Ads: lead form submit (campaign: <X>)
HH:MM <datum> — GHL: contact created, tags=<list>
HH:MM <datum> — GHL → DM Champ webhook: 200 OK
HH:MM <datum> — WhatsApp: opener sent (template: <X>)
HH:MM <datum> — WhatsApp: delivered ✓
HH:MM <datum> — WhatsApp: reply received "<excerpt>"
HH:MM <datum> — Bot: kwalificatie fase (verbruik gevraagd)
[STOP HIER — geen activity sinds]

═ DIAGNOSE ═
Bot wachtend op user reply sinds <X uur>.
Last bot message: "<text>"
User did not reply.

Geen automatic re-engagement gefired (workflow X niet getriggerd?).

═ COMPLIANCE CHECK ═
[ ] Geen prijs genoemd
[ ] Geen concurrent
[ ] Geen direct buitendienst-aanbod
[ ] 3x-nee niet gepasseerd
[ ] AI-natuur niet onthuld
[ ] Afkortingen niet gebruikt

═ AANBEVOLEN ACTIE ═
1. [primary]
2. [alternatief]

═ MEMORY HOOK ═
Pattern signalered? Schrijf project_lead_pattern_<topic>.md
```

## Hard rules
- NOOIT auto-re-engage zonder Juan's go (compliance)
- Bij compliance violation: KRITIEK flag + aparte memory note
- Privacy: nooit lead-data in Slack zonder need-to-know
- Anonymiseer in algemene memories — alleen specifieke debugging memories mogen tel/naam houden

## Gerelateerd
- `/lead-status` — quick lookup zonder volle trace
- `/lead-reengage` — voor stuck leads in batch
- `/audit-leads` — patterns over hele pipeline
