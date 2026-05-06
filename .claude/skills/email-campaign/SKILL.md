---
name: email-campaign
description: Single-send email campagne — schrijf, deliverability-check, GHL push, post-send tracking. Voor announcements, lead-magnet drops, urgentie-mails (saldering deadline). Niet voor recurring nieuwsbrief (zie /newsletter) of automation sequences (zie marketing:email-sequence).
trigger: /email-campaign
---

# /email-campaign

One-shot email campaign — niet recurring, niet automation.

## Usage

```
/email-campaign <doel> --segment <wie>
# vb: /email-campaign "Saldering verandert in 2027 — actie nu" --segment alle-leads
# vb: /email-campaign "Nieuwe gids: thuisbatterij keuze" --segment nurture-thuisbatterij
# vb: /email-campaign "Webinar morgen 20:00" --segment ingeschreven-webinar
```

## Type campaigns

### A. Announcement
Nieuws / launch / wettenwijziging.
- Subject: feit-eerst, geen clickbait
- Lengte: kort (150-250 wrd)

### B. Lead-magnet drop
Nieuwe gids / e-book release.
- Subject: voordeel-eerst
- Lengte: medium (250-400 wrd)
- 1 dominant CTA naar download

### C. Urgentie / deadline
Saldering 2027, subsidie-deadline, actie-week.
- Subject: deadline + concreet voordeel
- Lengte: kort
- Geen valse urgentie, ALTIJD echte deadline

### D. Re-activation
Inactive subscribers terugwinnen.
- Subject: vraag of "we missen je"
- Soft CTA, geen sales-push

## Flow

### 1. Spec
- Doel (1 zin)
- Doelgroep / segment (GHL tag of Supabase query)
- Send timing (dag + uur, NL timezone)
- Success metric (open rate / click / form-fill / WA-reply)

### 2. Subject lines (3 varianten)
Schrijf 3 subjects met verschillende hooks:
- A. Vraag-stijl
- B. Cijfer/statement
- C. Curiosity gap

A/B test op subject (niet body) als list >2000.

Subject regels:
- Max 50 chars (mobile preview)
- Geen alle-caps
- Geen spam-triggers ("GRATIS", "LAATSTE KANS", "$$$")
- Geen overdadige emojis (max 1 indien echt nodig — voorkeur 0)
- Personalisatie {first_name} alleen als data clean

### 3. Preheader (50-100 chars)
Aanvullend op subject, niet herhaalend.

### 4. Body
Structuur:
- Opening: 1 zin haakje (geen "ik hoop dat het goed gaat")
- Bewijs/context: 2-4 zinnen waarom dit relevant is
- Concrete waarde: wat haalt lezer eruit
- 1 dominant CTA (button + link)
- Optioneel PS met urgentie of bonus

Stijl:
- B1, korte zinnen
- Geen jargon zonder uitleg
- Lezer aanspreken in jij/je vorm
- Geen prijsgaranties

### 5. Plain-text variant
ELKE email ook plain-text — verbeter deliverability.

### 6. CTA
- 1 dominant CTA (max 2 als echt nodig)
- Button-tekst actief: "Bekijk gids" niet "Klik hier"
- Tracking: UTM parameters (utm_source=email, utm_campaign=<slug>)

### 7. Deliverability check
- [ ] From-naam herkenbaar (Juan / HMB / specifieke naam)
- [ ] Reply-to functioneel (geen no-reply)
- [ ] SPF / DKIM / DMARC actief op sending domain
- [ ] List-Unsubscribe header (verplicht)
- [ ] Geen broken links (test alle voor send)
- [ ] Image alt-text aanwezig
- [ ] Tekst-naar-image ratio gezond (>50% tekst)

### 8. Compliance (NL/EU)
- [ ] Opt-in basis voor segment (ja, kan ik bewijzen)
- [ ] Unsubscribe link in footer
- [ ] Bedrijfsadres in footer (KvK eis)
- [ ] AVG: geen tracking pixel zonder consent
- [ ] Geen prijsgarantie / misleidende claim
- [ ] Geen concurrent-bashing

### 9. Send & track
- Send via GHL of dedicated ESP
- Tag tracking: open / click / converted
- Quarantine bouncers
- Update GHL contact field na actie

### 10. Post-send analyse (na 48u)
- Open rate (industry avg 20-25% energie)
- Click rate (avg 2-5%)
- Conversion (form / WA reply)
- Unsubscribe rate (target <0.5%)
- Spam complaint rate (target <0.1%)

Slack-update voor Juan met resultaten.

## Output format

```
═══ EMAIL CAMPAIGN — <slug> ═══

DOEL: <1 zin>
SEGMENT: <tag/query> — N contacts
SEND: <datum tijd>

SUBJECT VARIANTS
A. <subject> (voorspelling: vraag-CTR)
B. <subject> (cijfer-driven)
C. <subject> (curiosity)
Aanbeveling: <welke + waarom>

PREHEADER: <text>

BODY (HTML)
[volledig met inline styles]

BODY (plain-text)
[plain version]

CTA
Button: "<tekst>"
URL: <url>?utm_source=email&utm_campaign=<slug>

DELIVERABILITY
[ ] x8 checks ✓

COMPLIANCE
[ ] x6 checks ✓

POST-SEND CHECK PLAN
T+30min: bounce check
T+4u: open rate
T+24u: click rate
T+48u: full report → Slack
```

## Hard rules
- 1 dominant CTA (max 2)
- Plain-text variant verplicht
- Unsubscribe in footer
- KvK adres in footer
- NOOIT subject all-caps
- NOOIT zonder consent voor segment
- Track + report na 48u

## Memory check
Lees: reference_hmb_brand, marketing:email-sequence (voor automation patterns), CLAUDE.md §2 compliance
