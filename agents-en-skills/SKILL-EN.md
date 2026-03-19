---
name: hmb-webdesigner
description: >
  HMB-specific web designer skill for building and customizing the HMB Energy Ops Dashboard.
  Use this skill ALWAYS when dealing with: UI design, frontend code, dashboard components,
  color usage, layout, design tokens, React components, CSS variables, Tailwind styling,
  or any visual changes to the HMB project. Delivers consistent, professional output
  that matches the existing HMB design system (dual-theme, DM Sans, DM Mono).
---

# HMB Web Designer Skill

You are the dedicated web designer for the HMB Energy Ops Dashboard.
You know the project inside out and always deliver output that matches the existing design system.

---

## Project Identity

**Dashboard name:** HMB Energy Ops
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Supabase · Recharts
**Design approach:** Dual-theme (light by default / dark on user request)
**Market:** Dutch energy sector — professional, reliable, clear

---

## Design System — ABSOLUTE. Never deviate.

### Fonts
- **UI text:** DM Sans (weight 300–700)
- **Numbers/metrics:** DM Mono — ALWAYS, `font-variant-numeric: tabular-nums`
- Never use Inter, Roboto, Arial or system-ui as the primary font

### CSS Tokens — Light `[data-theme="light"]`
```css
--bg: #F4F6F9         /* page background */
--bg2: #EAECF1        /* inner backgrounds, hover states */
--panel: #FFFFFF      /* cards, sidebar, topbar */
--border: #E1E5EE     /* borders */
--border2: #CBD0DC    /* active borders */
--txt: #0E1117        /* primary text */
--txt2: #525C72       /* secondary text */
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

### Color Semantics (never deviate)
| Situation | Token |
|---|---|
| Success, deal won, goal reached | `--g` + `--g-txt` |
| Ad spend, costs, budget | `--o` + `--o-txt` |
| Testing phase, moderate, warning | `--y` + `--y-txt` |
| Error, downward trend, alert | `--r` + `--r-txt` |
| Meta click data, information | `--b` + `--b-txt` |

### Hard Rules — Never Break
- Never use hardcoded hex colors in TSX or CSS — always `var(--...)`
- Never use `border-radius` > 12px on cards
- Never use gradients as card backgrounds
- Never use glassmorphism or `backdrop-blur` on cards
- Never render numbers without DM Mono

---

## Components — Fixed Rules

### Cards
```
background: var(--panel)
border: 1px solid var(--border)
border-radius: 10px
box-shadow: var(--shadow-sm)
hover: translateY(-2px) + intensified shadow
```

### KPI Card (hot = value ≥ 90% of goal)
```
hot → background: var(--g-bg), border: var(--g-border)
hot → top accent line 2px: var(--g)
hot → value color: var(--g-txt)
normal → value color: var(--txt)
```

### Badges
```
goed     → bg-green:  var(--g-bg)  + var(--g-txt)  + var(--g-border)
ok       → bg-orange: var(--o-bg)  + var(--o-txt)  + var(--o-border)
testfase → bg-amber:  var(--y-bg)  + var(--y-txt)  + var(--y-border)
slecht   → bg-red:    var(--r-bg)  + var(--r-txt)  + var(--r-border)
```

### Alerts (left border + colored background)
```
alert-ok   → var(--g-bg) + border-left var(--g)
alert-warn → var(--o-bg) + border-left var(--o)
alert-crit → var(--r-bg) + border-left var(--r)
```

### Progress Bars
```
track: var(--bg2), height: 4px
fill color: ≥85% → var(--g) | ≥60% → var(--y) | <60% → var(--r)
animation: width 0→value, 1.2s cubic-bezier(0.16,1,0.3,1) after mount
```

---

## Animations (required on every page load)

```css
@keyframes riseIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* KPI cards: staggered, 75ms delay per card */
/* Sidebar: slideInLeft 350ms */
/* Topbar: fadeDown 300ms */
/* Charts: 1200ms easeOutQuart */
/* Progress bars: 1000ms after 400ms mount delay */
```

---

## Dark/Light Toggle

Save in `localStorage` as `hmb-theme`.
Apply to `<html data-theme="...">` via `document.documentElement.setAttribute(...)`.
All transitions: `transition: background 200ms ease, border-color 200ms ease`.
Charts must be destroyed and rebuilt after theme switch.

---

## Business Logic (always apply in UI)

```ts
getCplStatus(cpl, spend):
  spend < 50 → 'testfase'  // amber
  cpl < 15   → 'goed'      // green
  cpl < 25   → 'ok'        // orange
  else       → 'slecht'    // red

goalColor(pct):
  ≥85 → var(--g)
  ≥60 → var(--y)
  else → var(--r)

getCtrColor(ctr):
  > 1.0 → green | > 0.5 → amber | else → red
```

---

## Sidebar Navigation Structure

```
PRIMARY:  Dashboard / Meta Ads [badge] / Google Ads / Chatbot [badge] / Sales
ANALYSIS: Funnel / Reports / Content
SYSTEM:   Agents / SEO / Agenda [New] / Settings
```

---

## How to Use This Skill

When asked to build or modify anything in the HMB Dashboard:
1. Read CLAUDE.md in the project root (contains credentials + full context)
2. Apply the design system from this skill to all output
3. Always use CSS variables — never hardcoded colors
4. Test visually in both themes before marking anything as done
5. Verify with `grep -r '#[0-9a-fA-F]' src/` to catch hardcoded colors

---

## Reference File

The HTML reference file `hmb-dashboard-v3.html` shows the exact visual target.
Open it in a browser to see what the final result should look like.
