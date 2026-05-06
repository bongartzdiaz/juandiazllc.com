---
name: landing-page
description: Generieke landing page (lead-magnet download, webinar signup, gids-aanvraag, event registratie) — niet calculator (zie /calc-page) en niet artikel (zie /seo-publish). Conversie-eerst layout met form, social proof, FAQ.
trigger: /landing-page
---

# /landing-page

Conversion landing page. Eén doel, één form, geen distractie.

## Usage

```
/landing-page <type> <onderwerp>
# vb: /landing-page lead-magnet "Saldering 2027 gids"
# vb: /landing-page webinar "Live: thuisbatterij keuze in 2026"
# vb: /landing-page event "Open dag installatie"
# vb: /landing-page consult "Plan een gratis gesprek"
```

## LP types

### A. Lead-magnet download
Doel: email capture in ruil voor PDF gids.
Form: alleen email + first name.

### B. Webinar / event signup
Doel: registratie voor live event.
Form: email + naam + telefoon (optioneel).

### C. Consult booking
Doel: telefoongesprek plannen (3-stappen funnel — eerste stap).
Form: naam + telefoon + best moment.

### D. Quote request (geen exacte prijs)
Doel: persoonlijk advies aanvragen.
Form: naam + tel + situatie (panelen ja/nee, verbruik range).

## Sectie structuur (strict — verander niet zonder A/B test)

### 1. Hero (above the fold)
- H1: probleem + oplossing in 1 zin (max 12 wrd)
- Sub: 1-2 zin uitleg
- Form (rechts) of CTA-button die naar form scrolt
- 1 visual (hero image 1920×600 of geen)

### 2. Social proof
- Klantcijfer ("X huishoudens al geadviseerd")
- Logo's (alleen als echt en met permission)
- Testimonial (zie /design-quote-card)
- ALLEEN echte cijfers, geen "duizenden tevreden klanten" zonder bewijs

### 3. Wat krijg je
3-4 bullets met concrete value.
Geen vague "experts in energie" — wel "5 stappen om jouw besparing te berekenen".

### 4. Hoe werkt het
3-4 stappen (numerieke flow).
Vb: "Vul formulier → ontvang gids → plan kort gesprek".

### 5. Sociaal bewijs uitgebreid
Quote of case study.
Met permission!

### 6. FAQ (5-8 vragen)
PAA mining — wat zoeken mensen rond dit onderwerp.
Schema FAQ markup verplicht.

### 7. Tweede CTA (form herhalen of scroll-to-top)

### 8. Footer
- Privacy policy link
- Contact
- KvK + adres

## Form regels

### Field minimalisme
- Lead-magnet: 2 fields (email + first name)
- Consult: 3 fields max (naam + tel + situatie)
- Webinar: email + naam, telefoon optioneel

Elke extra field = ~10% conversion loss. Less is more.

### Field labels
- Boven field, niet placeholder-only
- Korte, klare labels: "Naam", "Telefoonnummer"
- Required asterisk waar nodig

### Validation
- Inline (bij blur), niet pas op submit
- Concrete fout: "Telefoonnummer moet 10 cijfers zijn" niet "Invalid"

### Privacy hint onder form
> "We bellen alleen na jouw bevestiging. Geen spam."

### Submit button
- Concrete actie: "Ontvang gids" niet "Submit"
- Brand kleur (zachtgroen #2E7D5F)
- Loading state bij click

## HTML template (lead-magnet variant)

```html
<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{TITLE}</title>
<meta name="description" content="{META_DESC}">
<!-- Schema FAQ markup verplicht — call /schema-gen -->
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Inter', system-ui; color: #1A1F1B; line-height: 1.6; background: #FAF7F2; }
.hero { padding: 80px 24px; background: linear-gradient(135deg, #2E7D5F 0%, #1B5640 100%); color: #FAF7F2; }
.hero-grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.hero h1 { font-size: 44px; line-height: 1.1; margin-bottom: 16px; }
.hero .sub { font-size: 18px; opacity: 0.9; margin-bottom: 24px; }
.form-card { background: #FAF7F2; color: #1A1F1B; padding: 32px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
.form-card h2 { font-size: 20px; margin-bottom: 16px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-weight: 600; margin-bottom: 4px; font-size: 14px; }
.field input { width: 100%; padding: 12px 16px; border: 1px solid #E5E1D8; border-radius: 6px; font-size: 16px; }
.btn { width: 100%; padding: 16px; background: #2E7D5F; color: #fff; border: 0; border-radius: 6px; font-size: 16px; font-weight: 700; cursor: pointer; }
.privacy { font-size: 12px; color: #5A615C; margin-top: 12px; }

@media (max-width: 768px) { .hero-grid { grid-template-columns: 1fr; gap: 32px; } }

.section { padding: 64px 24px; }
.section-inner { max-width: 900px; margin: 0 auto; }
.proof { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; text-align: center; }
.proof .num { font: 800 48px/1 'Red Hat Mono', monospace; color: #2E7D5F; }
.benefits { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.benefit { display: flex; gap: 16px; }
.benefit .icon { width: 24px; height: 24px; flex-shrink: 0; color: #2E7D5F; }
.faq details { background: #fff; padding: 16px 24px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #E5E1D8; }
.faq summary { font-weight: 700; cursor: pointer; }
</style>
</head>
<body>

<section class="hero">
  <div class="hero-grid">
    <div>
      <h1>{H1}</h1>
      <p class="sub">{SUB}</p>
    </div>
    <form class="form-card" action="{ACTION}" method="POST">
      <h2>{FORM_TITLE}</h2>
      <div class="field">
        <label>Voornaam</label>
        <input type="text" name="first_name" required>
      </div>
      <div class="field">
        <label>E-mailadres</label>
        <input type="email" name="email" required>
      </div>
      <button class="btn" type="submit">{CTA_BUTTON}</button>
      <p class="privacy">We sturen alleen wat je aanvraagt. Geen spam, uitschrijven kan altijd.</p>
    </form>
  </div>
</section>

<!-- Social proof / Wat krijg je / Hoe werkt het / FAQ / Footer -->

</body>
</html>
```

## SEO

- Meta title: <60 chars, keyword + brand
- Meta description: <155 chars met CTA
- Schema FAQ (verplicht voor PAA)
- Open Graph tags (gebruik /design-og-card)
- Canonical tag
- Indexable (geen noindex tenzij gated content)

## Tracking

- GA4 event op form submit
- Meta pixel form submit
- UTM-params bewaren in hidden fields (utm_source, utm_campaign)
- GHL push met source-tag voor attribution

## Compliance

- [ ] Privacy hint bij form
- [ ] Privacy policy link in footer
- [ ] Cookie consent (functional only — track na consent)
- [ ] Geen prijsgarantie
- [ ] Geen concurrent in copy/visual
- [ ] Disclaimer "indicatief" waar claims
- [ ] AVG: minimal data, doel-gebonden

## Conversie benchmarks

| Type | Target conversion |
|---|---|
| Lead-magnet | 25-40% (warm traffic) — 8-15% (cold ads) |
| Webinar signup | 15-30% (warm) — 3-8% (cold) |
| Consult booking | 5-15% (warm) — 1-3% (cold) |

Onder benchmark? Roep `/conversion-audit` aan.

## Hard rules
- 1 doel per LP (geen multi-CTA)
- Form min fields
- Geen prijzen
- Geen concurrent
- Mobile-first (test op 360px)
- Schema FAQ
- Tracking compleet vóór live

## Memory check
Lees: reference_hmb_brand, CLAUDE.md §3 + §5
