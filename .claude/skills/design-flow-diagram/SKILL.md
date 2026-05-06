---
name: design-flow-diagram
description: Proces-flow / stappenplan visual — voor sales funnel uitleg, installatie-traject, beslissingsbomen, energiestroom (paneel→batterij→grid). Output SVG dat schaalt voor web + print.
trigger: /design-flow-diagram
---

# /design-flow-diagram

Visuele flow met stappen + pijlen + decision points.

## Usage

```
/design-flow-diagram <type> <onderwerp>
# vb: /design-flow-diagram linear "Lead tot installatie in 4 stappen"
# vb: /design-flow-diagram decision "Welke batterij past bij mij"
# vb: /design-flow-diagram circular "Dagcyclus zelfverbruik"
# vb: /design-flow-diagram energie "Zon → paneel → batterij → huis → grid"
```

## Types

### A. Linear (4-6 stappen)
Step 1 → Step 2 → Step 3 → ... met genummerde nodes.

### B. Decision tree
Vraag → ja/nee → vervolgvraag → uitkomst.
Voor "welke optie past bij mij" content.

### C. Circular / cyclus
Continue cyclus, geen begin/eind (energie-flow, dag-nacht cyclus).

### D. Energie-flow
Specifiek voor energiesysteem-uitleg.
- Zonne-icoon links
- Pijlen met kWh-richting
- Componenten als nodes (paneel, omvormer, batterij, huis, grid)

## SVG template (linear 5-stap)

```svg
<svg viewBox="0 0 1200 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="flowtitle">
  <title id="flowtitle">{FLOW_TITLE}</title>

  <!-- 5 nodes -->
  <g transform="translate(60, 100)">
    <circle cx="60" cy="60" r="50" fill="#2E7D5F" />
    <text x="60" y="68" text-anchor="middle" font-family="Inter" font-weight="800" font-size="32" fill="#FAF7F2">1</text>
    <text x="60" y="160" text-anchor="middle" font-family="Inter" font-weight="600" font-size="16" fill="#1A1F1B">{STEP_1_TITLE}</text>
    <text x="60" y="184" text-anchor="middle" font-family="Inter" font-weight="400" font-size="12" fill="#5A615C">{STEP_1_DESC}</text>
  </g>

  <!-- Pijl 1→2 -->
  <path d="M 180 160 L 280 160" stroke="#2E7D5F" stroke-width="2" marker-end="url(#arrow)" fill="none" />

  <g transform="translate(280, 100)">...</g>
  <!-- herhaal voor 3, 4, 5 -->

  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M0,0 L12,6 L0,12 z" fill="#2E7D5F" />
    </marker>
  </defs>
</svg>
```

## Decision tree template

```svg
<svg viewBox="0 0 1200 600">
  <!-- Question node -->
  <rect x="500" y="20" width="200" height="80" rx="40" fill="#FAF7F2" stroke="#2E7D5F" stroke-width="2" />
  <text x="600" y="60" text-anchor="middle" font-family="Inter" font-weight="700" font-size="14">{Q1}</text>

  <!-- Branches -->
  <line x1="500" y1="100" x2="300" y2="180" stroke="#2E7D5F" stroke-width="2" />
  <text x="380" y="150" font-family="Red Hat Mono" font-size="12" fill="#2E7D5F">JA</text>
  <line x1="700" y1="100" x2="900" y2="180" stroke="#2E7D5F" stroke-width="2" />
  <text x="800" y="150" font-family="Red Hat Mono" font-size="12" fill="#2E7D5F">NEE</text>

  <!-- Answer nodes -->
  <rect x="200" y="180" width="200" height="80" rx="8" fill="#2E7D5F" />
  <text x="300" y="220" text-anchor="middle" font-family="Inter" font-weight="700" font-size="14" fill="#FAF7F2">{ANSWER_A}</text>
</svg>
```

## Sales funnel flow (HMB specifiek)

ALTIJD volgens CLAUDE.md §5:
1. WhatsApp (DM Champ bot) — basis kwalificatie
2. Telefoongesprek (adviseur) — diepere kwalificatie
3. Buitendienst bezoek — offerte op maat

NOOIT in flow tonen: WhatsApp → buitendienst (skipt stap 2 = compliance fail).

## Energie-flow specifiek

Standaard componenten:
- ☀ Zonne-instraling
- ⊞ Zonnepanelen (DC out)
- ⚡ Omvormer (DC→AC)
- 🔋 Thuisbatterij (storage)
- 🏠 Huishouden verbruik
- ⇄ Net (grid teruglever / inkoop)

Pijlen tonen energierichting + kWh-grootte.

LET OP: gebruik geen emoji's in finale render — vervang door iconen of SVG paths.

## Compliance check
- [ ] Sales funnel toont alle 3 stappen (geen skip)
- [ ] Geen concurrent merken in component-namen
- [ ] Geen prijzen in nodes
- [ ] B1 leesbaar in stap-titels
- [ ] Bron voor technische claims (kWh aantallen, percentages)

## Hard rules
- SVG voorkeur (responsive + a11y)
- Pijlen 1 richting tenzij cyclus
- Max 6 hoofd-nodes (anders te complex)
- Tekst in nodes max 4-5 woorden
- Mobile: stack verticaal indien <768px

## Memory check
Lees: reference_hmb_brand, CLAUDE.md §5 (sales funnel)
