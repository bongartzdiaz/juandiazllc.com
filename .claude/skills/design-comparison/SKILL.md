---
name: design-comparison
description: Vergelijkings-visual (tabel of side-by-side) zonder concurrent-bashing — gebruikt categorieën ("DC-gekoppeld" vs "AC-gekoppeld") in plaats van merknamen. Voor product-edu, technische keuzes, situatie-vergelijking.
trigger: /design-comparison
---

# /design-comparison

Vergelijkings-visual. KRITISCH: geen concurrent-namen (CLAUDE.md §2 verbod).

## Usage

```
/design-comparison <a> <b>
# vb: /design-comparison "DC-gekoppelde batterij" "AC-gekoppelde batterij"
# vb: /design-comparison "saldering 2024" "saldering 2027"
# vb: /design-comparison "alleen panelen" "panelen + batterij"
```

## ABSOLUUT VERBODEN
- Productnamen concurrenten (Sessy / Powerwall / Heartbeat / Nexus)
- Bedrijfsnamen vergelijken (Zonneplan / 1KOMMA5° etc)
- Negatieve framing concurrenten

## WEL toegestaan
- Generieke categorieën (DC vs AC, hybride vs string, lithium-ion vs LFP)
- Eigen producten (Voltafy mag op voltafy.nl)
- Situaties (met / zonder batterij — eigen scenarios)
- Tijdsvergelijking (oude regel vs nieuwe regel)

## Layout types

### A. Side-by-side cards
Twee gelijkwaardige cards naast elkaar.
- Geen "winner" badge — neutraal blijven
- Zelfde aantal eigenschappen aan beide kanten
- "Beste voor" sectie helpt lezer kiezen zonder oordeel

### B. Tabel (matrix)
Multi-property vergelijking.
- Kolommen = options
- Rijen = eigenschappen
- Cells: ✓/✗ minimaal, korte tekst voorkeur

### C. Voor / na
Tijds-as.
- Linker = voor
- Rechter = na
- Pijl-overgang in midden
- Highlight wat verandert

## HTML template (side-by-side)

```html
<div class="comparison">
  <div class="comp-card">
    <header>
      <span class="comp-badge">Optie A</span>
      <h3>{A_TITLE}</h3>
    </header>
    <ul class="comp-features">
      <li><span class="icon">✓</span> {A_FEATURE_1}</li>
      <li><span class="icon">✓</span> {A_FEATURE_2}</li>
      <li><span class="icon">✗</span> {A_LIMITATION}</li>
    </ul>
    <footer class="comp-best">
      <strong>Beste voor:</strong> {A_BEST_FOR}
    </footer>
  </div>

  <div class="comp-divider">
    <span>vs</span>
  </div>

  <div class="comp-card">
    <header>
      <span class="comp-badge">Optie B</span>
      <h3>{B_TITLE}</h3>
    </header>
    <ul class="comp-features">
      <li><span class="icon">✓</span> {B_FEATURE_1}</li>
      <li><span class="icon">✓</span> {B_FEATURE_2}</li>
      <li><span class="icon">✗</span> {B_LIMITATION}</li>
    </ul>
    <footer class="comp-best">
      <strong>Beste voor:</strong> {B_BEST_FOR}
    </footer>
  </div>
</div>

<style>
.comparison {
  display: grid; grid-template-columns: 1fr auto 1fr; gap: 24px;
  font-family: 'Inter', system-ui;
}
.comp-card {
  background: #FAF7F2; border: 1px solid #E5E1D8;
  border-radius: 12px; padding: 32px;
}
.comp-badge {
  display: inline-block;
  background: #2E7D5F; color: #FAF7F2;
  padding: 4px 12px; border-radius: 4px;
  font: 700 12px/1 'Red Hat Mono', monospace;
  text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 16px;
}
.comp-card h3 {
  font: 700 22px/1.3 'Inter';
  color: #1A1F1B;
  margin-bottom: 24px;
}
.comp-features { list-style: none; padding: 0; margin: 0 0 24px; }
.comp-features li {
  display: flex; gap: 12px; padding: 8px 0;
  border-bottom: 1px solid #E5E1D8;
  font: 500 16px/1.4 'Inter'; color: #1A1F1B;
}
.comp-features .icon {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 50%; flex-shrink: 0;
  font-weight: 700;
}
.comp-features li:has(.icon:first-child:contains("✓")) .icon { background: #2E7D5F22; color: #2E7D5F; }
.comp-features li:has(.icon:first-child:contains("✗")) .icon { background: #A8412C22; color: #A8412C; }
.comp-best {
  background: #FAF7F2; border-top: 2px solid #2E7D5F;
  padding-top: 16px; margin-top: 16px;
  font: 500 14px/1.4 'Inter'; color: #5A615C;
}
.comp-divider {
  display: flex; align-items: center; justify-content: center;
}
.comp-divider span {
  font: 700 18px/1 'Red Hat Mono';
  color: #2E7D5F; opacity: 0.5;
}
</style>
```

## Compliance gates

VOORDAT opslaan:
- [ ] Geen concurrent-bedrijfsnamen
- [ ] Geen concurrent-productnamen
- [ ] Beide opties evenwaardig gepresenteerd
- [ ] "Beste voor" geeft lezer keuze, geen advice-bias
- [ ] Geen prijsgaranties
- [ ] Bron(nen) onder vergelijking voor technische claims

## Schema markup
Wrap in `<table>` semantic of als `Article` met dataset.

## Hard rules
- ZERO concurrent-namen (auto-fail bij detectie)
- Beide kanten gelijke vorm (zelfde aantal features)
- Geen verborgen bias (alle nadelen evenwaardig genoemd)
- Bron-link voor technische claims

## Memory check
Lees: reference_hmb_brand, CLAUDE.md §2 verboden lijst
