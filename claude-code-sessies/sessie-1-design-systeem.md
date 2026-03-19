# Sessie 1 — Design Systeem + Dual Theme + Sidebar + UI Componenten

## Context
Lees eerst CLAUDE.md volledig. Dit is de fundering van het hele project.
Referentie: open `hmb-dashboard-v3.html` in browser — dit bouwen we na.
Design: clean, overzichtelijk in BEIDE themes. Light is standaard, dark is keuze.

## Investigate
```bash
cat CLAUDE.md
ls src/ 2>/dev/null || echo "nieuw project — start bij Phase 1"
```

---

## Phase 1 — Project setup

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
npm install @supabase/supabase-js lucide-react recharts
```

Google Fonts in `src/app/layout.tsx`:
```tsx
import { DM_Sans, DM_Mono } from 'next/font/google'
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-sans' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-mono' })
```

---

## Phase 2 — CSS Design Tokens (globals.css)

Vervang globals.css volledig — dit is het HART van het dual-theme systeem:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ══ LIGHT THEME ══ */
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
  --shadow-sm: 0 1px 3px rgba(14,17,23,0.07), 0 1px 2px rgba(14,17,23,0.04);
  --shadow:    0 3px 10px rgba(14,17,23,0.09), 0 1px 4px rgba(14,17,23,0.05);
  --shadow-md: 0 6px 20px rgba(14,17,23,0.11), 0 2px 8px rgba(14,17,23,0.06);

  --g: #079455; --g-bg: #ECFDF3; --g-border: #A9EFC5; --g-txt: #067647;
  --o: #DC4A11; --o-bg: #FEF2EE; --o-border: #FAC5B0; --o-txt: #B93B0D;
  --y: #B54708; --y-bg: #FFFAEB; --y-border: #FEDF89; --y-txt: #93370D;
  --r: #C01048; --r-bg: #FFF1F3; --r-border: #FECDD6; --r-txt: #89123E;
  --b: #1650DC; --b-bg: #EFF4FF; --b-border: #C7D7FD; --b-txt: #1849A9;
}

/* ══ DARK THEME ══ */
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

/* ══ BASE ══ */
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html { -webkit-font-smoothing: antialiased; }

  body {
    background: var(--bg);
    color: var(--txt);
    font-family: var(--font-sans), 'DM Sans', system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.55;
    transition: background 200ms ease, color 200ms ease;
  }

  /* Body texture — light */
  [data-theme="light"] body::after {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image: radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
    background-size: 22px 22px;
  }

  /* Body texture — dark */
  [data-theme="dark"] body::after {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  /* Mono font utility */
  .mono {
    font-family: var(--font-mono), 'DM Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  /* Smooth theme transitions */
  .sidebar, .topbar, .card, .kpi-card, .funnel-box, .btn, .badge, table {
    transition: background 200ms ease, border-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
  }
}

/* ══ ANIMATIES ══ */
@keyframes riseIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg2); border-radius: 2px; }
```

---

## Phase 3 — Tailwind config

```ts
// tailwind.config.ts
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        bg2:     'var(--bg2)',
        panel:   'var(--panel)',
        border:  'var(--border)',
        border2: 'var(--border2)',
        txt:     'var(--txt)',
        txt2:    'var(--txt2)',
        txt3:    'var(--txt3)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'DM Mono', 'monospace'],
      },
      animation: {
        'rise-in':    'riseIn 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'slide-left': 'slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'fade-down':  'fadeDown 0.3s ease both',
        'blink':      'blink 1.4s ease-in-out infinite',
      },
      boxShadow: {
        sm:  'var(--shadow-sm)',
        md:  'var(--shadow)',
        lg:  'var(--shadow-md)',
      },
    },
  },
}
export default config
```

---

## Phase 4 — useTheme hook

`src/hooks/useTheme.ts`:
```ts
'use client'
import { useState, useEffect, useCallback } from 'react'

type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('hmb-theme') as Theme) ?? 'light'
    apply(saved)
  }, [])

  const apply = (t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('hmb-theme', t)
  }

  const toggle = useCallback(() => {
    apply(theme === 'light' ? 'dark' : 'light')
  }, [theme])

  return { theme, toggle, isDark: theme === 'dark' }
}
```

---

## Phase 5 — Root Layout

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-sans' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400','500'], variable: '--font-mono' })

