---
name: design-og-card
description: Open Graph share card (1200×630) voor Twitter/LinkedIn/Facebook preview met titel-overlay + brand-styling. Output is HTML/CSS template dat dynamisch invulbaar is per pagina, of een statisch SVG/PNG. Gebruik bij elk artikel + voor social shares.
trigger: /design-og-card
---

# /design-og-card

OG / Twitter card met overlay tekst — anders dan featured image (deze HEEFT tekst, op separate composit-laag).

## Usage

```
/design-og-card <titel> [--subtitle <sub>] [--badge <kicker>]
# vb: /design-og-card "Saldering stopt in 2027 — wat verandert"
# vb: /design-og-card "Thuisbatterij in 5 stappen" --badge "Gids"
```

## Variants

### A. Photo + overlay
Foto-achtergrond (zachtgroen tint) + donkere gradient + tekst.

### B. Solid brand
Warm wit achtergrond + zachtgroen geometrische accent + tekst.

### C. Stat-driven
Groot cijfer + context + bron-citaat (gebruik /design-stat-card als alternatief).

## HTML/CSS template

```html
<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&family=Red+Hat+Mono&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body {
  width: 1200px; height: 630px;
  font-family: 'Inter', system-ui;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 64px;
  background: #FAF7F2;
  position: relative; overflow: hidden;
}
.bg-accent {
  position: absolute; top: -20%; right: -10%;
  width: 600px; height: 600px; border-radius: 50%;
  background: radial-gradient(circle, #2E7D5F33 0%, transparent 70%);
}
.kicker {
  font: 600 16px/1 'Red Hat Mono', monospace;
  color: #2E7D5F; text-transform: uppercase; letter-spacing: 0.08em;
}
h1 {
  font: 800 56px/1.1 'Inter';
  color: #1A1F1B; max-width: 900px;
}
.footer {
  display: flex; justify-content: space-between; align-items: flex-end;
  font: 500 18px/1 'Inter'; color: #5A615C;
}
.brand { font-weight: 700; color: #2E7D5F; }
</style></head>
<body>
  <div class="bg-accent"></div>
  <div class="kicker">{KICKER}</div>
  <h1>{TITLE}</h1>
  <div class="footer">
    <span class="brand">helpmijbesparen.nl</span>
    <span>{DATE}</span>
  </div>
</body></html>
```

Render via Puppeteer / Playwright naar PNG 1200×630.

## Title rules
- Max 70 chars (anders cut-off in preview)
- Geen vraagteken op einde (test: question-mark verlaagt CTR)
- Geen alle-caps
- Cijfers als digits ("5 stappen" niet "vijf stappen")

## Meta tags die hierbij horen

```html
<meta property="og:image" content="<url>" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="<url>" />
```

## Hard rules
- Geen prijzen
- Geen concurrent-namen
- Title fits in 1-2 regels (max 70 chars)
- Brand domein altijd in footer voor herkenbaarheid
- File: PNG of WebP, <150KB
- Test in Twitter Card Validator + LinkedIn Post Inspector

## Memory check
Lees: reference_hmb_brand
