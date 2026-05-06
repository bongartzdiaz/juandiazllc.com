---
name: campaign-launch
description: Launch checklist + setup voor een nieuwe Meta Ads campagne — naming, doelen, audience, creative brief, GHL routing, DM Champ flow, GA tracking, KPI baselines. Gebruik bij elke nieuwe campaign zodat niets mist.
trigger: /campaign-launch
---

# /campaign-launch

Nieuwe Meta Ads campaign launch checklist (account 932039344875575).

## Usage

```
/campaign-launch <campaign-naam>
/campaign-launch <naam> --type lead-gen|awareness|retargeting
/campaign-launch <naam> --budget <€/dag>
/campaign-launch <naam> --doel thuisbatterij|saldering|voltafy
```

## Pre-launch checklist (alle items)

### 1. Strategie
- [ ] Doel scherp (lead gen / awareness / retargeting)
- [ ] Doelgroep gedefinieerd (huiseigenaren 35-65, koop, met PV)
- [ ] Budget per dag + max-budget
- [ ] Looptijd
- [ ] Success criteria (CPL target, leads/week)

### 2. Naming convention
Format: `<doel>_<topic>_<audience>_<datum>`
Voorbeeld: `LG_thuisbatterij_PV-eigenaren_2026-W18`

### 3. Audiences
- [ ] Lookalike basis (welke source — leads / klanten?)
- [ ] Interesse audiences gedefinieerd
- [ ] Exclusions: bestaande klanten, recente "afgewezen" leads
- [ ] Geo: NL of BE (BesparenBelgie aparte regels)
- [ ] Min audience size > 100k

### 4. Creatives
- [ ] /banner-prompt voor visuals (1200×630 / 1080×1080 / Reels 9:16)
- [ ] 3+ creative varianten per ad set (hooks testen)
- [ ] Copy: B1 niveau, geen prijzen, geen concurrent-bashing
- [ ] CTA: "Doe de check" / "Gratis adviesgesprek" / "Bereken besparing"
- [ ] Landing page check (/audit-site --quick)

### 5. Lead form (instant form)
- [ ] Velden: naam, telefoon, email (verplicht)
- [ ] Optioneel: adres, verbruik kWh, koopwoning
- [ ] Privacy disclaimer (AVG NL)
- [ ] Bedankt-scherm met telefoon-CTA

### 6. GHL routing
- [ ] Tag: `meta-<campaign-naam>` automatisch op nieuwe lead
- [ ] Workflow: Router → kwalificatie sub-flow
- [ ] Source attribution (UTM intact)
- [ ] /ghl-sync-check voor verifieren

### 7. DM Champ / WhatsApp
- [ ] Opener template ingericht (zie /dm-script opener)
- [ ] Per uur volume cap (anti-bulk regel)
- [ ] Business hours 09-21 (project_outbound_canary_april22)
- [ ] Dedup window: 10 min
- [ ] Trace ID per outbound bericht

### 8. Tracking
- [ ] Meta Pixel firing (test)
- [ ] Custom events: Lead, Contact, ScheduleCall
- [ ] CAPI server-side events
- [ ] UTM parameters: `utm_source=meta&utm_campaign=<naam>&utm_content=<ad>`
- [ ] GA4 conversies geconfigureerd

### 9. Compliance
- [ ] AVG: privacy policy link in form
- [ ] Geen claims zonder onderbouwing
- [ ] Geen prijsgaranties
- [ ] Geen concurrent vermeld
- [ ] Brand-voorwaarden Meta (geen "before/after" misleidend)

### 10. Monitoring opzet
- [ ] /audit-ads dagelijks eerste week (creative fatigue early)
- [ ] CPL alert als > X target
- [ ] Pipeline drop-off check na 48u

## Post-launch (24/48u)

### Day 1
- Smoke check: krijgen we leads binnen?
- Eerste WhatsApp contact verstuurd (binnen <60s na lead)?
- Pixel/CAPI ontvangt events?

### Day 2-3
- /audit-ads --period 2d
- Eerste reply rate stat
- Audience size niet uitgeput

### Day 7
- /weekrapport-hmb voor cijfers
- A/B winners identificeren
- Pause low performers

## Output

```
CAMPAIGN LAUNCH CHECKLIST — <naam>
Status: [READY TO LAUNCH | BLOCKED — N items open]

PRE-LAUNCH: 28/35 ✓
BLOCKED:
- Audience size too small (62k, target >100k)
- Pixel niet geverifieerd

NEXT:
1. Audience verbreden
2. Pixel test event runnen
3. Re-run /campaign-launch <naam>

═══ MEMORY UPDATE ═══
project_campaign_<naam>.md
```

## Hard rules
- NOOIT launchen met failed checklist items
- ALTIJD UTM compleet
- ALTIJD audience exclusions (geen retargeting eigen klanten)
- ALTIJD memory updaten bij launch
- Bij eerste lead: trigger /lead-status om verify pipeline
