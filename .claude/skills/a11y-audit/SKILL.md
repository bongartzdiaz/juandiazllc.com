---
name: a11y-audit
description: Accessibility audit van een component, page, form of flow tegen WCAG 2.2 AA + Nederlandse webrichtlijnen. Checkt semantiek, ARIA, keyboard nav, kleurcontrast, focus-states, screen-reader compatibility. Output is gerangschikte fix-lijst. Gebruik wanneer Juan vraagt "is dit toegankelijk?", vóór live-zetten van form/landing, of bij audit-rondes.
trigger: /a11y-audit
---

# /a11y-audit

Accessibility audit volgens WCAG 2.2 AA + Nederlandse webrichtlijnen + EN 301 549 (publieke sector).

## Usage

```
/a11y-audit <pad-of-url>
/a11y-audit <pad> --scope <component|page|form|flow>
/a11y-audit <pad> --severity <all|critical|high>
```

## Hard rules

### WCAG 2.2 AA — must-haves

#### Perceivable (1.x)
- [ ] **Alt-text op informatieve images** — `alt=""` voor decorative, beschrijvend voor content
- [ ] **Color contrast** — body text 4.5:1, large text (18pt+) 3:1, UI components 3:1
- [ ] **Niet-tekst-content** — icon-only buttons hebben `aria-label`
- [ ] **Captions/transcripts** voor video/audio
- [ ] **Geen kleur-alleen** voor info — error red ALSO icon ALSO label
- [ ] **Reflow** — content werkt op 320px breedte zonder horizontale scroll
- [ ] **Text-spacing** — tolerant voor 1.5× line-height, 2× paragraph spacing

#### Operable (2.x)
- [ ] **Keyboard accessible** — alles bereikbaar met Tab/Shift+Tab/Enter/Space/arrow
- [ ] **No keyboard trap** — kan altijd weg uit element
- [ ] **Focus order** — logisch (links→rechts, top→bottom)
- [ ] **Focus visible** — `focus-visible:ring` of equivalent
- [ ] **Skip-links** voor pages met veel header-nav (`<a href="#main">Naar inhoud</a>`)
- [ ] **Heading hierarchy** — 1× `<h1>`, geen sprongen (h2→h4 niet mag)
- [ ] **Touch target ≥24×24 CSS px** (WCAG 2.2)
- [ ] **Geen autoplay** met audio
- [ ] **Geen flash** >3× per seconde

#### Understandable (3.x)
- [ ] **Lang-attribute** — `<html lang="nl">`
- [ ] **Form labels** — elk input heeft `<label>`, NIET alleen placeholder
- [ ] **Error identification** — fouten in tekst beschreven, niet alleen rood randje
- [ ] **Error suggestion** — "Vul een geldig e-mailadres in" niet "ongeldig"
- [ ] **Consistent navigation** — zelfde nav op elke page
- [ ] **Input purpose** — `autocomplete="name|email|tel|street-address|postal-code"`

#### Robust (4.x)
- [ ] **Valid HTML** — geen `<button>` in `<button>`, geen `<a>` zonder `href`
- [ ] **ARIA correct** — geen `aria-label` op `<div>` zonder `role`
- [ ] **Status messages** — `role="status"` of `role="alert"` voor dynamic content
- [ ] **Name/role/value** — custom controls hebben role + accessible name + state

## Component-checks

### Buttons
- [ ] `<button>` element (NIET `<div onClick>`)
- [ ] Icon-only: `aria-label="..."`
- [ ] Disabled: `disabled` attribute (NIET alleen `opacity-50`)
- [ ] Loading: `aria-busy="true"`, behoudt focus, knop blijft hetzelfde formaat

### Links
- [ ] `<a href="...">` (geen `onClick` op div)
- [ ] External: `rel="noopener noreferrer"` + visueel cue
- [ ] "Klik hier" / "lees meer" → vervangen door beschrijvende tekst

### Forms (zie ook /ui-form)
- [ ] Elke input heeft `<label htmlFor>` of wordt expliciet door `aria-labelledby` gewezen
- [ ] Required-velden hebben `required` attribute + visueel cue
- [ ] Errors via `aria-describedby` gekoppeld aan input
- [ ] Submit-knop disabled tijdens request — `aria-busy="true"` op form

