---
name: design-stat-card
description: Vierkant social card (1080×1080) met 1 groot cijfer + context + bron — voor Instagram/LinkedIn/Twitter. Gebruik om data-punten uit /research om te zetten naar shareable visual.
trigger: /design-stat-card
---

# /design-stat-card

Eén-cijfer social card. Niet meer dan 1 boodschap.

## Usage

```
/design-stat-card <stat> <context> [--source <bron>]
# vb: /design-stat-card "1-1-2027" "Vanaf wanneer saldering stopt" --source "rijksoverheid.nl"
# vb: /design-stat-card "70%" "Zelfverbruik mogelijk met thuisbatterij" --source "TNO 2025"
```

## Format

1080×1080 (Instagram square), werkt ook voor LinkedIn carousel slide.

## HTML/CSS template

```html
<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700&family=Red+Hat+Mono:wght@400;700&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1080px; height: 1080px;
  background: #FAF7F2;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  text-align: center;
  padding: 120px 80px;
  font-family: 'Inter', system-ui;
  position: relative;
}
.kicker {
  font: 600 18px/1 'Red Hat Mono', monospace;
  color: #2E7D5F; text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 48px;
}
.stat {
  font: 800 240px/1 'Red Hat Mono', monospace;
  color: #2E7D5F;
  margin-bottom: 32px;
  letter-spacing: -0.02em;
}
.context {
  font: 500 32px/1.3 'Inter';
  color: #1A1F1B;
  max-width: 800px;
  margin-bottom: 64px;
}
.source {
  font: 400 16px/1 'Inter';
  color: #5A615C;
  font-style: italic;
}
.brand {
  position: absolute; bottom: 48px; right: 48px;
  font: 700 16px/1 'Inter';
  color: #2E7D5F;
}
.accent-bar {
  position: absolute; top: 0; left: 0; right: 0; height: 8px;
  background: linear-gradient(90deg, #2E7D5F, #3D6B9E);
}
</style></head>
<body>
  <div class="accent-bar"></div>
  <div class="kicker">{KICKER}</div>
  <div class="stat">{STAT}</div>
  <div class="context">{CONTEXT}</div>
  <div class="source">Bron: {SOURCE}</div>
  <div class="brand">helpmijbesparen.nl</div>
</body></html>
```

## Rules per element

### Stat
- Max 6 chars (anders verkleinen of breken)
- Liever exact getal dan range op stat-card
- Eenheid (% / € / kWh) zelfde grootte als getal
- GEEN exacte prijzen (€-bedragen alleen voor besparingen, niet kosten)

### Context
- Max 12 woorden
- Vraag of bewering, niet beide
- B1, geen jargon
- Geen "klik nu" / "ontdek hoe" — laat data spreken

### Source
- ALTIJD aanwezig
- Tier 1 voorkeur (rijksoverheid.nl, CBS, TNO)
- Datum jaartal indien rapport ouder dan 1 jaar

## Compliance check
- [ ] Geen prijsgaranties
- [ ] Geen concurrent
- [ ] Bron aanwezig + tier 1/2
- [ ] Cijfer is geverifieerd (niet uit hoofd)
- [ ] Context onderbouwt cijfer (geen misleidende framing)

## Variants
- Light (default, zoals boven)
- Dark — `#1A1F1B` achtergrond, witte cijfers, voor LinkedIn engagement test
- Photo-bg — semi-transparante laag over foto + cijfer ervoor

## Hard rules
- Eén stat per card (NIET meerdere getallen vergelijken)
- Bron verplicht
- Brand domein in hoek
- Generate als PNG 1080×1080 voor IG, ook 1200×675 (16:9) versie voor X/LinkedIn

## Memory check
Lees: reference_hmb_brand. Pakt cijfer/bron uit /research output.
