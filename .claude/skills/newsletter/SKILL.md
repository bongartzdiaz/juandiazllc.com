---
name: newsletter
description: Recurring HMB nieuwsbrief format — wekelijks/2-wekelijks digest met curated nieuws + 1 nieuw stuk content + CTA. Vast template zodat lezers het herkennen. Andere dan /email-campaign (single send).
trigger: /newsletter
---

# /newsletter

Recurring nieuwsbrief. Zelfde structuur elke editie zodat lezers gewoonte krijgen.

## Usage

```
/newsletter <editie-nr>
# vb: /newsletter 24
# vb: /newsletter --weekly  # auto editie
# vb: /newsletter --topic "saldering deadline"  # themed editie
```

## Cadans

| Frequentie | Wanneer |
|---|---|
| Wekelijks | Dinsdag 09:00 — best open hours NL |
| 2-wekelijks | Even week dinsdag |
| Maandelijks | Eerste dinsdag van de maand |

Pick één en hou je eraan. Inconsistent = unsubscribes.

## Vast template (5 secties)

### 1. Hoofd-onderwerp (~150 wrd)
1 hoofdverhaal van deze week. Eigen content, niet curated.
- H2 als koppen
- 1 cijfer + bron
- Link naar full artikel op site (drives traffic)

### 2. Nieuws-snippets (3 items, ~50 wrd elk)
Curated nieuws — saldering, batterij-tech, beleid, energiemarkt.
- Per item: kop + 2 zinnen + bron-link
- Geen full-rewrite, eerlijke attributie

### 3. Snel cijfer / inzicht
1 sterk cijfer met context.
Link naar `/design-stat-card` voor visual.

### 4. Tip van de week
Praktische actionable tip — "5 minuten energie audit", "thermostaat instelling".
Lichte tone, niet sales.

### 5. CTA
1 enkele CTA — klein, niet pushy.
Roteer per editie:
- Bel-actie ("plan kort gesprek")
- Content download ("nieuwe gids")
- Calculator ("bereken jouw besparing")
- Survey ("welke vraag heb je")

## HTML template

```html
<!DOCTYPE html>
<html><head><style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Red+Hat+Mono&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Inter', system-ui; line-height: 1.6; color: #1A1F1B; background: #FAF7F2; }
.container { max-width: 600px; margin: 0 auto; background: #fff; }
.header { padding: 32px 32px 16px; border-bottom: 4px solid #2E7D5F; }
.brand { font: 700 14px/1 'Red Hat Mono'; color: #2E7D5F; text-transform: uppercase; letter-spacing: 0.08em; }
.editie { font-size: 13px; color: #5A615C; margin-top: 4px; }
.section { padding: 24px 32px; border-bottom: 1px solid #E5E1D8; }
.section h2 { font-size: 22px; margin-bottom: 12px; }
.section h3 { font-size: 16px; margin-bottom: 6px; }
.snippet { padding: 16px 0; border-bottom: 1px solid #E5E1D8; }
.snippet:last-child { border: 0; }
.cta { background: #2E7D5F; color: #fff; padding: 16px 32px; border-radius: 8px;
       display: inline-block; text-decoration: none; font-weight: 700; margin-top: 12px; }
.stat { background: #FAF7F2; padding: 24px; border-left: 4px solid #2E7D5F; margin: 16px 0; }
.stat .number { font: 800 48px/1 'Red Hat Mono'; color: #2E7D5F; }
.stat .context { font-size: 16px; color: #1A1F1B; margin-top: 8px; }
.footer { padding: 24px 32px; font-size: 12px; color: #5A615C; text-align: center; }
.footer a { color: #5A615C; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">helpmijbesparen.nl</div>
    <div class="editie">Editie {NR} — {DATUM}</div>
  </div>

  <div class="section">
    <h2>{HOOFDKOP}</h2>
    <p>{HOOFDVERHAAL}</p>
    <p><a href="{HOOFDLINK}">Lees verder →</a></p>
  </div>

  <div class="section">
    <h2>Deze week in energie</h2>
    <div class="snippet">
      <h3>{SNIP1_TITLE}</h3>
      <p>{SNIP1_BODY} <a href="{SNIP1_BRON}">Bron</a></p>
    </div>
    <!-- snip 2, 3 -->
  </div>

  <div class="section">
    <div class="stat">
      <div class="number">{CIJFER}</div>
      <div class="context">{CONTEXT}</div>
      <p style="font-size:12px; color:#5A615C; margin-top:8px;">Bron: {BRON}</p>
    </div>
  </div>

  <div class="section">
    <h2>Tip van de week</h2>
    <p>{TIP}</p>
  </div>

  <div class="section" style="text-align:center;">
    <p>{CTA_INTRO}</p>
    <a class="cta" href="{CTA_URL}?utm_source=newsletter&utm_campaign={SLUG}">{CTA_TEXT}</a>
  </div>

  <div class="footer">
    helpmijbesparen.nl &middot; KvK {KVK} &middot; {ADRES}<br>
    <a href="{UNSUB}">Uitschrijven</a> &middot; <a href="{PREFS}">Voorkeuren</a>
  </div>
</div>
</body></html>
```

## Per-editie checklist

- [ ] Editie nummer + datum klopt
- [ ] Hoofdverhaal heeft eigen URL op site
- [ ] 3 nieuws-snippets met externe bronnen (tier 1/2)
- [ ] Cijfer met bron
- [ ] Tip is concreet (geen platitude)
- [ ] 1 CTA, niet meer
- [ ] UTM parameters
- [ ] Subject line (zie /email-campaign regels)
- [ ] Preheader
- [ ] Plain-text variant
- [ ] Unsubscribe + adres footer
- [ ] Geen prijsgaranties / concurrent / emojis

## Subject line patterns voor newsletter

- "[#{NR}] {hoofd-onderwerp}"
- "Deze week: {1 keyword}"
- "Wat verandert: {topic}"

NIET: "🔥 NIEUWE EDITIE!!" of "Je gelooft niet wat..."

## Performance benchmarks

| Metric | Target | Trigger actie |
|---|---|---|
| Open rate | >25% | <20% → subject A/B test next edition |
| Click rate | >3% | <2% → CTA review |
| Unsubscribe | <0.3% | >0.5% → segment cleanup |
| Spam | <0.05% | >0.1% → STOP, fix deliverability |

## Memory hook

Per editie: 1-zin in `project_newsletter_<jaar>.md` met editie nr + topic + key metric.
Helpt bij `/audit-content` voor decay detection.

## Hard rules
- Vaste cadans (kies en hou eraan)
- Vaste sectiestructuur (lezers herkennen het)
- Eigen content > curated (drive traffic terug naar site)
- Bronnen op alle nieuws-snippets
- Plain-text variant
- Compliance footer

## Memory check
Lees: reference_hmb_brand, marketing:draft-content, recente project_newsletter_*