### Modals/Dialogs
- [ ] `role="dialog"` + `aria-modal="true"`
- [ ] `aria-labelledby` wijst naar titel-id
- [ ] Focus naar dialog bij open, terug naar trigger bij close
- [ ] Focus-trap actief (Tab blijft in dialog)
- [ ] ESC sluit dialog
- [ ] Achtergrond `aria-hidden="true"` of `inert`

### Tabs
- [ ] `role="tablist"`, `role="tab"`, `role="tabpanel"`
- [ ] `aria-selected="true"` op actieve tab
- [ ] Arrow-keys navigeren tussen tabs (LTR: left/right; vertical: up/down)
- [ ] Tab-key gaat NAAR tabpanel, niet volgende tab

### Tables (zie /ui-table)
- [ ] `<th scope="col">` en `<th scope="row">` waar relevant
- [ ] `<caption>` voor data-tables
- [ ] Sort-state via `aria-sort="ascending|descending|none"`

### Toasts/notifications
- [ ] `role="status"` (info) of `role="alert"` (error)
- [ ] `aria-live="polite"` of `"assertive"`
- [ ] Auto-dismiss > 5s of dismiss-knop

### Carousels/sliders
- [ ] Pause-knop als auto-play
- [ ] Pagination-dots zijn buttons met `aria-label="Slide n"`
- [ ] `aria-roledescription="carousel"`

### Loading-states
- [ ] Spinner: `role="status"` + `aria-label="Bezig met laden"`
- [ ] Skeleton: `aria-hidden="true"` op decoratieve placeholders, real `role="status"` ergens

## Bevindingen-format

```markdown
# A11y-audit: <bestand of URL>

## Score per WCAG-laag
- Perceivable: 8/10
- Operable: 6/10  ← actie nodig
- Understandable: 9/10
- Robust: 9/10

## CRITICAL (blokkeert gebruikers)
1. **<file>:<line>** — `<div onClick>` voor button → keyboard niet bereikbaar
   → Fix: vervang door `<button>`. Of voeg `role="button" tabIndex={0}` + keyboard handler.
   WCAG: 2.1.1 Keyboard (A)

## HIGH (significant probleem)
- ...

## MEDIUM
- ...

## LOW (cosmetic / preferred)
- ...

## Wat is goed
- ...

## Tools om handmatig te runnen
- axe DevTools browser extension
- Lighthouse a11y category
- Wave (wave.webaim.org)
- Screen reader test: NVDA (Windows) / VoiceOver (macOS) / TalkBack (Android)
```

## Stack-specifieke patterns

### shadcn/ui
- shadcn-componenten zijn meestal AA-compliant out-of-box
- `<Button asChild>` → vergeet niet `aria-label` op child als icon-only
- `<Dialog>` heeft focus-trap + ESC ingebouwd
- `<Form>` met RHF: errors auto-gekoppeld via `<FormMessage>`

### Tailwind
- `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none` patroon
- `sr-only` class voor screen-reader-only text
- Vermijd `outline-none` zonder vervangende focus-state

### React
- `key`-prop op lijst items (niet array-index)
- Hou `aria-*` props in sync met state
- Custom hooks `useFocusTrap`, `useEscapeKey` waar relevant

## Nederlands-specifiek
- `<html lang="nl">` ALTIJD
- B1-niveau in error-messages
- Nederlandse datum/tijd format (`DD-MM-YYYY`, 24h)
- Address-velden: postcode/huisnummer apart (NL-conventie)

## Output flow
1. **Brief** — bevestig scope, severity-filter
2. **Per WCAG-laag** score + bevindingen
3. **Lijst CRITICAL/HIGH/MEDIUM/LOW** met file:line + WCAG-criterion ID
4. **Wat is goed** — encouragement + voorbeelden
5. **Volgende stap** — top-3 fixes prioriteren

## Combineer met
- `/ui-component` — als fix nieuwe sub-component nodig heeft
- `/copy-check` — voor error-messages en labels (B1 + brand)
- `/test-write` — a11y-tests met axe-core
- `/audit-site` — page-niveau combinatie met perf + SEO
