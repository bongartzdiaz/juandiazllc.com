---
name: design-featured-image
description: Genereer blog featured image (1200×630) volgens HMB brand — fotorealistisch, brand kleuren, geen tekst-in-image. Output is Imagen 3 / Gemini prompt + CSS overlay snippet voor titel. Gebruik bij elk nieuw artikel via /seo-publish.
trigger: /design-featured-image
---

# /design-featured-image

Featured image (1200×630) voor blog + social share.

## Usage

```
/design-featured-image <onderwerp>
# vb: /design-featured-image thuisbatterij in meterkast
# vb: /design-featured-image gezin bekijkt energierekening
# vb: /design-featured-image saldering eindigt 2027
```

## Output

### 1. Imagen 3 / Gemini prompt
Volgt /banner-prompt patroon, met brand reference geladen:

```
[onderwerp] in een typische Nederlandse koopwoning, fotorealistisch,
warm natuurlijk daglicht door raam links, palet warm wit (#FAF7F2)
en zachtgroen (#2E7D5F) accenten in setting, geen tekst,
geen logo's, oog-niveau perspectief, ondiepe DOF f/2.8,
1200×630 landscape, rule-of-thirds met focus 1/3 vanaf links,
authentieke uitstraling geen stock-foto cliché
```

Plus 2 variaties (verschillende composities) voor A/B test.

### 2. CSS overlay snippet
Voor titel in HTML, NIET in image:

```html
<div class="featured-image-wrapper">
  <img src="<image-url>" alt="<beschrijving>" width="1200" height="630">
  <div class="featured-overlay">
    <h1>{H1}</h1>
    <p class="kicker">{kicker}</p>
  </div>
</div>

<style>
.featured-image-wrapper { position: relative; }
.featured-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, rgba(26,31,27,0.85), transparent);
  padding: 32px 48px; color: #FAF7F2;
}
.featured-overlay h1 {
  font: 700 36px/1.2 'Inter', system-ui;
  margin: 0 0 8px;
}
.featured-overlay .kicker {
  font: 500 14px/1.4 'Red Hat Mono', monospace;
  color: #2E7D5F; text-transform: uppercase; letter-spacing: 0.05em;
}
</style>
```

### 3. Alt-text suggestie
Beschrijvend, SEO-vriendelijk, B1, geen keyword stuffing.

### 4. Filename suggestie
`<slug>-featured-1200x630.webp` — WebP voor performance.

## Hard rules
- 1200×630 exact
- Geen tekst in image (overlay alleen via CSS)
- Geen concurrent producten / logo's
- Geen prijzen / cijfers in image
- WebP voorkeur, fallback JPEG
- Alt-text verplicht
- File size <200KB target

## Memory check
Lees: reference_hmb_brand, banner-prompt skill voor Imagen patterns
