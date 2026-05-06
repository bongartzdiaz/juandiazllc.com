---
name: design-infographic
description: Data-infographic voor educational content — saldering 2027 timeline, batterij capaciteit ladder, kosten-baten over jaren. Output is HTML/SVG dat printbaar is + responsive web variant. Gebruik voor pillar pages en lead-magnets.
trigger: /design-infographic
---

# /design-infographic

Educational data infographic. Lange-form, scrollable of A4 print.

## Usage

```
/design-infographic <type> <onderwerp>
# vb: /design-infographic timeline saldering-2027
# vb: /design-infographic ladder batterij-capaciteit-keuze
# vb: /design-infographic comparison zonder-vs-met-batterij
# vb: /design-infographic flow lead-tot-buitendienst
# vb: /design-infographic data kosten-vs-besparing-10-jaar
```

## Types

### A. Timeline
Horizontale of verticale tijdlijn met events.
Vb: saldering — 2024 huidig 100% → 2025 80% → ... → 2027 0%.

### B. Ladder / Tree
Hiërarchische beslissingsboom.
Vb: "Welke batterij past?" → verbruik <3000 → 5kWh, 3000-5000 → 10kWh, etc.

### C. Comparison
Side-by-side scenario A vs B.
Vb: situatie zonder batterij vs met batterij over 10 jaar.

### D. Flow
Proces-diagram met pijlen.
Vb: lead → kwalificatie → telefoongesprek → buitendienst → installatie.

### E. Data viz
Grafiek-zwaar (line/bar/area) met annotaties.
Vb: kosten energie 2020-2030 vs eigen-besparing trend.

## SVG-first approach

SVG > PNG voor infographics:
- Schaalbaar (print + web)
- Tekst SEO-indexeerbaar (en a11y)
- Klein bestand
- Animatie mogelijk (web)

Voor non-vector elementen (foto's): inline `<image>` met data URL of separate.

## Layout principes

- Lees-volgorde duidelijk (links→rechts of top→bottom)
- 1 boodschap per "scherm" / sectie
- Data-ink ratio hoog (minder versiering, meer info)
- Annotaties direct bij datapunten, niet legenda-only
- Bron-attributie ALTIJD onderaan
- Responsive: ook check op 360px breed (mobiel scrolt)

## Template structuur (HTML wrapper voor web)

```html
<article class="infographic">
  <header>
    <span class="kicker">{KICKER}</span>
    <h1>{TITLE}</h1>
    <p class="lede">{INTRO}</p>
  </header>

  <section class="ig-block ig-data">
    <svg viewBox="0 0 1200 600">
      <!-- chart inhoud, met inline title + desc voor a11y -->
      <title>{CHART_TITLE}</title>
      <desc>{CHART_DESC}</desc>
      <!-- data elements -->
    </svg>
    <p class="caption">{TOELICHTING}</p>
  </section>

  <section class="ig-block ig-callout">
    <h2>{INSIGHT_TITLE}</h2>
    <p>{INSIGHT}</p>
  </section>

  <footer class="ig-sources">
    <strong>Bronnen:</strong>
    <ul>
      <li>{BRON_1}</li>
      <li>{BRON_2}</li>
    </ul>
    <p class="meta">Laatst bijgewerkt: {DATE}</p>
  </footer>
</article>
```

## Color usage

- Primaire data-serie: #2E7D5F (zachtgroen)
- Secondaire: #3D6B9E (blauw accent)
- Tertiair / negatief: #A8412C (alleen waar relevant — bv. kostenstijging)
- Achtergrond regio: warm wit + 5% groene tint voor "highlight zone"

## Iconen
Lucide / Phosphor line-icons. 1.5px stroke. Zachtgroen.
Geen emoji-stijl, geen flat-color cartoonish.

## Bronnen-vereisten

ELKE infographic:
- Minimaal 2 bronnen
- Tier 1 voorkeur: rijksoverheid.nl, CBS, TNO, PBL, RVO
- Datum jaartal noemen
- "Laatst bijgewerkt" datum (voor freshness signaal)

Zonder bronnen = niet publiceren.

## Compliance

- [ ] Bronnen aanwezig (min 2, tier 1 indien mogelijk)
- [ ] Geen prijsgaranties (ranges OK)
- [ ] Geen concurrent producten met naam
- [ ] Cijfers verifieerbaar (link in bron)
- [ ] Datum recent of gemarkeerd "indicatief 2026"
- [ ] Disclaimers waar nodig ("indicatief", "afhankelijk van situatie")

## Voor SEO
- Wrap in `<article>` met schema.org
- Inline SVG > `<img>` voor SEO + a11y
- Alt-text op image elementen
- Data ook in HTML tabel (toggle of `<details>`) voor crawlers

## Print export
Voor lead-magnet PDF: gebruik /pdf-export of canvas-design met A4 layout.

## Hard rules
- Bronnen verplicht
- SVG-eerst (schaalbaar)
- Mobile responsive verifieren
- A11y: title + desc op SVG
- File: SVG primair, PNG/PDF voor print/social

## Memory check
Lees: reference_hmb_brand. Pakt data uit /research.
