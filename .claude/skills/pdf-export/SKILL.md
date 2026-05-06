---
name: pdf-export
description: Genereer PDF exports — rapporten (weekrapport, audits, blueprints), CAD output, lead-magnet PDFs, offerte-templates. Met titelblok en branding. Gebruik wanneer Juan een PDF nodig heeft voor klant, intern of als download.
trigger: /pdf-export
---

# /pdf-export

PDF generation voor verschillende doelen.

## Usage

```
/pdf-export <type> <input>
/pdf-export <type> <input> --branding hmb|voltafy|kompas
/pdf-export <type> <input> --output <pad>
```

Types:
- `weekrapport` — HMB weekrapport naar PDF
- `audit` — audit output naar bestuurdersversie PDF
- `blueprint` — PT blueprint (zoals PT-BLUEPRINT.pdf van 30 apr)
- `cad` — CAD export met titelblok (van Pascal Editor / 2D CAD module)
- `lead-magnet` — gated content download
- `offerte` — offerte template (via /offerte-check funnel context)
- `note` — vault note → PDF

## Generieke onderdelen
- Titelblok: bedrijf, datum, versie, auteur, document type
- Header/footer per pagina
- Inhoudsopgave bij >5 pagina's
- Page numbers
- Watermark "DRAFT" indien --draft
- Hyperlinks intact (geen flattened text)
- Embedded fonts
- Selectable text (geen scan-PDF)

## Per type templates

### weekrapport
- Cover: HMB logo, "Week N — Meta Ads", datum range
- Inhoud: spend / leads / DM Champ / KPI tabel / acties
- Footer: account 932039344875575 + auteur

### audit
- Executive summary (1 pagina)
- Findings per scope met severity-icons
- Top 10 prioriteiten op pagina 2
- Bijlage: volledige output

### blueprint
- Diagrammen (mermaid → SVG → PDF)
- Architecture overview
- Tech specs

### cad
- Titelblok: project, schaal, datum, tekenaar
- Layers conform standaard
- A4/A3 layout per drawing

### offerte
- Klantgegevens
- Specs per onderdeel
- GEEN exacte prijzen — "Op aanvraag" of "Indicatie €X-€Y"
- Geldigheidsduur
- Voorwaarden footer

## Output

Pad: `C:\Users\LENOVO\Downloads\<type>-<datum>.pdf`
Of: vault `C:\business\Mr Diaz\Resources\pdf-exports\`

## Hard rules
- HMB: NOOIT exacte prijzen in PDF
- PII (klantgegevens): encrypted opslaan of direct na verzenden verwijderen
- Geen emojis tenzij --branding instellingen het toestaan
- ALTIJD page numbers en footer
- Voor CAD: titelblok verplicht (zie logboek_2026_04_27)
