---
name: design-thumbnail
description: YouTube/video thumbnail (1280×720) met focus-element + contrast voor mobile feed. Gebruik voor video-content, webinars, instructievideo's. Geoptimaliseerd voor CTR in feed.
trigger: /design-thumbnail
---

# /design-thumbnail

Video thumbnail. CTR-eerst design.

## Usage

```
/design-thumbnail <onderwerp> [--style face|product|text]
# vb: /design-thumbnail uitleg saldering 2027 --style face
# vb: /design-thumbnail thuisbatterij installatie --style product
```

## CTR-principes (mobile feed)

- 1 dominant focus-element (gezicht/product/getal) — neem 60% canvas
- Kleur-contrast hoog (donker subject op lichte bg of andersom)
- Tekst: max 4-6 woorden, zeer groot (min 80pt)
- Gezichts-thumbnails: oogcontact + duidelijke emotie (verbazing/twijfel/inzicht)
- GEEN clickbait-overdrive (rode cirkels, pijlen, "JE GELOOFT NIET WAT")

## 3 styles

### A. Face style
Persoon (Juan / adviseur / klant) close-up, expressie matched bij topic.
- 60% canvas: gezicht
- Tekst rechts/links naast gezicht
- Donkere gradient onderkant voor leesbaarheid

### B. Product style
Product (zonnepaneel / batterij in meterkast) als hero.
- Product 50% canvas, helder belicht
- Tekst overlay top-left
- Brand kleur als accent op product (zachtgroen highlight)

### C. Text-driven
Voor educational waar geen gezicht/product passend.
- Groot getal of stelling als hero
- Subtle photo bg (semi-transparant)
- Branded geometrische elementen

## HTML/CSS template (text-driven)

```html
<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1280px; height: 720px;
  background: linear-gradient(135deg, #1B5640 0%, #2E7D5F 100%);
  padding: 60px 80px;
  font-family: 'Inter', system-ui;
  color: #FAF7F2;
  display: flex; flex-direction: column; justify-content: center;
  position: relative; overflow: hidden;
}
.bg-pattern {
  position: absolute; top: -50%; right: -20%;
  width: 800px; height: 800px;
  background: radial-gradient(circle, #FAF7F212 0%, transparent 70%);
}
.kicker {
  font: 800 24px/1 'Inter';
  color: #FAF7F2; opacity: 0.7;
  text-transform: uppercase; letter-spacing: 0.1em;
  margin-bottom: 24px;
}
.title {
  font: 900 96px/1 'Inter';
  letter-spacing: -0.02em;
  z-index: 1;
}
.title span { color: #FAF7F2; background: #C58A2E; padding: 0 12px; }
</style></head>
<body>
  <div class="bg-pattern"></div>
  <div class="kicker">{KICKER}</div>
  <div class="title">{TITLE_PART1}<br><span>{TITLE_HIGHLIGHT}</span></div>
</body></html>
```

## Tekst rules
- Max 6 woorden totaal
- 1 hot-word geel/oranje gehighlight (#C58A2E) voor focus
- Hoofdletters mag voor titel (impact)
- Geen alle-caps in body

## Compliance check
- [ ] Geen prijzen
- [ ] Geen concurrent naam in title of zichtbaar in image
- [ ] Geen misleidende preview (thumbnail moet matchen video inhoud)
- [ ] Geen schreeuwerige rode "AANRADER!" labels
- [ ] Title fit in mobile preview (test op 320px breed)

## Naming convention
`yt-<slug>-thumb.png` — PNG (geen JPG voor scherp tekst).
File <500KB voor YouTube upload.

## Hard rules
- 1280×720 exact (16:9)
- Tekst leesbaar op mobile (verklein in head naar 30% en check)
- Niet meer dan 3 kleuren in palet
- A/B test 2 versies indien organic strategy

## Memory check
Lees: reference_hmb_brand
