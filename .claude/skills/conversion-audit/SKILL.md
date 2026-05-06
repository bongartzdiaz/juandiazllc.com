---
name: conversion-audit
description: Funnel-specifieke conversie audit — LP → form → bot → call. Heatmap/Clarity reading, drop-off analyse, friction detectie, hypothese-lijst voor /ab-test. Anders dan /audit-ads (gefocust op funnel optimization).
trigger: /conversion-audit
---

# /conversion-audit

Diepe funnel optimization audit. Output is hypothese-lijst voor A/B tests.

## Usage

```
/conversion-audit <funnel>
# vb: /conversion-audit lead-magnet
# vb: /conversion-audit calc-to-call
# vb: /conversion-audit ad-to-buitendienst
```

## Funnels te auditen

### A. Lead-magnet funnel
Ad → LP → form fill → email confirm → download → first WA → reply

### B. Calculator funnel
Ad → calc page → input → result view → CTA → form → call booking

### C. Direct booking funnel
Ad → consult LP → form (naam/tel) → confirm → call gepland → call held

### D. Organic content funnel
Search → blog → CTA → form → ...

## Audit lagen (5)

### 1. Macro funnel metrics
Per stap: visitors → next-step → conversion %.

```
Visit:        N (100%)
Form open:    N (X%) — drop X%
Form submit:  N (X%) — drop X%
WA contact:   N (X%) — drop X%
Reply:        N (X%) — drop X%
Call booked:  N (X%) — drop X%
Call held:    N (X%) — drop X%
Buitendienst: N (X%) — drop X%
```

Vergelijk met benchmarks:
- Vorige periode (zelfde duur)
- Industry (energie/B2C lead gen)
- Cohort A vs B

### 2. Page-level analyse

#### Bounce rate
- >70% bounce op LP → hero/header issue
- <40% bounce → goed teken

#### Time on page
- <30s → niet engaging genoeg
- >5 min op LP → mogelijk verwarrend

#### Scroll depth
- 25% / 50% / 75% / 100%
- <50% reach to CTA → CTA te laag op page

#### Click maps (Hotjar / MS Clarity)
- Waar klikt men eerst?
- Klikken op niet-clickable elementen (= verwacht het wel)
- Rage clicks (frustration signaal)

### 3. Form-level

#### Field-level drop-off
Per field: hoeveel users beginnen vs voltooien?
- Telefoon-field meestal hoogste drop
- Email-field lager drop
- Optional fields nog opener laten

#### Form errors
- Validation messages: hoe vaak fired?
- Submit errors: hoe vaak fail?
- Server errors hidden in console?

#### Time-to-submit
- <30s → mogelijk bot/fake
- 1-3 min → engaged
- >5 min → friction (te veel velden of complex)

### 4. Bot conversation

#### First-message metrics
- Delivery rate (Meta WA business)
- Read rate
- Reply rate (within 24u)

#### Bot fase drop-off
- Welcome → kwalificatie: %
- Kwalificatie → hand-off: %
- Hand-off → call gepland: %

#### Compliance check
Roep `/whatsapp-test` voor synthetic test.

### 5. Hand-off + call

#### Hand-off latency
Tussen "qualified" tag → adviseur eerste contact.
Target: <2u in business hours.

#### Call no-show
% gepland → daadwerkelijk gehouden.
Target: >70%.

#### Call → buitendienst
Conversion van adviseur-gesprek naar fysieke afspraak.

## Friction detectie

Per laag, identificeer friction signaal:
- **Cognitive load**: te veel keuze / info → simplify
- **Trust gap**: geen social proof / privacy hint → versterk
- **Form friction**: te veel velden → minimize
- **Mobile UX**: niet getest op 360px → fix
- **Speed**: LCP >2.5s → /audit-site
- **Distraction**: meerdere CTA's, externe links → focus
- **Mismatch**: ad copy != LP belofte → align

## Hypotheses voor A/B test

Output is genummerde lijst met:
```
H1: Form van 4 velden naar 2 → conversion +20%
   Confidence: HIGH (industry data + matching friction)
   Effort: LAAG (1 dag)
   Test: /ab-test plan "form 4 vs 2 fields"

H2: Hero headline van vraag naar cijfer → +15%
   Confidence: MEDIUM
   Effort: LAAG
   Test: /ab-test plan "hero variant"

...
```

Sorteer op (Confidence × Impact) / Effort.

## Output format

```
═══ CONVERSION AUDIT — <funnel> ═══

PERIODE: <X> dagen
TOTAL VOLUME: N visitors

═ MACRO FUNNEL ═
[per stap conversion + drop% + delta vs vorige]

WORST DROP-OFF: <stap> (X% verlies)

═ PAGE LEVEL ═
LP: <url>
- Bounce: X% [VERGELIJK BENCHMARK]
- Time: Xs
- Scroll 75%: X%
- Top click element: <X>

[per page herhaal]

═ FORM LEVEL ═
Form: <id>
- Open: N
- Field-by-field drop:
  - first_name: 100% → 92%
  - email: 92% → 88%
  - phone: 88% → 64% [HOTSPOT]
- Submit: 64%
- Errors: <type>

═ BOT LEVEL ═
- Delivery: X%
- Read: X%
- Reply (24u): X%
- Phase drop-off: ...

═ HAND-OFF ═
- Qualified → call: X%
- Latency median: Xu
- No-show: X%

═ FRICTION FINDINGS ═
1. [type]: [waar] [evidence]
2. ...

═ HYPOTHESES (top 10, gesorteerd) ═
H1. ...
H2. ...
...

═ QUICK WINS (geen test nodig) ═
1. [low risk fix]
2. ...

═ MEMORY ═
project_conversion_audit_<funnel>_<datum>.md
```

## Hard rules
- ALTIJD vergelijking met vorige periode
- Friction findings met EVIDENCE (niet alleen mening)
- Hypotheses sorteren op (impact × confidence) / effort
- Quick wins (geen A/B nodig) ook expliciet
- Memory schrijven met benchmarks voor toekomstige delta-detectie

## Tools verwacht
- Hotjar / Microsoft Clarity (heatmaps + recordings)
- GA4 (funnel analysis)
- Meta Events Manager (pixel)
- GHL (CRM data)
- /audit-ads voor ad-zijde
- /pixel-test voor tracking quality

## Memory check
Lees: project_conversion_audit_*, project_ads_audit_*, project_outbound_canary
