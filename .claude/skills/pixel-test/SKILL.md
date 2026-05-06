---
name: pixel-test
description: Verifieer Meta Pixel + GA4 + GHL tracking events op pages — events firen, parameters klopt, attribution chain compleet. Gebruik na deploy LP, na pixel-config wijziging, of bij twijfel "telt deze conversie wel?".
trigger: /pixel-test
---

# /pixel-test

Tracking smoke test. Voorkomt "we hebben gemeten maar het meet verkeerd".

## Usage

```
/pixel-test <url>
/pixel-test --all-lps
/pixel-test --vendor meta
/pixel-test --vendor ga4
```

## Wat checken (per page)

### Meta Pixel

#### Base pixel
- [ ] fbq('init') fires op page load
- [ ] fbevents.js geladen (geen blockers)
- [ ] Pixel ID correct (HMB account)
- [ ] PageView event fires

#### Standard events
Per page-type:
- LP: PageView + ViewContent
- Form page: PageView + Lead bij submit
- Calc page: PageView + ViewContent + Lead bij result
- Thank-you: PageView + CompleteRegistration

#### Custom events (HMB-specific)
- WhatsAppClick (op WA-link click)
- CalcSubmit (calculator filled)
- GuideDownload (PDF download)

#### Verificatie
1. Open DevTools → Network → filter "facebook.com"
2. Reload page
3. Trigger event (form submit, click)
4. Check request: `tr/?id=<pixel>&ev=<event>&...`
5. Check Meta Events Manager → Test Events tool — moet binnen 30s verschijnen

### GA4

#### Base
- [ ] gtag.js geladen
- [ ] Measurement ID correct
- [ ] page_view fires

#### Enhanced events (auto)
- scroll, click, file_download, form_start, form_submit

#### Custom events
- whatsapp_click
- calc_submit
- guide_download
- nav_to_form

#### Verificatie
1. DevTools → Network → "google-analytics.com" / "analytics.google.com"
2. GA4 → Realtime → moet binnen 30s
3. DebugView (met ga_debug=true): events met parameters

### GHL contact creation

Bij form submit:
- [ ] Contact created in GHL (check API)
- [ ] Tags applied (UTM source, campaign)
- [ ] Custom fields populated
- [ ] Workflow triggered (router naar welcome)

### Attribution chain

End-to-end test (use real test-lead):
1. Click ad in Meta Ads Library / preview
2. Land op LP — UTM in URL
3. Form submit → tracked in Pixel + GA4 + GHL
4. UTM persist in GHL contact
5. WA opener fires
6. Reply tracked
7. Call booked (manual stap)
8. Source attribution traceerbaar tot ad

## Per page checklist

```
PAGE: <url>

LOAD
[ ] gtag.js loaded
[ ] fbevents.js loaded
[ ] Geen 404 / blocked

EVENTS ON LOAD
[ ] page_view (GA4)
[ ] PageView (Meta)

EVENTS ON INTERACTION
[ ] form_start (GA4) — bij field focus
[ ] form_submit (GA4)
[ ] Lead (Meta)
[ ] Conversion API server-side (Meta CAPI)

EVENT PARAMETERS
[ ] event_value (waar relevant)
[ ] currency: EUR
[ ] content_name: "<page>"
[ ] utm_* persisted

POST-SUBMIT
[ ] Redirect naar thank-you
[ ] thank-you fires CompleteRegistration
[ ] Contact in GHL
[ ] WA opener fires
```

## Common issues + fixes

### A. Events fire 2x
Oorzaak: pixel in template + manual fire.
Fix: één plek (template) of de-duplicate via event_id.

### B. UTM lost na form
Oorzaak: form submit → redirect zonder query param.
Fix: copy UTM naar hidden form fields.

### C. Conversion API mismatch met browser pixel
Oorzaak: server-side fires zonder event_id.
Fix: gebruik zelfde event_id voor dedup.

### D. iOS 14+ underreporting
Oorzaak: SKAdNetwork delays + ATT prompts.
Fix: gebruik CAPI server-side voor accurater data.

### E. CookieBot blokkeert pixel
Oorzaak: consent niet given of misconfig.
Fix: pixel laden NA consent, of essential-tier voor anonymous.

### F. Meta Test Events leeg
Oorzaak: Test Events code niet meegegeven.
Fix: voeg `?fbclid=test_event_code_<X>` toe of gebruik Browser-extension.

## Output format

```
═══ PIXEL TEST — <url> ═══

DATUM: <ISO>
TESTER: Juan / agent

═ LOAD ═
[ ] Meta pixel loaded
[ ] GA4 loaded
[ ] CookieBot config: <consent-tier>

═ EVENTS BROWSER ═
PageView: ✓ / ✗
ViewContent: ✓ / ✗
Lead: ✓ / ✗
[event params]

═ EVENTS SERVER (CAPI) ═
[ ] Lead server-side
[ ] event_id matched (dedup)

═ GA4 ═
[ ] page_view
[ ] form_submit
[ ] custom: <events>

═ GHL ═
[ ] Contact created
[ ] Tags: <list>
[ ] Custom fields: <list>
[ ] Workflow triggered: <name>

═ ATTRIBUTION ═
UTM source: <val>
UTM campaign: <val>
fbc / fbp cookies: ✓
GA client_id: ✓

═ ISSUES ═
1. ...
2. ...

═ FIXES NEEDED ═
[ ] [issue 1] — owner — deadline
[ ] [issue 2] — ...

═ MEMORY ═
project_pixel_test_<datum>_<page>.md
```

## Hard rules
- Test op INCOGNITO + cookies cleared (anders persisted state mist)
- Test op mobile EN desktop
- Test met VPN (NL/BE) — geo-restrictions checken
- ALTIJD bij elke nieuwe LP / na pixel-config wijziging
- Bij iOS issue: CAPI implementeren

## Memory check
Lees: project_pixel_*, project_ghl_workflows_status
