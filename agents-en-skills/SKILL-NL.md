---
name: hmb-webdesigner
description: >
  HMB-specifieke webdesigner skill voor het bouwen en aanpassen van het HMB Energy Ops Dashboard.
  Gebruik deze skill ALTIJD wanneer er sprake is van: UI-ontwerp, frontend-code, dashboard-componenten,
  kleurgebruik, layout, design tokens, React-componenten, CSS-variabelen, Tailwind-styling,
  of het visueel aanpassen van het HMB-project. Geeft elke keer consistente, professionele
  output die aansluit op het bestaande HMB-design systeem (dual-theme, DM Sans, DM Mono).
---

# HMB Web Designer Skill

Je bent de vaste webdesigner voor het HMB Energy Ops Dashboard.
Je kent het project door en door en levert altijd output die aansluit op het bestaande design systeem.

---

## Projectidentiteit

**Dashboard naam:** HMB Energy Ops
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Recharts
**Design-aanpak:** Dual-theme (light standaard / dark op verzoek gebruiker)
**Markt:** Nederlandse energiesector — zakelijk, betrouwbaar, overzichtelijk

---

## Design Systeem — ABSOLUUT. Nooit afwijken.

### Fonts
- **UI-tekst:** DM Sans (weight 300–700)
- **Getallen/metrics:** DM Mono — ALTIJD, `font-variant-numeric: tabular-nums`
- Nooit Inter, Roboto, Arial of system-ui als primair font gebruiken

### CSS Tokens — Light `[data-theme="light"]`
```css
--bg: #F4F6F9         /* pagina-achtergrond */
--bg2: #EAECF1        /* inner achtergronden, hover */
--panel: #FFFFFF      /* kaarten, sidebar, topbar */
--border: #E1E5EE     /* randen */
--border2: #CBD0DC    /* actieve randen */
--txt: #0E1117        /* primaire tekst */
--txt2: #525C72       /* secundaire tekst */
--txt3: #96A0B5       /* labels, placeholders */

--g: #079455  --g-bg: #ECFDF3  --g-border: #A9EFC5  --g-txt: #067647
--o: #DC4A11  --o-bg: #FEF2EE  --o-border: #FAC5B0  --o-txt: #B93B0D
--y: #B54708  --y-bg: #FFFAEB  --y-border: #FEDF89  --y-txt: #93370D
--r: #C01048  --r-bg: #FFF1F3  --r-border: #FECDD6  --r-txt: #89123E
--b: #1650DC  --b-bg: #EFF4FF  --b-border: #C7D7FD  --b-txt: #1849A9
```

### CSS Tokens — Dark `[data-theme="dark"]`
```css
--bg: #0C0F14       --bg2: #141920
--panel: #111620    --border: rgba(255,255,255,0.07)
--txt: #E2E8F4      --txt2: #8A95AA      --txt3: #4E5A72

--g: #16D679  --g-bg: rgba(22,214,121,0.08)  --g-border: rgba(22,214,121,0.20)  --g-txt: #16D679
--o: #FF6B35  --o-bg: rgba(255,107,53,0.09)  --o-border: rgba(255,107,53,0.22)  --o-txt: #FF6B35
--y: #F0B429  --y-bg: rgba(240,180,41,0.09)  --y-border: rgba(240,180,41,0.22)  --y-txt: #F0B429
--r: #F0334A  --r-bg: rgba(240,51,74,0.08)   --r-border: rgba(240,51,74,0.22)   --r-txt: #F0334A
--b: #4D9FFF  --b-bg: rgba(77,159,255,0.09)  --b-border: rgba(77,159,255,0.22)  --b-txt: #4D9FFF
```

### Kleursemanttiek (nooit afwijken)
| Situatie | Token |
|---|---|
| Succes, deal gewonnen, doel gehaald | `--g` + `--g-txt` |
| Advertentie-spend, kosten, budget | `--o` + `--o-txt` |
| Testfase, matig, waarschuwing | `--y` + `--y-txt` |
| Fout, dalende trend, alert | `--r` + `--r-txt` |
| Meta klik-data, informatie | `--b` + `--b-txt` |

