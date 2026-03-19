# HMB Dashboard — Master Context voor Claude Code
> Lees dit ALTIJD volledig voor je iets bouwt. Enige bron van waarheid.

---

## Project
Naam: HMB Energy Ops Dashboard
Stack: Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Recharts
Taal UI: Nederlands | Markt: NL primair, BE in Archief-tab
Design: Dual-theme (light/dark, gebruiker kiest, voorkeur opgeslagen in localStorage)

---

## Supabase
Project ID: zenhndvoqrbjbdilhysp | Regio: eu-west-3
URL: https://zenhndvoqrbjbdilhysp.supabase.co

## GHL
API Key: pit-1772d0a9-7a7d-4eaa-b6df-33859260b197
Sub-account: ozS18XeeiEdjYK4xpoWJ | Pipeline: Sales
Filter: custom_field_juan = 'juan'
Base URL: https://services.leadconnectorhq.com | Version: 2021-07-28

## .env.local
NEXT_PUBLIC_SUPABASE_URL=https://zenhndvoqrbjbdilhysp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<uit Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<uit Supabase dashboard>
GHL_API_KEY=pit-1772d0a9-7a7d-4eaa-b6df-33859260b197
GHL_LOCATION_ID=ozS18XeeiEdjYK4xpoWJ
GHL_PIPELINE_NAME=Sales
GHL_CUSTOM_FIELD_FILTER=juan

---

## DESIGN SYSTEEM — DUAL THEME

Filosofie: Clean, overzichtelijk en leesbaar in BEIDE themes.
Één set CSS variabelen per theme — alle componenten gebruiken uitsluitend var(--...).
Gebruiker toggled via knop in topbar. Voorkeur opgeslagen in localStorage.

Fonts:
  UI:      DM Sans (weight 300-700)
  Getallen: DM Mono (ALTIJD, font-variant-numeric: tabular-nums)

### HTML root attribute
<html data-theme="light"> of <html data-theme="dark">

### Theme toggle (ThemeToggle component)
Opslaan: localStorage.setItem('hmb-theme', theme)
Laden:   localStorage.getItem('hmb-theme') ?? 'light'
Zet op <html> via: document.documentElement.setAttribute('data-theme', theme)

---

## CSS TOKENS — LIGHT [data-theme="light"]

```css
[data-theme="light"] {
  --bg:       #F4F6F9;
  --bg2:      #EAECF1;
  --panel:    #FFFFFF;
  --panel2:   #F9FAFB;
  --border:   #E1E5EE;
  --border2:  #CBD0DC;
  --txt:      #0E1117;
  --txt2:     #525C72;
  --txt3:     #96A0B5;
  --shadow-sm: 0 1px 3px rgba(14,17,23,0.07);
  --shadow:    0 3px 10px rgba(14,17,23,0.09);
  --shadow-md: 0 6px 20px rgba(14,17,23,0.11);

  --g: #079455; --g-bg: #ECFDF3; --g-border: #A9EFC5; --g-txt: #067647;
  --o: #DC4A11; --o-bg: #FEF2EE; --o-border: #FAC5B0; --o-txt: #B93B0D;
  --y: #B54708; --y-bg: #FFFAEB; --y-border: #FEDF89; --y-txt: #93370D;
  --r: #C01048; --r-bg: #FFF1F3; --r-border: #FECDD6; --r-txt: #89123E;
  --b: #1650DC; --b-bg: #EFF4FF; --b-border: #C7D7FD; --b-txt: #1849A9;
}
```

## CSS TOKENS — DARK [data-theme="dark"]

```css
[data-theme="dark"] {
  --bg:       #0C0F14;
  --bg2:      #141920;
  --panel:    #111620;
  --panel2:   #161C28;
  --border:   rgba(255,255,255,0.07);
  --border2:  rgba(255,255,255,0.12);
  --txt:      #E2E8F4;
  --txt2:     #8A95AA;
  --txt3:     #4E5A72;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.35);
  --shadow:    0 3px 12px rgba(0,0,0,0.40);
  --shadow-md: 0 6px 24px rgba(0,0,0,0.50);

  --g: #16D679; --g-bg: rgba(22,214,121,0.08); --g-border: rgba(22,214,121,0.20); --g-txt: #16D679;
  --o: #FF6B35; --o-bg: rgba(255,107,53,0.09); --o-border: rgba(255,107,53,0.22); --o-txt: #FF6B35;
  --y: #F0B429; --y-bg: rgba(240,180,41,0.09); --y-border: rgba(240,180,41,0.22); --y-txt: #F0B429;
  --r: #F0334A; --r-bg: rgba(240,51,74,0.08);  --r-border: rgba(240,51,74,0.22);  --r-txt: #F0334A;
  --b: #4D9FFF; --b-bg: rgba(77,159,255,0.09); --b-border: rgba(77,159,255,0.22); --b-txt: #4D9FFF;
}
```

---

## KLEUR-SEMANTIEK (identiek in beide themes)

| Situatie | Token |
|---|---|
| Succes, deals, doel gehaald | --g + --g-txt |
| Spend, kosten, budget | --o + --o-txt |
| Testfase, matig, op schema | --y + --y-txt |
| Fout, dalend, kritiek | --r + --r-txt |
| Meta klik-data, info | --b + --b-txt |
| Tekst op achtergrond elementen | --txt2 / --txt3 |

ALTIJD: gebruik --g-txt voor tekst (niet --g direct) — betere contrast in light.
ALTIJD: JetBrains Mono of DM Mono voor getallen/metrics, nooit een ander font.

