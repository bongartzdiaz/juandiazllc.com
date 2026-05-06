---
name: design-lead-magnet
description: PDF lead-magnet design — cover + 8-12p interieur layout (e-book over saldering, batterij gids, besparingsplan). Volledig brand-compliant, met intake formulier-CTA. Gebruik om email-lijst te bouwen of als hand-out na call.
trigger: /design-lead-magnet
---

# /design-lead-magnet

PDF lead-magnet (8-16 pagina's). Hoge waarde gids in ruil voor email/contact.

## Usage

```
/design-lead-magnet <onderwerp>
# vb: /design-lead-magnet "Saldering stopt: gids voor 2027"
# vb: /design-lead-magnet "Thuisbatterij gids — keuze in 5 stappen"
# vb: /design-lead-magnet "Energie besparingsplan A4 checklist"
```

## Standaard structuur (10p)

| Pagina | Inhoud |
|---|---|
| 1 | Cover — titel, ondertitel, brand, datum |
| 2 | Intro — waarom dit document, voor wie, wat haal je eruit |
| 3 | Hoofdstuk 1 — context / "wat verandert" |
| 4 | Hoofdstuk 2 — de cijfers (data viz) |
| 5 | Hoofdstuk 3 — opties / keuzes |
| 6 | Stappenplan / checklist |
| 7 | Veelgestelde vragen (FAQ) |
| 8 | Case / voorbeeld |
| 9 | Volgende stappen + CTA |
| 10 | Bronnen + colofon |

## Cover design

```
┌────────────────────────────┐
│  [zachtgroen accent strip] │
│                            │
│  KICKER (mono, klein)      │
│                            │
│  HOOFDTITEL                │
│  (groot, 48-56pt)          │
│                            │
│  Ondertitel uitleg         │
│                            │
│  [foto of illustratie]     │
│                            │
│                            │
│  helpmijbesparen.nl        │
│  Editie 2026               │
└────────────────────────────┘
```

A4 portrait (595×842 pt PDF, of 1240×1754 px @ 150dpi).

## Pagina layout

- Marges: 24mm rondom (printsafe)
- Body: Inter 11pt, line-height 1.5
- H1 chapter: Inter 32pt bold
- H2 sectie: Inter 20pt bold
- Body: max 65 chars per regel (leesbaarheid)
- Image inset: 8mm border met caption

## Iconen + dividers

- Lucide line-icons, 24px
- Divider: 1pt zachtgroen lijn met witruimte ervoor en erna
- Pull-quote: links zachtgroen verticale balk + italic Source Sans

## Data-viz pagina

- Max 1 grote chart per pagina
- Caption beneden chart met bron
- Inset table indien nuttig (klein font)

## CTA pagina (laatste)

- Duidelijke volgende-stap met CTA-button styling
- WhatsApp-link met QR-code (voor print versie)
- Volgens CLAUDE.md §5: leid naar telefoongesprek, NIET direct buitendienst
- Email captureform tracking (UTM in QR)

```
"Wil je weten hoeveel jij kunt besparen?
Plan een kort telefoontje van 15 minuten.

[QR code naar WhatsApp]
+31 (0)xx xxx xxxx

Of stuur een bericht via helpmijbesparen.nl"
```

## Bronnen pagina (laatste)

ELKE claim met cijfer moet linken naar bron:
- Tier 1: rijksoverheid.nl, RVO, CBS
- Footnote-stijl per pagina werkt ook
- "Laatst bijgewerkt: <ISO datum>" in colofon

## File specs

- Format: PDF/A (archiefkwaliteit)
- File size: <5MB (email-friendly)
- Embed fonts (Inter, Red Hat Mono)
- Optimaliseer images (1200px breed @ 80% JPEG quality)
- Searchable text (geen geflattende layers)
- Hyperlinks actief (sources, CTAs)

## Compliance check (verplicht voor publish)

- [ ] Geen prijsgaranties
- [ ] Geen concurrent-namen
- [ ] Geen emojis in body
- [ ] Bronnen op elke claim met cijfer
- [ ] Disclaimer "indicatief, situatie-afhankelijk" waar nodig
- [ ] Datum recent (< 6 mnd voor regelgeving content)
- [ ] CTA leidt naar telefoongesprek (niet buitendienst)
- [ ] Print-test: leesbaar op A4 print
- [ ] PDF metadata: title, author, subject correct

## Distribution

- Hosted op helpmijbesparen.nl/gids/<slug>.pdf
- Achter email-form OF als open-access (kies per case)
- Tracking: download events naar GA4
- Versie-control: filename `<slug>-v<jaar>-<datum>.pdf`

## Tooling

- Layout: anthropic-skills:pdf voor structureel + canvas-design voor cover
- Charts: anthropic-skills:canvas-design of inline SVG
- Indien Word-eerst: anthropic-skills:docx → export PDF

## Hard rules
- Bronnen verplicht
- CTA: telefoongesprek, niet buitendienst
- File <5MB
- Mobile-readable (gebruik op telefoon na download)
- Versionnummer in filename

## Memory check
Lees: reference_hmb_brand, CLAUDE.md §5