export const metadata: Metadata = { title: 'HMB Energy Ops', description: 'Marketing operations dashboard' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" data-theme="light" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
          <Sidebar />
          <main style={{ marginLeft: '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

Belangrijk: `data-theme="light"` op html tag als default. useTheme() overschrijft dit na mount.

---

## Phase 6 — Sidebar

`src/components/layout/Sidebar.tsx` — vereisten:
- Breedte 220px, fixed, full height
- background: var(--panel), border-right: 1px solid var(--border)
- box-shadow: var(--shadow-sm)
- Logo: zwart blok (var(--txt)) met witte H letter + "HMBops" tekst + groene `em` voor "ops"
- Nav items: zie CLAUDE.md navigatie structuur
- Active state: background var(--txt), color var(--panel) — werkt in beide themes
- Hover: background var(--bg2), color var(--txt)
- Badges: rood voor alerts, groene tint met border voor "Nieuw"
- Sectie labels: 10px uppercase, color var(--txt3)
- Footer: avatar (var(--txt) bg, wit initialen) + naam + rol
- Animatie: animate-slide-left

---

## Phase 7 — Topbar

`src/components/layout/Topbar.tsx` — vereisten:
- Height 56px, sticky top, z-index 10
- background var(--panel), border-bottom 1px solid var(--border)
- Animatie: animate-fade-down

ThemeToggle knop (rechts):
```tsx
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg2)', color: 'var(--txt2)',
        border: '1px solid var(--border2)',
        borderRadius: 8, padding: '5px 11px',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
```

LIVE chip:
```tsx
<div style={{ display:'flex', alignItems:'center', gap:5,
  background:'var(--g-bg)', border:'1px solid var(--g-border)',
  borderRadius:20, padding:'4px 10px', fontSize:10, color:'var(--g-txt)',
  fontFamily:'var(--font-mono)', fontWeight:600 }}>
  <div style={{ width:5, height:5, background:'var(--g)', borderRadius:'50%',
    animation:'blink 1.4s ease-in-out infinite' }} />
  LIVE · 2m
</div>
```

---

## Phase 8 — UI Componenten

### KpiCard (`src/components/ui/KpiCard.tsx`)
Props: label, value (number|string), delta?, deltaDir ('up'|'down'|'neu'), goal?, hot?

Styling:
```tsx
// base card
style={{
  background: hot ? 'var(--g-bg)' : 'var(--panel)',
  border: `1px solid ${hot ? 'var(--g-border)' : 'var(--border)'}`,
  borderRadius: 10, padding: '15px', position: 'relative', overflow: 'hidden',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 160ms',
}}

// top accent stripe via ::after pseudo (of inline div bovenaan):
// height: 2px, background: var(--g), visible altijd als hot, else on hover
```

Value:
```tsx
<span style={{
  fontFamily: 'var(--font-mono)', fontSize: 25, fontWeight: 500,
  fontVariantNumeric: 'tabular-nums', lineHeight: 1,
  color: hot ? 'var(--g-txt)' : 'var(--txt)',
}}>
  {animated}
</span>
```

### StatusBadge (`src/components/ui/StatusBadge.tsx`)
```tsx
const styles = {
  goed:     { bg:'var(--g-bg)',  color:'var(--g-txt)',  border:'1px solid var(--g-border)' },
  ok:       { bg:'var(--o-bg)',  color:'var(--o-txt)',  border:'1px solid var(--o-border)' },
  testfase: { bg:'var(--y-bg)',  color:'var(--y-txt)',  border:'1px solid var(--y-border)' },
  slecht:   { bg:'var(--r-bg)',  color:'var(--r-txt)',  border:'1px solid var(--r-border)' },
  gepland:  { bg:'var(--b-bg)',  color:'var(--b-txt)',  border:'1px solid var(--b-border)' },
  muted:    { bg:'var(--bg2)',   color:'var(--txt2)',   border:'1px solid var(--border)' },
}
```

### GoalProgress (`src/components/ui/GoalProgress.tsx`)
```tsx
// goal fill kleur:
const pct = (current / target) * 100
const fillColor = pct >= 85 ? 'var(--g)' : pct >= 60 ? 'var(--y)' : 'var(--r)'
// track background: var(--bg2)
// hoogte: 4px
// animeer breedte na mount via useEffect + CSS transition 1.2s
```

### lib/utils.ts
```ts
export const formatEuro = (n: number) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export const formatPct = (n: number) => `${n.toFixed(1)}%`

export const getCplStatus = (cpl: number, spend: number) => {
  if (spend < 50) return 'testfase'
  if (cpl < 15)   return 'goed'
  if (cpl < 25)   return 'ok'
  return 'slecht'
}

export const goalColor = (pct: number) =>
  pct >= 85 ? 'var(--g)' : pct >= 60 ? 'var(--y)' : 'var(--r)'

export const stagger = (i: number, base = 80, step = 75) =>
  ({ animationDelay: `${base + i * step}ms` })
```

---

## Validation Checklist
- [ ] `npm run dev` start zonder errors
- [ ] Light theme laadt standaard (witte achtergrond, donkere tekst)
- [ ] Toggle knop schakelt naar dark theme (donkere achtergrond)
- [ ] Alle kleuren wisselen smooth (200ms transitie)
- [ ] Theme blijft bewaard na page refresh (localStorage)
- [ ] Sidebar zichtbaar en correct in BEIDE themes
- [ ] Active nav item: wit tekst op donker blok (werkt in light én dark)
- [ ] KpiCard hot variant: groene tint achtergrond + groene value tekst
- [ ] StatusBadge kleuren kloppen in beide themes
- [ ] GoalProgress animeert naar juiste breedte
- [ ] Geen hardcoded kleuren in TSX (check met: grep -r '#[0-9a-fA-F]' src/)
- [ ] Geen TypeScript errors: npx tsc --noEmit
