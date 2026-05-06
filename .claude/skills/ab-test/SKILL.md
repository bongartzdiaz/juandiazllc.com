---
name: ab-test
description: A/B test plan + ship + analyze — voor LP variants, ad creative, email subjects, bot openers. Sample size calculator, statistical significance check, learnings-doc voor memory. Voorkomt "we testen iets en kijken wel".
trigger: /ab-test
---

# /ab-test

Statistisch valide A/B test van plan tot conclusie.

## Usage

```
/ab-test plan <wat-test-je>
/ab-test analyze <test-id>
/ab-test sample-size --baseline 0.05 --mde 0.20

# vb: /ab-test plan "LP hero variant — vraag vs stelling"
# vb: /ab-test plan "ad creative dark vs light bg"
# vb: /ab-test plan "email subject cijfer vs vraag"
```

## Wanneer wel A/B testen?

✓ Genoeg traffic om significantie te bereiken (zie sample size)
✓ Echt verschil tussen varianten (niet "comma weg, comma erbij")
✓ Meetbare conversie (form / click / reply)
✓ Vooraf hypothese opgeschreven

✗ <500 conversies/maand op die page → te weinig data
✗ Multipele tegelijk op zelfde page (interactie-effect)
✗ "Voelt beter" zonder hypothese

## Plan fase

### 1. Hypothese
Schrijf VOORAF:
```
Als ik [verandering] doe op [variant B],
verwacht ik dat [metric] stijgt met [%]
omdat [reden].
```

Vb: "Als ik de hero-headline verander van vraag naar cijfer-stelling, verwacht ik dat form-completion stijgt met 15% omdat cijfers concrete value-prop overbrengen."

### 2. Variant
Slechts 1 ding tegelijk veranderen:
- Headline OF
- CTA-text OF
- Visual OF
- Form fields aantal

NIET 3 dingen tegelijk — dan weet je niet wat werkte.

### 3. Sample size berekening

```
Inputs:
- Baseline conversion (huidige %): bv 5%
- Minimum Detectable Effect (MDE): bv 20% relatief = naar 6%
- Power: 80% (standaard)
- Significance: 95% (one-tailed) of 95% (two-tailed)

Formule (one-tailed, 95%/80%):
n_per_variant ≈ 16 × (p1×(1-p1) + p2×(1-p2)) / (p2-p1)²

Voorbeeld:
p1 = 0.05, p2 = 0.06
n ≈ 16 × (0.0475 + 0.0564) / 0.0001 = 16,624 per variant

Total traffic needed: 33,248 (split 50/50)
```

Tool: bereken handmatig of gebruik Optimizely/VWO calculator.

### 4. Looptijd berekening

```
Daily traffic op deze page: bv 200
Visitors needed total: 33,248
Days needed: 33,248 / 200 = 166 dagen

Te lang? Opties:
- Verhoog traffic (paid)
- Verhoog MDE (verwacht groter effect = minder data nodig)
- Test op hoger-traffic pagina
- Skip A/B test, doe gewoon de change
```

Min 1 week om weekday-effect uit te middelen. Max 4 weken (anders cookie-decay).

### 5. Implementatie
- Tool: Optimizely / VWO / Google Optimize alternative / eigen split
- 50/50 split (geen 90/10 — duurt te lang)
- Cookie-based assignment (sticky)
- Goal tracking: form submit / WA reply / call booked

### 6. QA voor launch
- [ ] Beide varianten gerenderd en getest
- [ ] Tracking fires op beide
- [ ] Mobile responsive beide
- [ ] Geen flicker (FOOC) — variant laadt vóór render
- [ ] Geen breaking change voor SEO (canonical klopt)

## Run fase

### Monitor (geen peeken!)
- Gefocust kijken vóór sample size = sequential testing fallacy
- Set "no-touch period" tot N bereikt
- Wel: monitoring on tracking errors / breaks

### Stop conditions
- Sample size bereikt → analyze
- Variant breekt site → kill (geen "winner")
- Externe event (concurrent launch, beleidswijziging) → kill, restart later

## Analyze fase

### Statistical significance
- p-value < 0.05 → statistically significant
- Confidence interval: niet 0%
- Effect size: praktisch significant ook?

Tool: G*Power, online calculator (vb Evan Miller's).

### Output template

```
═══ A/B TEST RESULTAAT — <test-id> ═══

HYPOTHESE: [origineel]

SETUP
- Periode: <start> tot <einde>
- Traffic A: N | Traffic B: N
- Goal: <metric>

RESULTATEN
Variant A: X conversies / N visitors = X.XX%
Variant B: Y conversies / N visitors = Y.YY%
Lift: +Z.Z% (relatief)
P-value: 0.XX
Significant: ✓ / ✗
Confidence interval: [+X% , +Y%]

CONCLUSIE
[Variant B wint / niet significant / geen verschil]

LESSONS
- [observatie 1]
- [observatie 2]
- [counter-intuïtief: ...]

VERVOLG
[ ] Implementeer winner als baseline
[ ] Test next variabele: ...
[ ] Update brand reference / template
[ ] Schrijf naar project_abtest_<id>.md voor memory

```

## Common mistakes

### 1. Te vroeg stoppen
Peeken voor sample size = false positive risk +30%.
Hou je aan plan.

### 2. Multipele goals
Pick 1 primary metric. Secondary metrics zijn observatie, geen winner-call.

### 3. Sample size negeren
"Het ziet er goed uit na 100 visitors" = onzin. Sample is wat het is.

### 4. Geen segmentatie analyse
Kijk ook per device / source / new vs return. Soms wint variant alleen op mobile.

### 5. Test → forget → no learning
Memory hook VERPLICHT. Anders herhaal je dezelfde tests.

## Hard rules
- Hypothese vóór test schrijven
- 1 variabele tegelijk
- Sample size respecteren
- Memory schrijven na (`project_abtest_<id>.md`)
- Loser-variant niet wegmoffelen — leren ervan

## Memory check
Lees: project_abtest_*, project_outbound_canary (als precedent), reference_hmb_brand voor template-defaults