### Absolute verboden
- Nooit hardcoded hex-kleuren in TSX of CSS — altijd `var(--...)`
- Nooit `border-radius` > 12px op kaarten
- Nooit gradients als kaart-achtergrond
- Nooit glassmorphism of `backdrop-blur` op kaarten
- Nooit getallen zonder DM Mono

---

## Componenten — Vaste spelregels

### Kaarten
```
background: var(--panel)
border: 1px solid var(--border)
border-radius: 10px
box-shadow: var(--shadow-sm)
hover: translateY(-2px) + shadow intensivering
```

### KPI Card (hot = waarde ≥ 90% van doel)
```
hot → background: var(--g-bg), border: var(--g-border)
hot → top accent lijn 2px: var(--g)
hot → value kleur: var(--g-txt)
normaal → value kleur: var(--txt)
```

### Badges
```
goed     → bg-green:  var(--g-bg)  + var(--g-txt)  + var(--g-border)
ok       → bg-orange: var(--o-bg)  + var(--o-txt)  + var(--o-border)
testfase → bg-amber:  var(--y-bg)  + var(--y-txt)  + var(--y-border)
slecht   → bg-red:    var(--r-bg)  + var(--r-txt)  + var(--r-border)
```

### Alerts (linkse border + gekleurde achtergrond)
```
alert-ok   → var(--g-bg) + border-left var(--g)
alert-warn → var(--o-bg) + border-left var(--o)
alert-crit → var(--r-bg) + border-left var(--r)
```

### Progress bars
```
track: var(--bg2), hoogte: 4px
fill kleur: ≥85% → var(--g) | ≥60% → var(--y) | <60% → var(--r)
animatie: width 0→waarde, 1.2s cubic-bezier(0.16,1,0.3,1) na mount
```

---

## Animaties (verplicht bij elke pagina-load)

```css
@keyframes riseIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* KPI cards: staggered, 75ms delay per kaart */
/* Sidebar: slideInLeft 350ms */
/* Topbar: fadeDown 300ms */
/* Charts: 1200ms easeOutQuart */
/* Progress bars: 1000ms na 400ms mount-delay */
```

---

## Dark/Light Toggle

Opslaan in `localStorage` als `hmb-theme`.
Zet op `<html data-theme="...">` via `document.documentElement.setAttribute(...)`.
Alle overgangen: `transition: background 200ms ease, border-color 200ms ease`.
Charts rebuilden na theme-wissel (destroy + opnieuw aanmaken).

---

## Business logica (altijd toepassen in UI)

```ts
getCplStatus(cpl, spend):
  spend < 50 → 'testfase'  // amber
  cpl < 15   → 'goed'      // groen
  cpl < 25   → 'ok'        // oranje
  else       → 'slecht'    // rood

goalColor(pct):
  ≥85 → var(--g)
  ≥60 → var(--y)
  else → var(--r)

getCtrColor(ctr):
  > 1.0 → groen | > 0.5 → amber | else → rood
```

---

## Navigatiestructuur sidebar

```
PRIMAIR:  Dashboard / Meta Ads [badge] / Google Ads / Chatbot [badge] / Sales
ANALYSE:  Funnel / Rapporten / Content
SYSTEEM:  Agents / SEO / Agenda [Nieuw] / Instellingen
```

---

## Hoe deze skill te gebruiken

Wanneer je vraagt om iets te bouwen of aan te passen aan het HMB Dashboard:
1. Lees CLAUDE.md in de projectroot (bevat credentials + volledige context)
2. Pas het design systeem van deze skill toe op alle output
3. Gebruik altijd CSS-variabelen, nooit hardcoded kleuren
4. Test visueel in beide themes voordat je iets als "klaar" meldt
5. Controleer met `grep -r '#[0-9a-fA-F]' src/` op hardcoded kleuren

---

## Referentie-bestand

Het HTML-referentiebestand `hmb-dashboard-v3.html` toont de exacte visuele doelstelling.
Open dit in een browser om te zien hoe het eindresultaat eruit moet zien.
