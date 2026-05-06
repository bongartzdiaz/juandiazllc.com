---
name: design-ad-creative
description: Meta Ads creative variants (3-5 versies tegelijk) — om creative fatigue te bestrijden zoals gesignaleerd in /audit-ads. Output: kant-en-klare 1080×1080 + 1080×1920 sets met copy, hooks en variatie-as. Brand compliant.
trigger: /design-ad-creative
---

# /design-ad-creative

Meta Ads creative pack — 3-5 variants per concept om fatigue te bestrijden.

## Usage

```
/design-ad-creative <concept> [--placement feed|stories|reels]
# vb: /design-ad-creative "saldering stopt 2027 — wat doe jij"
# vb: /design-ad-creative "thuisbatterij keuzehulp" --placement reels
```

## Variation axes (kies 2-3 per pack)

Om creative fatigue te bestrijden zonder concept te verspreiden:
- **Hook**: vraag vs statement vs cijfer
- **Visual**: foto vs illustratie vs split-screen
- **Color**: licht-bg vs dark-bg vs accent-overlay
- **Headline lengte**: kort vs medium
- **CTA copy**: "Bereken besparing" vs "Plan gesprek" vs "Bekijk gids"
- **Social proof**: cijfer vs quote vs geen
- **Format**: square 1080² vs vertical 1080×1920

3-5 ads per pack die 2 axes variëren = goede A/B test.

## Pack structure

### Pack output:
```
ads/
├── ad-001-hook-question.png      (1080×1080 + 1080×1920)
├── ad-002-hook-stat.png
├── ad-003-hook-statement.png
├── ad-004-color-dark.png
├── ad-005-color-accent.png
└── README.md   (copy + targeting + naming convention)
```

### README per pack
```markdown
# Ad Pack: <concept>

Concept: <1 zin>
Variation axes: <hook> × <color>

| Ad ID | Hook style | Color | Headline | Body | CTA |
|---|---|---|---|---|---|
| 001 | Question | Light | "..." | "..." | "..." |
| 002 | Stat | Light | ... | ... | ... |
...

## Targeting per variant
- Audience A (oriëntatiefase): ad-001, ad-003
- Audience B (aankoopfase): ad-002, ad-004
- Lookalike: ad-005 alle

## Naming convention voor Meta Ads Manager
HMB_2026-05_THB_<axis>_<id>
Example: HMB_2026-05_THB_HOOK-Q_001

## A/B-test plan
- Run alle 5 met €10/dag/ad voor 5 dagen
- Beoordeel op CPL en CTR (niet alleen impressions)
- Winner naar audience B met €30/dag scaling
- Loser na 5d <0.5% CTR pause
```

## Visual templates

### Square 1080×1080 — feed
- 60% canvas: hero element (foto persoon/situatie)
- 30%: tekst overlay (max 4-6 woorden, klein gedeelte canvas voor mobile-first)
- 10%: brand + CTA badge

### Vertical 1080×1920 — stories/reels
- 70% top: visual / video first frame
- 25% mid: tekst (3-5 woorden, vetgedrukt)
- 5% bottom: CTA badge "Tap voor meer" of swipe-up

## HTML/CSS template (square)

```html
<style>
.ad {
  width: 1080px; height: 1080px;
  background: linear-gradient(135deg, #2E7D5F 0%, #1B5640 100%);
  position: relative; overflow: hidden;
  font-family: 'Inter', system-ui;
  color: #FAF7F2;
}
.ad-photo {
  position: absolute; inset: 0;
  background: url('{PHOTO}') center/cover;
  opacity: 0.85;
}
.ad-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to bottom, transparent 0%, rgba(26,31,27,0.7) 100%);
}
.ad-content {
  position: absolute; bottom: 80px; left: 80px; right: 80px;
}
.ad-kicker {
  font: 700 18px/1 'Red Hat Mono'; color: #C58A2E;
  letter-spacing: 0.1em; text-transform: uppercase;
  margin-bottom: 16px;
}
.ad-headline {
  font: 800 64px/1.05 'Inter';
  margin-bottom: 24px;
  letter-spacing: -0.02em;
}
.ad-body {
  font: 500 22px/1.4 'Inter'; opacity: 0.9;
  margin-bottom: 32px; max-width: 800px;
}
.ad-cta {
  display: inline-block;
  background: #FAF7F2; color: #1B5640;
  padding: 16px 32px;
  font: 700 18px/1 'Inter';
  border-radius: 8px;
}
.ad-brand {
  position: absolute; top: 40px; right: 40px;
  font: 700 16px/1 'Inter'; color: #FAF7F2;
}
</style>
```

## Copy regels (Meta-specifiek)

### Headline
- Max 40 chars (mobile-friendly preview)
- Geen alle-caps
- Vraag of stelling, niet beide

### Body (caption)
- Max 125 chars zichtbaar zonder "Read more"
- Eerste zin = de hook
- Geen prijs noemen
- Disclaimer "*resultaten variëren" indien claim

### CTA copy opties
- "Bereken jouw besparing"
- "Plan een gesprek"
- "Bekijk de gids"
- "Lees meer"

NOOIT: "Vraag offerte aan" (skipt stap 2 funnel)
NOOIT: "Koop nu" (premature voor energie-aankoop traject)

## Compliance gates (Meta + brand)

- [ ] Geen voor/na claims zonder bewijs
- [ ] Geen "100% besparing" / "gratis"
- [ ] Geen exacte prijsgaranties
- [ ] Geen concurrent-namen
- [ ] Geen voor/na lichaamsfoto's (niet relevant maar check)
- [ ] Disclaimer waar claim
- [ ] CTA leidt naar landing page met form, niet direct WA (consent flow)
- [ ] Targeting binnen Meta beleid (geen sensitive attributes)
- [ ] Bron-link in caption indien data-claim

## Audience aware
Doelgroep: koopwoning, 35-65, NL (CLAUDE.md §2). Targeting:
- Huiseigenaar (interest: real estate, home improvement)
- Energie-interest (zonnepanelen, isolatie, energie besparen)
- Geografie: NL, geen hoogbouw-stedelijke kernen
- Exclude: bestaande customers (custom audience)

## Hard rules
- Geen prijzen in creative
- Geen concurrent in tekst of visual
- Min 3 variants per pack (anders geen A/B value)
- Naming convention strict (voor reporting in /weekrapport-hmb)
- File <2MB voor snelle Meta upload
- Test in Meta Ads Library na publish (zien wat live is)

## Anti-fatigue ritueel
Na 14 dagen of bij CTR <0.5%:
- Roep `/audit-ads` om fatigue te bevestigen
- Roep `/design-ad-creative` voor refresh pack
- Pause oude, launch nieuwe

## Memory check
Lees: reference_hmb_brand, project_outbound_canary, project_ads_audit_*