---

## BODY TEXTURE

Light: subtiele dot-grid via radial-gradient
Dark: fijn lijn-grid via linear-gradient

```css
/* Tailwind globals.css of layout.tsx */
.body-texture::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
}
[data-theme="light"] .body-texture::after {
  background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 22px 22px;
}
[data-theme="dark"] .body-texture::after {
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 48px 48px;
}
```

---

## COMPONENT REGELS

Alle componenten gebruiken UITSLUITEND CSS variabelen. Nooit hardcoded kleuren.

### Kaarten
background: var(--panel)
border: 1px solid var(--border)
box-shadow: var(--shadow-sm)
border-radius: 10px
hover: box-shadow: var(--shadow) + translateY(-2px)

### KPI Card — glow als hot (value >= 90% van goal)
background: var(--g-bg)
border-color: var(--g-border)
top 2px accent lijn: var(--g) via ::after
value kleur: var(--g-txt)
GEEN text-shadow in light mode. In dark optioneel: subtiel.

### Badges
4 varianten: green / orange / amber / red
Structuur: background var(--X-bg) + color var(--X-txt) + border var(--X-border)

### Alert links-border
alert-ok:   bg var(--g-bg), border var(--g)
alert-warn: bg var(--o-bg), border var(--o)
alert-crit: bg var(--r-bg), border var(--r)

### Progressbars
Track: var(--bg2) | Fill: var(--g) / var(--o) / var(--y) / var(--r)
Hoogte: 4px | Animatie: width 1.2s cubic-bezier(0.16,1,0.3,1) na mount

---

## CHARTS (Recharts) — Theme-aware

Charts moeten kleuren ophalen na theme-wissel. Gebruik useTheme() hook:
```tsx
const { theme } = useTheme()
// Re-render chart als theme wijzigt via key={theme} prop op chart component
```

Grid kleur:
  light: rgba(0,0,0,0.05)
  dark:  rgba(255,255,255,0.05)

Tick kleur: var(--txt3) (ophalen via getComputedStyle)

Tooltip:
  background: var(--panel2)
  border: var(--border)
  font: DM Mono 12px

---

## THEMETOGGLE COMPONENT

```tsx
// src/components/ui/ThemeToggle.tsx
'use client'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} className="theme-toggle">
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
```

```tsx
// src/hooks/useTheme.ts
'use client'
import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState<'light'|'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('hmb-theme') as 'light'|'dark' | null
    const initial = saved ?? 'light'
    setTheme(initial)
    document.documentElement.setAttribute('data-theme', initial)
  }, [])

  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('hmb-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return { theme, toggle }
}
```

---

## BUSINESS LOGICA

getCplStatus(cpl, spend):
  spend < 50 → 'testfase' (amber)
  cpl < 15   → 'goed'     (groen)
  cpl < 25   → 'ok'       (oranje)
  else       → 'slecht'   (rood)

goalColor(pct): >= 85 → --g | >= 60 → --y | else → --r

Funnel benchmarks:
  Meta → WhatsApp:        > 25% (alarm < 15%)
  WhatsApp → Gekwalif.:   > 35% (alarm < 20%)
  Gekwalif. → Afspraak:   > 35% (alarm < 20%)
  Afspraak → Deal:        > 40% (alarm < 25%)

7 Funnels: F1 Thuisbatterij, F2 Zonnepanelen, F3 Combi, F4 Retarget,
           F5 Koude Video, F6 Video Testimonial, F7 Lookalike

---

## NAVIGATIE SIDEBAR
PRIMAIR:  Dashboard / Meta Ads [badge] / Google Ads / Chatbot [badge] / Sales
ANALYSE:  Funnel / Rapporten / Content
SYSTEEM:  Agents / SEO / Agenda [Nieuw] / Instellingen

---

## DATABASE TABELLEN
ghl_leads, ghl_pipeline_stages, agenda_events, ads,
dmchamp_daily_reports, dmchamp_events, conversation_analyses,
ghl_pipeline_checks (historisch), articles (398), sites (2)

---

## EDGE FUNCTIONS
Bestaand: designer-chain, editor-chain, technicus-chain, speurder-scan,
speurder-write, notify-webhook, pipeline-run, sitemap-generator,
dmchamp-webhook, daily-slack-update

Nog te bouwen: ghl-sync, ghl-agenda-sync, meta-ads-sync

---

## ANIMATIES
page load: sidebar slideInLeft 350ms, topbar fadeDown 300ms, KPI riseIn staggered
progress bars: animeren naar waarde na 400ms mount delay
charts: 1200ms easeOutQuart (rebuild na theme toggle)

---

## VERBODEN
- Nooit hardcoded kleuren (#hex of rgb()) in TSX/CSS — altijd var(--)
- Nooit getallen zonder DM Mono font
- Nooit Inter of Roboto fonts
- Nooit border-radius > 12px op cards

---

## SESSIE VOLGORDE
1: sessie-1-design-systeem.md  → Setup, tokens, layout, sidebar, KPI componenten
2: sessie-2-ghl-koppeling.md   → GHL Edge Functions + data hooks
3: sessie-3-hoofdpagina.md     → Dashboard hoofdpagina
4: sessie-4-meta-ads.md        → Meta Ads pagina
5: sessie-5-sales-agenda.md    → Sales kanban + Agenda
6: sessie-6-ui-polish.md       → Animaties + performance + dual-theme audit

Update: 14 maart 2026 — HMBops v3 Dual Theme
