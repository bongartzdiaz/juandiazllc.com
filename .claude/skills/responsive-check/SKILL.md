---
name: responsive-check
description: Audit een page of component op responsive issues — breakpoint mismatches, mobile-overflow, touch-target size, te kleine fonts, slechte tap-zones, hidden content op mobile. Output is gerangschikte fix-lijst per breakpoint. Gebruik wanneer Juan vraagt "werkt dit op mobiel", vóór ads-launch (mobile traffic 70%+), of bij audits.
trigger: /responsive-check
---

# /responsive-check

Mobile-first audit. Check op de breakpoints die je daadwerkelijk hebt + de devices die je traffic gebruikt.

## Usage
```
/responsive-check <pad-of-url>
/responsive-check <pad> --breakpoints "<csv>"   # default 320,375,768,1024,1280
/responsive-check <pad> --device <iphone|android|tablet|desktop>
/responsive-check <pad> --traffic-data         # gebruik echte device-mix uit GA4
```

## Breakpoint-defaults (Tailwind + bekende devices)

| Breakpoint | px | Device |
|---|---|---|
| Smallest | 320 | iPhone SE (oude), low-end Android |
| Mobile | 375 | iPhone 12-15 Mini |
| Mobile L | 414 | iPhone 14/15 Pro Max |
| Tablet | 768 | iPad portrait, Tailwind `md:` |
| Tablet L | 1024 | iPad landscape, Tailwind `lg:` |
| Desktop | 1280+ | Most desktops, Tailwind `xl:` |

## Hard rules

### Hot zone (voor mobile lead-funnels)
- **CTA-knop** moet bereikbaar zijn met duim — bottom-30% van viewport
- **Form-velden** geen meer dan 80% breedte van scherm
- **Tap target ≥44×44 px** (Apple) of `≥24×24 CSS px` (WCAG 2.2 AA, lager dan Apple)
- **Vertical spacing** tussen tap targets ≥8px

### Layout-issues
- **Geen horizontale scroll** op 320px (test met `overflow-x: hidden` op `<body>` als laatste redmiddel — niet als oplossing)
- **Tekst niet uit container** — `break-words` of `word-wrap`
- **Images responsive** — `max-w-full` + `h-auto` of fixed aspect-ratio
- **Tabellen** mobile-fallback (cards-stacked) of horizontal scroll-container
- **Modals** op mobile: bottom-sheet style, niet center-popup (toetsenbord eat 50% van scherm)

### Typography
- **Body min 14px** mobile (Apple aanbeveling 17px om zoom-on-focus te voorkomen)
- **Form inputs ≥16px** anders zoomt iOS Safari bij focus
- **Line-height ≥1.5** voor body
- **Max-width tekst** 60-75 ch voor leesbaarheid

### Performance op mobile
- **LCP <2.5s op 3G** (zie `/perf-audit`)
- **Geen heavy animations** — CPU-bound (`transform` + `opacity` only)
- **Lazy-load below-fold** images

## Audit-checklist

### Per breakpoint (320 / 375 / 768 / 1280)
- [ ] Geen horizontale scrollbar
- [ ] Hero leesbaar zonder zoom
- [ ] CTA klikbaar zonder zoom
- [ ] Form-velden full-width op mobile, max 600px op desktop
- [ ] Nav werkt — hamburger op mobile, full bar op desktop
- [ ] Footer breekt netjes (geen overlap)
- [ ] Modals/sheets aangepast aan device
- [ ] Images niet uitgerekt (juiste aspect-ratio)
- [ ] Tabellen scrollbaar of stacked
- [ ] Sticky elements blokkeren niet de content (gebruik `top-0` careful)

### Touch UX
- [ ] Tap targets ≥24×24 (44×44 voor primary CTAs)
- [ ] Hover-only states hebben tap-equivalent
- [ ] Geen `:hover` als enige UI-cue voor info (mobile heeft geen hover)
- [ ] Sliders/carousels swipe-bar
- [ ] Form-inputs trigger juiste keyboard (`inputMode`, `type`)
- [ ] Date-pickers werken op mobile (native of touch-friendly)

### Content priority
- [ ] Hero-CTA above the fold op 375×667 (iPhone SE)
- [ ] Belangrijkste info eerst — niet `desktop-first` met `mobile-last` reorder via flex order
- [ ] Geen content `display: none` op mobile zonder reden (SEO + a11y)

## Tooling

```bash
# Chrome DevTools device-toolbar (Cmd+Shift+M)
# Test op: iPhone SE, iPhone 14 Pro, iPad, Galaxy Fold

# Lighthouse mobile preset
npx lighthouse <url> --preset=mobile --view

# BrowserStack of LambdaTest voor real devices

# Visual regression (Playwright):
npx playwright test --project=mobile-chrome
```

## Heuristic-detectie per stack

### Tailwind
Look for `<div class="flex flex-row">` zonder `flex-col md:flex-row` — mobile layout breaks.
Look for fixed widths `w-[800px]` zonder `max-w-full`.
Look for `text-base` zonder `sm:text-lg lg:text-xl` — schaalt niet.

### Next.js Image
Look for `<Image src=... width={1200} height={400}>` zonder `sizes` — geen responsive srcset.

### Modals
Look for `<Dialog>` met `max-w-md` zonder `sm:max-w-md` (mobile zou full-screen of bottom-sheet moeten zijn).

## Output flow
1. **Brief** — bevestig URL + breakpoints + device-prio
2. **Per breakpoint** — screenshot-suggestie + issues lijst
3. **Issues per HIGH/MEDIUM/LOW** — file:line + Tailwind-fix
4. **Top-3 quick wins** — laagste effort, grootste impact

## Combineer met
- `/perf-audit --target mobile` — performance perspectief
- `/a11y-audit` — touch-target a11y overlap
- `/ui-component` — als fix nieuwe responsive-component nodig heeft
