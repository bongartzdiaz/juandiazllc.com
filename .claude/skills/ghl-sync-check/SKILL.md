---
name: ghl-sync-check
description: Verifieer GoHighLevel workflows status (Router/Welcome/Lead-Magnet live + 5 nog te bouwen) + sync API health + tag routing reference. Gebruik wanneer Juan GHL status wil weten, een workflow stuk lijkt, of na nieuwe leads geen tags ziet.
trigger: /ghl-sync-check
---

# /ghl-sync-check

GoHighLevel health-check volgens project_ghl_workflows_status.

## Usage

```
/ghl-sync-check                # full sweep
/ghl-sync-check --workflow <naam>
/ghl-sync-check --tags         # tag routing audit
```

## Checks

### 1. Live workflows
- [ ] Router workflow — actief, laatste run < 1u
- [ ] Welcome workflow — actief, geen failures
- [ ] Lead-Magnet workflow — actief, PDF delivery werkt
- [ ] Workflow 4 (april 26) — actief

### 2. Te bouwen workflows (status check)
- [ ] Workflow 5
- [ ] Workflow 6
- [ ] Workflow 7
- [ ] Workflow 8
- [ ] Workflow 9
Per workflow: status (planned / building / blocked / live)

### 3. Tag routing reference
Toon tag → workflow mapping tabel.
Detect missing tags op recente leads.

### 4. Sync API health
- API key rotatie status (project_api_key_rotatie)
- Laatste failed sync attempts
- GHL → Supabase data drift check

### 5. Webhook health
- DM Champ webhook (account 932039344875575)
- Bekend issue: 400 errors bij lege JSON body — flag indien gezien
- Make.com intermediair status (indien gebruikt)

## Output

```
GHL SYNC CHECK — [datum]

═══ LIVE WORKFLOWS ═══
[✓] Router — laatste run: [tijd]
[✓] Welcome — laatste run: [tijd]
[✓] Lead-Magnet — laatste run: [tijd]
[✓] Workflow 4 — laatste run: [tijd]

═══ TE BOUWEN ═══
[~] Workflow 5: [status]
[~] Workflow 6: [status]
...

═══ TAGS ═══
Recent leads zonder tags: N
Tag → workflow mismatches: N

═══ SYNC API ═══
Last successful sync: [tijd]
Failed last 24h: N

═══ ACTIEPUNTEN ═══
1. [...]
```

## Hard rules
- GEEN N8N (zie feedback_geen_n8n) — directe API koppelingen
- Bij webhook 400: check JSON body niet leeg
